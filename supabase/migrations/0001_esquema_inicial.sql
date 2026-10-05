-- =====================================================================
-- Mi Lindo Ecuador · 0001 · Esquema inicial
-- 8 tablas, 1 vista, reglas de seguridad (RLS) y bucket de fotos.
-- Regla: ninguna tabla queda sin RLS; sin una política explícita, nadie lee ni escribe.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.user_role as enum ('usuario', 'admin');
create type public.place_status as enum ('borrador', 'publicado', 'oculto');
create type public.review_status as enum ('visible', 'oculta');
create type public.request_status as enum ('pendiente', 'aprobada', 'rechazada');

-- ---------------------------------------------------------------------
-- Funciones de apoyo
-- ---------------------------------------------------------------------

-- Mantiene updated_at al día en cada cambio.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

create table public.cities (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (char_length(name) between 2 and 60),
  active      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (char_length(name) between 2 and 60),
  sort_order  smallint not null default 0,
  is_main     boolean not null default false,  -- principal: visible en la barra; el resto, en "Todas las categorías"
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 2 and 40),
  role          public.user_role not null default 'usuario',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.places (
  id              uuid primary key default gen_random_uuid(),
  city_id         uuid not null references public.cities (id),
  category_id     uuid not null references public.categories (id),
  slug            text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name            text not null check (char_length(name) between 2 and 120),
  sector          text not null check (char_length(sector) between 2 and 80),
  description     text not null check (char_length(description) between 20 and 2000),
  short_fact      text check (char_length(short_fact) <= 80),
  hours           text check (char_length(hours) <= 120),
  price_level     smallint check (price_level between 1 and 3),
  whatsapp        text check (whatsapp ~ '^593[0-9]{9}$'),
  address         text check (char_length(address) <= 200),
  status          public.place_status not null default 'borrador',
  is_featured     boolean not null default false,
  featured_until  timestamptz,
  is_verified     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (city_id, slug)
);
create index places_listing_idx on public.places (city_id, category_id, status);

create table public.place_photos (
  id            uuid primary key default gen_random_uuid(),
  place_id      uuid not null references public.places (id) on delete cascade,
  storage_path  text not null,
  alt_text      text not null check (char_length(alt_text) between 3 and 160),
  sort_order    smallint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index place_photos_place_idx on public.place_photos (place_id, sort_order);

create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  place_id     uuid not null references public.places (id) on delete cascade,
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  stars        smallint not null check (stars between 1 and 5),
  text         text not null check (char_length(text) between 10 and 1000),
  status       public.review_status not null default 'visible',
  owner_reply  text check (char_length(owner_reply) <= 1000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (place_id, user_id)
);
create index reviews_place_idx on public.reviews (place_id, status, created_at desc);
create index reviews_user_idx on public.reviews (user_id, created_at desc);

create table public.review_reports (
  id           uuid primary key default gen_random_uuid(),
  review_id    uuid not null references public.reviews (id) on delete cascade,
  reporter_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason       text not null check (char_length(reason) between 3 and 500),
  resolved     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (review_id, reporter_id)
);

create table public.business_requests (
  id             uuid primary key default gen_random_uuid(),
  business_name  text not null check (char_length(business_name) between 2 and 120),
  category_id    uuid not null references public.categories (id),
  city_id        uuid not null references public.cities (id),
  sector         text check (char_length(sector) <= 80),
  contact_name   text not null check (char_length(contact_name) between 2 and 80),
  whatsapp       text not null check (whatsapp ~ '^593[0-9]{9}$'),
  description    text check (char_length(description) <= 1000),
  status         public.request_status not null default 'pendiente',
  admin_notes    text check (char_length(admin_notes) <= 1000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- updated_at automático en todas las tablas
create trigger set_updated_at before update on public.cities            for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.categories        for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.profiles          for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.places            for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.place_photos      for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.reviews           for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.review_reports    for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.business_requests for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Funciones de seguridad
-- ---------------------------------------------------------------------

-- ¿El usuario de esta petición es admin? security definer para poder leer profiles sin RLS
-- y evitar recursión en las políticas de profiles.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Crea el perfil automáticamente cuando alguien se registra.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  nombre text;
begin
  nombre := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(new.email, '@', 1)
  );
  nombre := left(nombre, 40);
  if nombre is null or char_length(nombre) < 2 then
    nombre := 'Usuario';
  end if;
  insert into public.profiles (id, display_name) values (new.id, nombre);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nadie cambia su propio rol, aunque tuviera permiso de columna por error.
create function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and current_user in ('anon', 'authenticated')
     and not public.is_admin() then
    raise exception 'No puedes cambiar el rol';
  end if;
  return new;
end;
$$;

create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Límite anti-spam: máximo 5 reseñas por usuario cada 24 horas.
create function public.limit_reviews_per_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.reviews
    where user_id = new.user_id and created_at > now() - interval '24 hours'
  ) >= 5 then
    raise exception 'Llegaste al límite de 5 reseñas por día';
  end if;
  return new;
end;
$$;

create trigger limit_reviews_per_day
  before insert on public.reviews
  for each row execute function public.limit_reviews_per_day();

-- Un usuario normal no puede cambiar el estado de su reseña ni la respuesta del negocio.
create function public.protect_review_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if new.status is distinct from old.status
       or new.owner_reply is distinct from old.owner_reply
       or new.user_id is distinct from old.user_id
       or new.place_id is distinct from old.place_id then
      raise exception 'Solo puedes cambiar las estrellas y el texto de tu reseña';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_review_fields
  before update on public.reviews
  for each row execute function public.protect_review_fields();

-- ---------------------------------------------------------------------
-- Vista de calificaciones (respeta RLS de quien consulta)
-- ---------------------------------------------------------------------
create view public.place_ratings
with (security_invoker = true)
as
select
  place_id,
  round(avg(stars)::numeric, 1) as average_stars,
  count(*)::int                 as review_count
from public.reviews
where status = 'visible'
group by place_id;

-- ---------------------------------------------------------------------
-- Permisos base: se quita todo y se da solo lo necesario.
-- RLS decide además QUÉ filas.
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

grant select on public.cities, public.categories, public.places, public.place_photos,
                public.profiles, public.reviews, public.place_ratings
  to anon, authenticated;

-- Escrituras de usuarios con sesión
grant update (display_name) on public.profiles to authenticated;
grant insert (place_id, stars, text) on public.reviews to authenticated;
grant update (stars, text) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;
grant insert (review_id, reason) on public.review_reports to authenticated;

-- Escrituras de admin (RLS limita a quienes tienen rol admin)
grant insert, update, delete on public.cities, public.categories, public.places, public.place_photos
  to authenticated;
grant update (status, owner_reply) on public.reviews to authenticated;
grant select, update on public.review_reports, public.business_requests to authenticated;
grant update (role) on public.profiles to authenticated;

-- business_requests: el navegador no puede insertar. Solo el servidor (service_role) después del captcha.

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.cities            enable row level security;
alter table public.categories        enable row level security;
alter table public.profiles          enable row level security;
alter table public.places            enable row level security;
alter table public.place_photos      enable row level security;
alter table public.reviews           enable row level security;
alter table public.review_reports    enable row level security;
alter table public.business_requests enable row level security;

-- cities / categories: lectura pública, escritura admin
create policy "lectura publica" on public.cities for select using (true);
create policy "admin escribe" on public.cities for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "lectura publica" on public.categories for select using (true);
create policy "admin escribe" on public.categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- profiles: nombre visible para todos; cada uno edita el suyo; admin todos
create policy "lectura publica" on public.profiles for select using (true);
create policy "edita su perfil" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "admin edita perfiles" on public.profiles for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- places: público solo publicados; admin todo
create policy "lectura de publicados" on public.places for select
  using (status = 'publicado' or (select public.is_admin()));
create policy "admin escribe" on public.places for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- place_photos: público solo de lugares publicados; admin todo
create policy "lectura de publicados" on public.place_photos for select
  using (
    (select public.is_admin())
    or exists (select 1 from public.places p where p.id = place_id and p.status = 'publicado')
  );
create policy "admin escribe" on public.place_photos for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- reviews
create policy "lectura de visibles" on public.reviews for select
  using (
    (status = 'visible' and exists (select 1 from public.places p where p.id = place_id and p.status = 'publicado'))
    or user_id = (select auth.uid())
    or (select public.is_admin())
  );
create policy "crea su resena" on public.reviews for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.places p where p.id = place_id and p.status = 'publicado')
  );
create policy "edita su resena" on public.reviews for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "borra su resena" on public.reviews for delete to authenticated
  using (user_id = (select auth.uid()));
create policy "admin modera" on public.reviews for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- review_reports: cualquiera con sesión reporta; solo admin lee y resuelve
create policy "reporta" on public.review_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
create policy "admin gestiona" on public.review_reports for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- business_requests: solo admin lee y actualiza (las inserta el servidor con service_role)
create policy "admin gestiona" on public.business_requests for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Storage: bucket de fotos (lectura pública, escritura solo admin)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-lugares', 'fotos-lugares', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

-- La lectura pública va por la URL pública del bucket; esta política es para el panel
-- (listar archivos y que la subida pueda devolver el archivo creado).
create policy "admin lista fotos" on storage.objects for select to authenticated
  using (bucket_id = 'fotos-lugares' and (select public.is_admin()));
create policy "admin sube fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-lugares' and (select public.is_admin()));
create policy "admin cambia fotos" on storage.objects for update to authenticated
  using (bucket_id = 'fotos-lugares' and (select public.is_admin()))
  with check (bucket_id = 'fotos-lugares' and (select public.is_admin()));
create policy "admin borra fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos-lugares' and (select public.is_admin()));

-- ---------------------------------------------------------------------
-- Datos de referencia
-- ---------------------------------------------------------------------
insert into public.cities (slug, name, active) values
  ('guayaquil', 'Guayaquil', true),
  ('quito', 'Quito', false),
  ('cuenca', 'Cuenca', false),
  ('manta', 'Manta', false);

insert into public.categories (slug, name, sort_order, is_main) values
  ('restaurantes', 'Restaurantes', 1, true),
  ('hoteles', 'Hoteles', 2, true),
  ('turismo', 'Lugares turísticos', 3, true),
  ('ejercicio', 'Dónde hacer ejercicio', 4, true),
  ('paseos', 'Dónde pasear', 5, true),
  ('cafes', 'Cafés y heladerías', 6, false),
  ('vida-nocturna', 'Vida nocturna', 7, false),
  ('museos', 'Museos y cultura', 8, false),
  ('compras', 'Compras y mercados', 9, false),
  ('ninos', 'Para niños', 10, false),
  ('naturaleza', 'Naturaleza y aventura', 11, false);

-- ---------------------------------------------------------------------
-- Primer administrador (se ejecuta A MANO en el editor SQL de Supabase,
-- después de registrarte en la página con tu correo):
--
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'TU_CORREO@ejemplo.com');
-- ---------------------------------------------------------------------
