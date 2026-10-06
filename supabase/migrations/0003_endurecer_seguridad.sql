-- =====================================================================
-- 0003 · Endurecer la seguridad (revisión del paso 5.4)
-- Idea central: el navegador tiene la clave pública y puede hablarle directo a la base,
-- sin pasar por la página (ni por su captcha ni por sus validaciones). Por eso las reglas
-- importantes tienen que vivir AQUÍ, en la base.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Reseñas: crear y editar solo desde el servidor (después del captcha).
--    Antes, un usuario con sesión podía hacer POST directo a /rest/v1/reviews y saltarse el captcha.
--    Ahora la acción del servidor escribe con la clave de servicio, fijando el autor a mano.
--    Se mantiene: el autor puede borrar la suya; el admin modera (status y owner_reply).
-- ---------------------------------------------------------------------
revoke insert on public.reviews from authenticated;
revoke update (stars, text) on public.reviews from authenticated;
drop policy "crea su resena" on public.reviews;
drop policy "edita su resena" on public.reviews;

-- ---------------------------------------------------------------------
-- 2. Perfiles: en público solo el nombre visible. El rol ya no se puede leer
--    (antes cualquiera podía ver quién es admin y la fecha de alta de cada cuenta).
--    Para saber si alguien es admin se usa la función is_admin().
-- ---------------------------------------------------------------------
revoke select on public.profiles from anon, authenticated;
grant select (id, display_name) on public.profiles to anon, authenticated;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3. Límite de 5 reseñas por día que no se salta borrando y volviendo a crear,
--    y solo sobre lugares publicados.
--    Se cuenta en un registro aparte que nadie puede leer ni borrar desde afuera.
--    El candado por usuario evita que dos envíos al mismo tiempo pasen el límite.
-- ---------------------------------------------------------------------
create table public.review_log (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index review_log_user_idx on public.review_log (user_id, created_at desc);
alter table public.review_log enable row level security; -- sin políticas: nadie la lee desde afuera
revoke all on public.review_log from anon, authenticated;

create or replace function public.limit_reviews_per_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Solo se reseñan lugares publicados (antes lo exigía la regla RLS de inserción, que ya no existe)
  if not exists (select 1 from public.places p where p.id = new.place_id and p.status = 'publicado') then
    raise exception 'Solo se pueden reseñar lugares publicados';
  end if;
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));
  if (
    select count(*) from public.review_log
    where user_id = new.user_id and created_at > now() - interval '24 hours'
  ) >= 5 then
    raise exception 'Llegaste al límite de 5 reseñas por día';
  end if;
  insert into public.review_log (user_id) values (new.user_id);
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Reportes: máximo 10 por usuario cada 24 horas (evita llenar la cola de moderación).
-- ---------------------------------------------------------------------
create function public.limit_reports_per_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('reportes' || new.reporter_id::text));
  if (
    select count(*) from public.review_reports
    where reporter_id = new.reporter_id and created_at > now() - interval '24 hours'
  ) >= 10 then
    raise exception 'Llegaste al límite de reportes por hoy';
  end if;
  return new;
end;
$$;
create trigger limit_reports_per_day
  before insert on public.review_reports
  for each row execute function public.limit_reports_per_day();

-- ---------------------------------------------------------------------
-- 5. Sin caracteres invisibles ni de control en nombres y textos públicos
--    (evita hacerse pasar por otro con letras invisibles o texto invertido).
--    En los textos largos se permiten saltos de línea.
-- ---------------------------------------------------------------------
alter table public.profiles add constraint display_name_sin_invisibles
  check (display_name !~ '[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩﻿]');
alter table public.reviews add constraint text_sin_invisibles
  check (text !~ '[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]');
