-- =====================================================================
-- 0017 · Guía útil de la ciudad (versión 5, fase 23)
-- Lugares de referencia que NO son negocios registrados: parques, museos, miradores, talleres, farmacias,
-- hospitales, paradas de Metrovía… Vienen de OpenStreetMap (licencia ODbL) y el admin los revisa antes de mostrarlos.
-- Van en su propia tabla para no mezclarse con las fichas de negocios (no tienen dueño, reseñas ni planes).
-- Sirven para que la guía y Paumi siempre tengan a dónde recomendar.
-- =====================================================================

create table public.city_spots (
  id             uuid primary key default gen_random_uuid(),
  city_id        uuid not null references public.cities (id) on delete cascade,
  osm_type       text not null check (osm_type in ('node', 'way', 'relation')),
  osm_id         bigint not null check (osm_id > 0),
  grupo          text not null check (grupo in ('visitar', 'servicios', 'salud', 'transporte')),
  tipo           text not null check (tipo ~ '^[a-z]+(-[a-z]+)*$' and char_length(tipo) <= 30),
  name           text not null check (char_length(name) between 2 and 120),
  note           text check (char_length(note) <= 300),
  latitude       double precision not null check (latitude between -5.1 and 1.7),
  longitude      double precision not null check (longitude between -92.1 and -75.1),
  address        text check (char_length(address) <= 200),
  phone          text check (char_length(phone) <= 40),
  website        text check (char_length(website) <= 300 and website ~ '^https?://'),
  opening_hours  text check (char_length(opening_hours) <= 300),
  status         text not null default 'pendiente' check (status in ('pendiente', 'publicado', 'descartado')),
  imported_at    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (osm_type, osm_id)
);
create index city_spots_grupo_idx on public.city_spots (city_id, grupo, status);
create trigger set_updated_at before update on public.city_spots for each row execute function public.set_updated_at();

alter table public.city_spots enable row level security;
create policy "lectura de publicados" on public.city_spots for select using (status = 'publicado');
create policy "admin gestiona" on public.city_spots for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.city_spots from anon, authenticated;
grant select on public.city_spots to anon, authenticated;
-- El admin corrige el nombre, agrega una frase y decide; importar lo hace el servidor (service_role)
grant update (name, note, status), delete on public.city_spots to authenticated;

-- Filtro de palabras (0006) también aquí: el nombre sin groserías, la frase sin enlaces ni teléfonos
create function public.revisar_textos_sitio()
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
  return new;
end;
$$;
create trigger revisar_textos before insert or update on public.city_spots
  for each row execute function public.revisar_textos_sitio();

-- "¿Se te dañó algo?": categoría para que los talleres, técnicos y cerrajerías se registren como negocios
insert into public.categories (slug, name, sort_order, is_main)
values ('reparaciones', 'Reparaciones y servicios', 12, false)
on conflict (slug) do nothing;
