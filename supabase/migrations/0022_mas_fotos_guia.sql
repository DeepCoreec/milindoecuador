-- =====================================================================
-- 0022 · Más fotos y más información para los lugares de la Guía útil (versión 12, fase 40; plan en docs/PLAN-V12.md)
--   - city_spot_photos: hasta 8 fotos más por lugar (además de la principal de 0020). Pueden ser de Wikimedia Commons
--     (con autor, licencia y enlace) o propias, subidas por el admin (sin licencia ni enlace: son de la guía).
--   - city_spots.description_long: un párrafo de Wikipedia (misma fuente que description).
--   - city_spots.facts: datos rápidos de Wikidata (inauguración, superficie, patrimonio). El servidor los valida.
--   - city_spots.photos_at: cuándo se buscaron más fotos (para no repetir en cada clic).
-- Solo escribe el servidor (clave de servicio, después de requireAdmin). El público lee las fotos de lugares publicados.
-- =====================================================================

create table public.city_spot_photos (
  id           uuid primary key default gen_random_uuid(),
  spot_id      uuid not null references public.city_spots (id) on delete cascade,
  storage_path text not null unique check (storage_path ~ '^guia/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  alt_text     text not null check (char_length(alt_text) between 3 and 160),
  credit       text check (char_length(credit) <= 150),
  license      text check (char_length(license) <= 60),
  source       text check (char_length(source) <= 400 and source ~ '^https://commons\.wikimedia\.org/'),
  sort_order   smallint not null default 0 check (sort_order between 0 and 50),
  created_at   timestamptz not null default now(),
  -- Una foto de Commons siempre con su licencia y su enlace; una propia, sin ninguno de los dos
  constraint licencia_con_fuente check ((license is null) = (source is null))
);
create index city_spot_photos_spot_idx on public.city_spot_photos (spot_id, sort_order);
-- La misma foto de Commons no se repite en un lugar
create unique index city_spot_photos_fuente_unica on public.city_spot_photos (spot_id, source) where source is not null;

alter table public.city_spot_photos enable row level security;
create policy "lectura de publicados" on public.city_spot_photos for select
  using (exists (select 1 from public.city_spots c where c.id = spot_id and c.status = 'publicado'));
revoke all on public.city_spot_photos from anon, authenticated;
grant select on public.city_spot_photos to anon, authenticated;

-- Tope de 8 fotos más por lugar, y textos por el filtro de palabras (0006), como el resto de la guía
create function public.revisar_foto_sitio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and (select count(*) from public.city_spot_photos p where p.spot_id = new.spot_id) >= 8 then
    raise exception 'tope_fotos' using hint = 'Cada lugar tiene como mucho 8 fotos más';
  end if;
  if tg_op = 'INSERT' or new.alt_text is distinct from old.alt_text then perform public.revisar_campo('descripcion', new.alt_text, true); end if;
  if tg_op = 'INSERT' or new.credit is distinct from old.credit then perform public.revisar_campo('autor', new.credit, false); end if;
  return new;
end;
$$;
revoke execute on function public.revisar_foto_sitio() from public, anon, authenticated;
create trigger revisar_foto_sitio before insert or update on public.city_spot_photos
  for each row execute function public.revisar_foto_sitio();

alter table public.city_spots
  add column description_long text check (char_length(description_long) <= 1200),
  add column facts            jsonb check (jsonb_typeof(facts) = 'object' and pg_column_size(facts) <= 1000),
  add column photos_at        timestamptz,
  -- El párrafo también es de Wikipedia: va siempre con su fuente
  add constraint descripcion_larga_con_fuente check (description_long is null or description_source is not null);

grant select (description_long, facts) on public.city_spots to anon, authenticated;

-- El párrafo y los datos rápidos pasan por el mismo filtro que la descripción (0020)
create or replace function public.revisar_textos_sitio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Al volver a importar, un lugar que ya está se salta (on conflict do nothing): no hace falta revisarlo de nuevo
  if tg_op = 'INSERT' and exists (select 1 from public.city_spots c where c.osm_type = new.osm_type and c.osm_id = new.osm_id) then
    return new;
  end if;
  if tg_op = 'INSERT' or new.name is distinct from old.name then perform public.revisar_campo('nombre', new.name, false); end if;
  if tg_op = 'INSERT' or new.note is distinct from old.note then perform public.revisar_campo('descripcion', new.note, true); end if;
  if tg_op = 'INSERT' or new.description is distinct from old.description then perform public.revisar_campo('descripcion', new.description, true); end if;
  if tg_op = 'INSERT' or new.description_long is distinct from old.description_long then perform public.revisar_campo('descripcion', new.description_long, true); end if;
  if tg_op = 'INSERT' or new.facts is distinct from old.facts then perform public.revisar_campo('descripcion', new.facts::text, true); end if;
  if tg_op = 'INSERT' or new.photo_credit is distinct from old.photo_credit then perform public.revisar_campo('autor', new.photo_credit, false); end if;
  return new;
end;
$$;
