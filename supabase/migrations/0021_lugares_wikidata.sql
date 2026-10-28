-- =====================================================================
-- 0021 · Lugares turísticos desde Wikidata (versión 7, fase 30.1; plan en docs/PLAN-V7.md)
-- Los candidatos que vienen de Wikidata (no de OpenStreetMap) van en la misma tabla city_spots, con
-- osm_type = 'wikidata' y osm_id = el número de su Q (Q123 → 123). Así siguen valiendo la clave única, las reglas
-- RLS, el agente revisor y la foto/descripción de 0020 sin tocar nada más. Entran siempre "por revisar".
-- =====================================================================

alter table public.city_spots drop constraint city_spots_osm_type_check;
alter table public.city_spots add constraint city_spots_osm_type_check
  check (osm_type in ('node', 'way', 'relation', 'wikidata'));

-- Un lugar de Wikidata siempre guarda su Q, y es el mismo número que su osm_id
alter table public.city_spots add constraint wikidata_con_su_q
  check (osm_type <> 'wikidata' or (wikidata is not null and wikidata = 'Q' || osm_id::text));
