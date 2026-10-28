-- =====================================================================
-- 0020 · Foto y descripción para la Guía útil (versión 7, fase 29.1; plan en docs/PLAN-V7.md)
-- La foto sale de Wikimedia Commons y la descripción de Wikipedia en español (gratis, con crédito y licencia).
--   - wikidata / wikipedia: el enlace que trae OpenStreetMap; dice CUÁL es el lugar en Wikimedia (regla 4 del plan).
--   - photo_*: la foto se COPIA a nuestro bucket (guia/<id del lugar>.jpg|png|webp) con su autor, licencia y enlace.
--   - description*: 1–2 frases del resumen de Wikipedia, con el enlace al artículo.
--   - enriched_at: cuándo se buscó (para no volver a buscar lo mismo en cada clic).
-- Solo escribe el servidor (clave de servicio, después de requireAdmin). El público lee foto y descripción de los
-- lugares publicados; el admin no las escribe desde el navegador (solo nombre, frase y estado, como en 0017).
-- =====================================================================

alter table public.city_spots
  add column wikidata           text check (wikidata ~ '^Q[1-9][0-9]{0,11}$'),
  add column wikipedia          text check (char_length(wikipedia) <= 200 and wikipedia ~ '^[a-z]{2,3}:.+'),
  add column photo_path         text check (photo_path ~ '^guia/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  add column photo_credit       text check (char_length(photo_credit) <= 150),
  add column photo_license      text check (char_length(photo_license) <= 60),
  add column photo_source       text check (char_length(photo_source) <= 400 and photo_source ~ '^https://commons\.wikimedia\.org/'),
  add column description        text check (char_length(description) <= 300),
  add column description_source text check (char_length(description_source) <= 400 and description_source ~ '^https://es\.wikipedia\.org/'),
  add column enriched_at        timestamptz,
  -- Una foto siempre con su licencia y su enlace; una descripción siempre con su fuente
  add constraint foto_con_credito check ((photo_path is null) = (photo_license is null) and (photo_path is null) = (photo_source is null)),
  add constraint descripcion_con_fuente check ((description is null) = (description_source is null));

-- El público y las cuentas con sesión leen la foto y la descripción (las filas las sigue filtrando RLS: solo publicados)
grant select (photo_path, photo_credit, photo_license, photo_source, description, description_source)
  on public.city_spots to anon, authenticated;

-- El texto de Wikipedia y el autor de la foto también los escribe cualquiera: pasan por el mismo filtro de palabras
-- que el nombre y la frase (0006/0017). La descripción, además, sin enlaces ni teléfonos (revisión independiente
-- del 2026-10-28, hallazgo 5). Si no pasa, el servidor guarda el lugar sin foto ni descripción.
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
  if tg_op = 'INSERT' or new.photo_credit is distinct from old.photo_credit then perform public.revisar_campo('autor', new.photo_credit, false); end if;
  return new;
end;
$$;
