-- =====================================================================
-- 0023 · Guías turísticos (versión 13, fase 41; plan en docs/PLAN-V13.md)
--   - Categoría nueva "Guías turísticos": el guía se registra como cualquier negocio (su foto, su presentación y su
--     WhatsApp son los de la ficha).
--   - En places, el perfil del guía: idiomas y especialidades (de una lista fija), zonas donde trabaja (texto corto),
--     número de credencial del MINTUR (PRIVADO: el público no lo lee) y fecha de acreditación.
--   - La insignia "Guía acreditado" (accredited_at) la pone solo el admin desde el servidor, después de buscar el
--     número en el catastro turístico del MINTUR. Es distinta de "Verificado" (is_verified).
-- Todo lo escribe el servidor con la clave de servicio (el dueño desde «Mi negocio», el admin desde el panel):
-- no se da permiso de escritura de estas columnas a nadie con la clave pública.
-- =====================================================================

insert into public.categories (slug, name, sort_order, is_main)
values ('guias', 'Guías turísticos', 13, false)
on conflict (slug) do nothing;

alter table public.places
  add column guide_languages   text[] not null default '{}'
    check (cardinality(guide_languages) <= 8
           and guide_languages <@ array['es', 'en', 'fr', 'de', 'pt', 'it', 'zh', 'ja', 'ko', 'ru', 'kichwa']::text[]),
  add column guide_specialties text[] not null default '{}'
    check (cardinality(guide_specialties) <= 6
           and guide_specialties <@ array['historia', 'naturaleza', 'aves', 'gastronomia', 'aventura', 'nocturno', 'fotografia', 'arte', 'compras']::text[]),
  add column guide_zones       text check (char_length(guide_zones) between 2 and 160),
  add column guide_license     text check (guide_license ~ '^[A-Za-z0-9][A-Za-z0-9 ./-]{2,39}$'),
  add column accredited_at     timestamptz,
  -- Sin número de credencial no hay insignia
  add constraint acreditado_con_credencial check (accredited_at is null or guide_license is not null);

-- El público ve el perfil y si está acreditado; el número de credencial NO (solo el servidor y el admin)
grant select (guide_languages, guide_specialties, guide_zones, accredited_at) on public.places to anon, authenticated;

-- Si cambia el número de credencial, la categoría o el dueño de la ficha, la insignia se quita hasta que el admin la
-- vuelva a revisar (la credencial es de una persona y solo vale en la categoría guías; revisión independiente 2026-10-31).
-- Las zonas pasan por el filtro de palabras (0006), como el resto de los textos de la ficha.
create or replace function public.revisar_textos_lugar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.name is distinct from old.name then perform public.revisar_campo('nombre', new.name, false); end if;
  if tg_op = 'INSERT' or new.sector is distinct from old.sector then perform public.revisar_campo('sector', new.sector, false); end if;
  if tg_op = 'INSERT' or new.description is distinct from old.description then perform public.revisar_campo('descripcion', new.description, true); end if;
  if tg_op = 'INSERT' or new.short_fact is distinct from old.short_fact then perform public.revisar_campo('dato', new.short_fact, true); end if;
  if tg_op = 'INSERT' or new.hours is distinct from old.hours then perform public.revisar_campo('horario', new.hours, false); end if;
  if tg_op = 'INSERT' or new.address is distinct from old.address then perform public.revisar_campo('direccion', new.address, false); end if;
  if tg_op = 'INSERT' or new.website is distinct from old.website then perform public.revisar_campo('web', new.website, false); end if;
  if tg_op = 'INSERT' or new.facebook is distinct from old.facebook then perform public.revisar_campo('facebook', new.facebook, false); end if;
  if tg_op = 'INSERT' or new.instagram is distinct from old.instagram then perform public.revisar_campo('instagram', new.instagram, false); end if;
  if tg_op = 'INSERT' or new.tiktok is distinct from old.tiktok then perform public.revisar_campo('tiktok', new.tiktok, false); end if;
  if tg_op = 'INSERT' or new.youtube is distinct from old.youtube then perform public.revisar_campo('youtube', new.youtube, false); end if;
  if tg_op = 'INSERT' or new.guide_zones is distinct from old.guide_zones then perform public.revisar_campo('zonas', new.guide_zones, true); end if;
  if tg_op = 'UPDATE' and new.accredited_at is not distinct from old.accredited_at
     and (new.guide_license is distinct from old.guide_license or new.category_id is distinct from old.category_id
          or new.owner_id is distinct from old.owner_id) then
    new.accredited_at := null;
  end if;
  return new;
end;
$$;
