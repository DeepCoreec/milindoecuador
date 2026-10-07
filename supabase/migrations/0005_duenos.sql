-- =====================================================================
-- 0005 · Cuentas de dueño (versión 2, paso 8.1)
-- Cada lugar puede tener una cuenta dueña. La solicitud de negocio guarda quién la hizo;
-- al aprobarla, esa cuenta queda como dueña de la ficha (y solo de esa).
--
-- Cómo escribe un dueño: SOLO desde el servidor (acciones de la página), con la clave de servicio,
-- después de comprobar la sesión, que es dueño de ESE lugar, Zod y los límites diarios.
-- Por eso aquí NO se da ningún permiso nuevo al navegador: con la clave pública nadie puede
-- cambiar una ficha, ni la suya, saltándose esas comprobaciones (misma idea que las reseñas en 0003).
-- =====================================================================

alter table public.places
  add column owner_id uuid references public.profiles (id) on delete set null;
create index places_owner_idx on public.places (owner_id) where owner_id is not null;

alter table public.business_requests
  add column user_id uuid references public.profiles (id) on delete set null;
create index business_requests_user_idx on public.business_requests (user_id) where user_id is not null;

-- El dueño no se puede leer en público (no se revela qué cuenta maneja cada negocio).
-- La lectura pública de places pasa a ser por columnas: todas menos owner_id.
revoke select on public.places from anon, authenticated;
grant select (
  id, city_id, category_id, slug, name, sector, description, short_fact, hours, price_level, whatsapp, address,
  status, is_featured, featured_until, is_verified, created_at, updated_at, latitude, longitude
) on public.places to anon, authenticated;

-- Nadie con la clave pública cambia el dueño (ni el admin desde el navegador: se hace en el servidor).
revoke insert, update on public.places from authenticated;
grant insert (
  city_id, category_id, slug, name, sector, description, short_fact, hours, price_level, whatsapp, address,
  status, is_featured, featured_until, is_verified, latitude, longitude
) on public.places to authenticated;
grant update (
  category_id, name, sector, description, short_fact, hours, price_level, whatsapp, address,
  status, is_featured, featured_until, is_verified, latitude, longitude
) on public.places to authenticated;
