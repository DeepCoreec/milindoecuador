-- =====================================================================
-- 0010 · Buscador dentro de la base (versión 3, paso 12.2)
-- Antes la página traía TODOS los lugares de la ciudad y filtraba en el servidor (bien hasta unos cientos).
-- Ahora la base busca y devuelve solo los que coinciden, en orden. Mismas reglas que antes:
--   - sin importar mayúsculas ni tildes ("malecon" = "Malecón");
--   - cada palabra tiene que estar en el nombre, el sector, la categoría o el dato corto;
--   - primero los que tienen las palabras en el nombre.
-- Y además tolera errores de escritura en palabras de 4 letras o más ("encebolado", "malecom", "cebicheria"),
-- con trigramas (pg_trgm, que Supabase ya trae).
-- =====================================================================

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
-- En Supabase ya vienen así; se repite por si la base es nueva (no da más permisos que esos)
grant usage on schema extensions to anon, authenticated, service_role;

-- Minúsculas y sin tildes (la ñ queda como n, igual que en la página)
create function public.texto_busqueda(t text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(lower(coalesce(t, '')), 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc');
$$;

-- Índice para que buscar siga siendo rápido con muchos lugares
create index places_busqueda_idx on public.places
  using gin (public.texto_busqueda(name || ' ' || sector || ' ' || coalesce(short_fact, '')) extensions.gin_trgm_ops);

-- Devuelve los lugares publicados de la ciudad que coinciden, ya ordenados (máximo 60).
-- Corre con los permisos de quien busca (security invoker): las reglas RLS siguen escondiendo borradores y ocultos.
create function public.buscar_lugares(q text, ciudad text)
returns table (id uuid)
language sql
stable
set search_path = ''
as $$
  with palabras as (
    select distinct w
    from unnest(string_to_array(trim(regexp_replace(public.texto_busqueda(left(q, 80)), '\s+', ' ', 'g')), ' ')) w
    where w <> ''
    limit 8
  ),
  candidatos as (
    select p.id, p.name,
           public.texto_busqueda(p.name) as nombre,
           public.texto_busqueda(p.name || ' ' || p.sector || ' ' || c.name || ' ' || coalesce(p.short_fact, '')) as todo
    from public.places p
    join public.categories c on c.id = p.category_id
    join public.cities ci on ci.id = p.city_id
    where ci.slug = ciudad and p.status = 'publicado'
  )
  select k.id
  from candidatos k
  where exists (select 1 from palabras)
    and not exists (
      select 1 from palabras
      where strpos(k.todo, w) = 0
        and (char_length(w) < 4 or extensions.word_similarity(w, k.todo) < 0.5)
    )
  order by
    (select count(*) from palabras where strpos(k.nombre, w) > 0 or (char_length(w) >= 4 and extensions.word_similarity(w, k.nombre) >= 0.5)) desc,
    (select count(*) from palabras where strpos(k.todo, w) > 0) desc,
    k.name
  limit 60;
$$;
revoke execute on function public.buscar_lugares(text, text) from public;
grant execute on function public.buscar_lugares(text, text) to anon, authenticated, service_role;
