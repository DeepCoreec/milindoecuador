-- =====================================================================
-- 0018 · Arreglos de la auditoría de Supabase del 2026-10-27 (docs/AUDITORIA-2026-10-27.md)
--   C3. Eventos: para ocultarse solos, solo cuentan reportes de cuentas con 7 días o más
--       (antes, 3 cuentas recién creadas ocultaban cualquier evento; los lugares y videos ya tenían esta regla, 0008).
--   C2. Reseñas: una reseña que el admin ocultó ya no se puede volver a publicar borrándola y enviándola de nuevo.
--       La base recuerda "esta cuenta tuvo una reseña oculta en este lugar" y la reseña nueva entra oculta,
--       hasta que el admin la muestre (misma idea que places.video_review para los videos, 0009).
--   I2. Roles: nadie cambia un rol desde el navegador, ni siquiera el admin. Los admins se asignan solo
--       a mano en el editor SQL de Supabase (si roban la sesión del admin, no pueden crear otros admins).
-- =====================================================================

-- ---------------------------------------------------------------------
-- C3. Eventos: reportes de cuentas con 7 días o más
-- ---------------------------------------------------------------------
create or replace function public.ocultar_evento_por_reportes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.city_event_reports r
    join public.profiles p on p.id = r.reporter_id
    where r.event_id = new.event_id and not r.resolved and p.created_at < now() - interval '7 days'
  ) >= 3 then
    update public.city_events set status = 'oculto' where id = new.event_id and status = 'publicado';
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- C2. Reseñas ocultas que no vuelven solas
-- ---------------------------------------------------------------------
-- Quién tuvo una reseña oculta en qué lugar. Nadie la lee ni la escribe desde afuera: solo los disparadores.
create table public.review_holds (
  place_id    uuid not null references public.places (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (place_id, user_id)
);
alter table public.review_holds enable row level security; -- sin políticas: nadie la lee desde afuera
revoke all on public.review_holds from anon, authenticated;

-- Al ocultar una reseña se anota; al volver a mostrarla, se quita la anotación.
create function public.recordar_resena_oculta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'oculta' and old.status is distinct from 'oculta' then
    insert into public.review_holds (place_id, user_id) values (new.place_id, new.user_id)
    on conflict do nothing;
  elsif new.status = 'visible' and old.status = 'oculta' then
    delete from public.review_holds where place_id = new.place_id and user_id = new.user_id;
  end if;
  return null;
end;
$$;
create trigger recordar_resena_oculta after update of status on public.reviews
  for each row execute function public.recordar_resena_oculta();

-- Una reseña nueva de quien tuvo una oculta en ese lugar entra oculta (el admin la ve en la ficha y decide).
create function public.resena_en_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.review_holds where place_id = new.place_id and user_id = new.user_id) then
    new.status := 'oculta';
  end if;
  return new;
end;
$$;
create trigger resena_en_revision before insert on public.reviews
  for each row execute function public.resena_en_revision();

-- Las reseñas que YA están ocultas hoy también cuentan
insert into public.review_holds (place_id, user_id)
select place_id, user_id from public.reviews where status = 'oculta'
on conflict do nothing;

-- ---------------------------------------------------------------------
-- I2. El rol no se cambia desde el navegador (ni el admin)
-- ---------------------------------------------------------------------
revoke update (role) on public.profiles from authenticated;
