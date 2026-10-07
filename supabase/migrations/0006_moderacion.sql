-- =====================================================================
-- 0006 · Moderación automática (versión 2, fase 9)
-- Los dueños publican al instante; la base revisa los textos ANTES de guardarlos:
--   1. palabras prohibidas (lista que el admin amplía desde el panel);
--   2. enlaces y números de teléfono dentro de descripciones, reseñas y respuestas (spam y estafas).
-- Lo revisa la base (no solo la página) para que nadie se lo salte escribiendo directo.
-- Además: registro de cambios de los dueños, reportes de lugares (3 reportes = se oculta solo)
-- y máximo 15 fotos por lugar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Normalizar texto para comparar: minúsculas, sin tildes, "m1erd4" → "mierda", signos como espacios
--    y letras repetidas juntas ("mierdaaa" → "mierda"). Se compara por palabras enteras, para no bloquear
--    "computadora" por contener otra palabra. Trucos como "m.i.e.r.d.a" no se detectan: para eso están los reportes.
-- ---------------------------------------------------------------------
create function public.normalizar_texto(t text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(regexp_replace(
    regexp_replace(
      regexp_replace(
        translate(lower(coalesce(t, '')), 'áàäâéèëêíìïîóòöôúùüûñ0134@$', 'aaaaeeeeiiiioooouuuunoieaas'),
        '[^a-z]+', ' ', 'g'),
      '([a-z])\1+', '\1', 'g'),
    ' +', ' ', 'g'));
$$;

-- ---------------------------------------------------------------------
-- 2. Lista de palabras prohibidas (se guarda normalizada). Solo el admin la ve y la cambia.
-- ---------------------------------------------------------------------
create table public.banned_words (
  word        text primary key check (word ~ '^[a-z]+( [a-z]+)*$' and char_length(word) between 2 and 60),
  created_at  timestamptz not null default now()
);
alter table public.banned_words enable row level security;
create policy "admin gestiona" on public.banned_words for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.banned_words from anon, authenticated;
grant select, insert, delete on public.banned_words to authenticated;

create function public.normalizar_palabra()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.word := public.normalizar_texto(new.word);
  return new;
end;
$$;
create trigger normalizar_palabra before insert or update on public.banned_words
  for each row execute function public.normalizar_palabra();

-- Lista inicial (insultos y contenido sexual comunes en Ecuador). El admin la amplía en el panel.
insert into public.banned_words (word) values
  ('mierda'), ('puta'), ('putas'), ('puto'), ('putos'), ('hijueputa'), ('hijo de puta'), ('hijos de puta'), ('puta madre'),
  ('verga'), ('vergas'), ('mamaverga'), ('chucha tu madre'), ('chuchatumadre'), ('malparido'), ('malparida'), ('gonorrea'),
  ('cabron'), ('cabrona'), ('pendejo'), ('pendeja'), ('pendejos'), ('maricon'), ('maricones'), ('marica'), ('huevon'), ('huevona'),
  ('guevon'), ('cojudo'), ('cojuda'), ('cojudos'), ('culero'), ('zorra'), ('idiota'), ('idiotas'), ('imbecil'), ('imbeciles'),
  ('estupido'), ('estupida'), ('porno'), ('pornografia'), ('prostituta'), ('prostitutas'), ('escort'), ('escorts')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 3. ¿Qué tiene de malo este texto? null = nada; si no, 'palabra', 'enlace' o 'telefono'.
--    `sin_contacto`: además prohíbe enlaces y teléfonos (para descripciones, reseñas y respuestas;
--    el WhatsApp del negocio tiene su propio campo).
-- ---------------------------------------------------------------------
create function public.motivo_no_permitido(t text, sin_contacto boolean default false)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  n text;
begin
  if t is null or t = '' then
    return null;
  end if;
  n := ' ' || public.normalizar_texto(t) || ' ';
  if exists (select 1 from public.banned_words b where position(' ' || b.word || ' ' in n) > 0) then
    return 'palabra';
  end if;
  if sin_contacto then
    if lower(t) ~ '(https?://|www\.|\m[a-z0-9-]+\.(com|ec|net|org|info|xyz|ly|me|io|co|link|site|online|shop|store|app)\M)' then
      return 'enlace';
    end if;
    if t ~ '(\+?[0-9][ .-]?){9,}' then
      return 'telefono';
    end if;
  end if;
  return null;
end;
$$;
revoke execute on function public.motivo_no_permitido(text, boolean) from public;
grant execute on function public.motivo_no_permitido(text, boolean) to authenticated, service_role;

-- Revisa un campo y, si no pasa, corta el guardado con un mensaje que el servidor traduce:
-- "texto_no_permitido:<campo>:<motivo>"
create function public.revisar_campo(campo text, valor text, sin_contacto boolean)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  motivo text := public.motivo_no_permitido(valor, sin_contacto);
begin
  if motivo is not null then
    raise exception 'texto_no_permitido:%:%', campo, motivo;
  end if;
end;
$$;

-- Fichas: solo se revisan los campos que cambian (una ficha vieja no bloquea otros cambios).
create function public.revisar_textos_lugar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.name is distinct from old.name then perform public.revisar_campo('nombre', new.name, false); end if;
  if tg_op = 'INSERT' or new.sector is distinct from old.sector then perform public.revisar_campo('sector', new.sector, false); end if;
  if tg_op = 'INSERT' or new.description is distinct from old.description then perform public.revisar_campo('descripcion', new.description, true); end if;
  if tg_op = 'INSERT' or new.short_fact is distinct from old.short_fact then perform public.revisar_campo('dato', new.short_fact, true); end if;
  if tg_op = 'INSERT' or new.hours is distinct from old.hours then perform public.revisar_campo('horario', new.hours, false); end if;
  if tg_op = 'INSERT' or new.address is distinct from old.address then perform public.revisar_campo('direccion', new.address, false); end if;
  return new;
end;
$$;
create trigger revisar_textos before insert or update on public.places
  for each row execute function public.revisar_textos_lugar();

create function public.revisar_textos_resena()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.text is distinct from old.text then perform public.revisar_campo('resena', new.text, true); end if;
  if tg_op = 'INSERT' or new.owner_reply is distinct from old.owner_reply then perform public.revisar_campo('respuesta', new.owner_reply, true); end if;
  return new;
end;
$$;
create trigger revisar_textos before insert or update on public.reviews
  for each row execute function public.revisar_textos_resena();

create function public.revisar_textos_solicitud()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.revisar_campo('negocio', new.business_name, false);
  perform public.revisar_campo('sector', new.sector, false);
  perform public.revisar_campo('contacto', new.contact_name, false);
  perform public.revisar_campo('descripcion', new.description, true);
  return new;
end;
$$;
create trigger revisar_textos before insert on public.business_requests
  for each row execute function public.revisar_textos_solicitud();

create function public.revisar_nombre_perfil()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.display_name is distinct from old.display_name then perform public.revisar_campo('nombre', new.display_name, true); end if;
  return new;
end;
$$;
create trigger revisar_nombre before update on public.profiles
  for each row execute function public.revisar_nombre_perfil();

-- ---------------------------------------------------------------------
-- 4. Máximo 15 fotos por lugar.
-- ---------------------------------------------------------------------
create function public.limite_fotos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('fotos' || new.place_id::text));
  if (select count(*) from public.place_photos where place_id = new.place_id) >= 15 then
    raise exception 'limite_fotos';
  end if;
  return new;
end;
$$;
create trigger limite_fotos before insert on public.place_photos
  for each row execute function public.limite_fotos();

-- ---------------------------------------------------------------------
-- 5. Registro de cambios de los dueños: el admin revisa "Cambios recientes" cuando quiere,
--    y el servidor cuenta aquí los límites diarios. Solo escribe el servidor.
-- ---------------------------------------------------------------------
create table public.place_changes (
  id          bigint generated always as identity primary key,
  place_id    uuid not null references public.places (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete set null,
  kind        text not null check (kind in ('ficha', 'estado', 'foto-nueva', 'foto-borrada', 'foto-orden', 'respuesta', 'oculta-por-reportes')),
  detail      text check (char_length(detail) <= 300),
  reviewed    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index place_changes_fecha_idx on public.place_changes (created_at desc);
create index place_changes_usuario_idx on public.place_changes (user_id, kind, created_at desc);
alter table public.place_changes enable row level security;
create policy "admin gestiona" on public.place_changes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.place_changes from anon, authenticated;
grant select, update (reviewed) on public.place_changes to authenticated;

-- ---------------------------------------------------------------------
-- 6. Reportes de lugares. Con 3 reportes sin resolver de personas distintas, la ficha se oculta sola
--    hasta que el admin la revise.
-- ---------------------------------------------------------------------
create table public.place_reports (
  id           uuid primary key default gen_random_uuid(),
  place_id     uuid not null references public.places (id) on delete cascade,
  reporter_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason       text not null check (char_length(reason) between 3 and 500),
  resolved     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (place_id, reporter_id)
);
create index place_reports_lugar_idx on public.place_reports (place_id) where not resolved;
create trigger set_updated_at before update on public.place_reports for each row execute function public.set_updated_at();
alter table public.place_reports enable row level security;
create policy "reporta" on public.place_reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and exists (select 1 from public.places p where p.id = place_id and p.status = 'publicado')
  );
create policy "admin gestiona" on public.place_reports for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.place_reports from anon, authenticated;
grant insert (place_id, reason) on public.place_reports to authenticated;
grant select, update (resolved) on public.place_reports to authenticated;

create function public.limit_place_reports_per_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('reportes-lugar' || new.reporter_id::text));
  if (
    select count(*) from public.place_reports
    where reporter_id = new.reporter_id and created_at > now() - interval '24 hours'
  ) >= 10 then
    raise exception 'Llegaste al límite de reportes por hoy';
  end if;
  return new;
end;
$$;
create trigger limit_place_reports_per_day before insert on public.place_reports
  for each row execute function public.limit_place_reports_per_day();

create function public.ocultar_por_reportes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.place_reports where place_id = new.place_id and not resolved) >= 3
     and exists (select 1 from public.places where id = new.place_id and status = 'publicado') then
    update public.places set status = 'oculto' where id = new.place_id;
    insert into public.place_changes (place_id, kind, detail)
    values (new.place_id, 'oculta-por-reportes', 'Se ocultó sola al llegar a 3 reportes');
  end if;
  return null;
end;
$$;
create trigger ocultar_por_reportes after insert on public.place_reports
  for each row execute function public.ocultar_por_reportes();
