-- =====================================================================
-- 0016 · Eventos de la ciudad (versión 5, fase 22)
-- Cualquier cuenta publica un evento gratis. Se ve desde que se publica hasta el último día del evento (hora de
-- Guayaquil) y al día siguiente se borra solo (tarea diaria). Se llama city_events para no confundirse con
-- event_limits (0011), que cuenta visitas.
-- Escritura: solo el servidor (service_role) después de revisar sesión, captcha y Zod. La base además exige los
-- límites (3 por semana, inicio hasta 6 meses adelante, máximo 30 días) y el filtro de palabras.
-- =====================================================================

-- ¿Sigue vigente? Hasta el final del día de su fecha de fin, en hora de Guayaquil.
create function public.evento_vigente(fin timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select (fin at time zone 'America/Guayaquil')::date >= (now() at time zone 'America/Guayaquil')::date;
$$;

create table public.city_events (
  id           uuid primary key default gen_random_uuid(),
  city_id      uuid not null references public.cities (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title        text not null check (char_length(title) between 3 and 120),
  kind         text not null check (kind in ('concierto', 'feria', 'deporte', 'cultura', 'gastronomia', 'fiesta', 'curso', 'otro')),
  description  text not null check (char_length(description) between 20 and 3000),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  online       boolean not null default false,
  venue        text check (char_length(venue) <= 120),
  address      text check (char_length(address) <= 200),
  latitude     double precision check (latitude between -5.1 and 1.7),
  longitude    double precision check (longitude between -92.1 and -75.1),
  price        numeric(8, 2) check (price > 0 and price <= 10000),   -- null = gratis
  organizer    text not null check (char_length(organizer) between 2 and 120),
  whatsapp     text check (whatsapp ~ '^5939[0-9]{8}$'),
  website      text check (char_length(website) <= 300 and website ~ '^https://'),
  tickets_url  text check (char_length(tickets_url) <= 300 and tickets_url ~ '^https://'),
  min_age      smallint check (min_age between 1 and 21),
  poster_path  text unique check (poster_path ~ '^eventos/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$'),
  poster_alt   text check (char_length(poster_alt) between 3 and 200),
  status       text not null default 'publicado' check (status in ('publicado', 'oculto')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (ends_at >= starts_at),
  check (ends_at <= starts_at + interval '30 days'),
  check ((latitude is null) = (longitude is null)),
  check (online or venue is not null),
  check ((poster_path is null) = (poster_alt is null)),
  -- El afiche va en la carpeta de quien publica
  check (poster_path is null or split_part(poster_path, '/', 2) = user_id::text)
);
create index city_events_fin_idx on public.city_events (ends_at);
create index city_events_usuario_idx on public.city_events (user_id, created_at);
create trigger set_updated_at before update on public.city_events for each row execute function public.set_updated_at();

alter table public.city_events enable row level security;
-- Todos ven los eventos publicados y vigentes; quien lo publicó ve los suyos; el admin, todos.
create policy "lectura de vigentes" on public.city_events for select
  using (status = 'publicado' and public.evento_vigente(ends_at));
create policy "ve los suyos" on public.city_events for select to authenticated
  using (user_id = (select auth.uid()));
create policy "admin gestiona" on public.city_events for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.city_events from anon, authenticated;
-- Todas las columnas menos quién lo publicó (eso solo lo usa el servidor)
grant select (id, city_id, slug, title, kind, description, starts_at, ends_at, online, venue, address, latitude, longitude,
  price, organizer, whatsapp, website, tickets_url, min_age, poster_path, poster_alt, status, created_at, updated_at)
  on public.city_events to anon, authenticated;
grant update (status), delete on public.city_events to authenticated; -- solo pasa la política del admin

-- Límites (valen aunque lleguen varios a la vez) y fechas razonables
create function public.limite_eventos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtext('eventos' || new.user_id::text));
    if (select count(*) from public.city_events where user_id = new.user_id and created_at > now() - interval '7 days') >= 3 then
      raise exception 'limite_eventos_semana';
    end if;
    if not public.evento_vigente(new.ends_at) then
      raise exception 'evento_vencido';
    end if;
  end if;
  if tg_op = 'INSERT' or new.starts_at is distinct from old.starts_at then
    if new.starts_at > now() + interval '6 months' then
      raise exception 'evento_muy_lejos';
    end if;
  end if;
  -- Quien lo publicó no se cambia
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'evento_dueno';
  end if;
  return new;
end;
$$;
create trigger limite_eventos before insert or update on public.city_events
  for each row execute function public.limite_eventos();

-- Filtro de palabras (0006): textos cortos sin groserías; la descripción además sin enlaces ni teléfonos
-- (para eso están los campos de contacto, página y entradas).
create function public.revisar_textos_evento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.title is distinct from old.title then perform public.revisar_campo('titulo', new.title, false); end if;
  if tg_op = 'INSERT' or new.description is distinct from old.description then perform public.revisar_campo('descripcion', new.description, true); end if;
  if tg_op = 'INSERT' or new.venue is distinct from old.venue then perform public.revisar_campo('lugar', new.venue, false); end if;
  if tg_op = 'INSERT' or new.address is distinct from old.address then perform public.revisar_campo('direccion', new.address, false); end if;
  if tg_op = 'INSERT' or new.organizer is distinct from old.organizer then perform public.revisar_campo('organizador', new.organizer, false); end if;
  if tg_op = 'INSERT' or new.poster_alt is distinct from old.poster_alt then perform public.revisar_campo('afiche', new.poster_alt, true); end if;
  return new;
end;
$$;
create trigger revisar_textos before insert or update on public.city_events
  for each row execute function public.revisar_textos_evento();

-- ---------------------------------------------------------------------
-- Reportes: con 3 de personas distintas el evento se oculta solo hasta que el admin lo revise
-- ---------------------------------------------------------------------
create table public.city_event_reports (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.city_events (id) on delete cascade,
  reporter_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason       text not null check (char_length(reason) between 3 and 500),
  resolved     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (event_id, reporter_id)
);
create index city_event_reports_evento_idx on public.city_event_reports (event_id) where not resolved;
create trigger set_updated_at before update on public.city_event_reports for each row execute function public.set_updated_at();
alter table public.city_event_reports enable row level security;
create policy "reporta" on public.city_event_reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and exists (select 1 from public.city_events e where e.id = event_id and e.status = 'publicado')
  );
create policy "admin gestiona" on public.city_event_reports for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.city_event_reports from anon, authenticated;
grant insert (event_id, reason) on public.city_event_reports to authenticated;
grant select, update (resolved) on public.city_event_reports to authenticated;

create function public.reportes_evento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Máximo 10 reportes de eventos al día por persona
    perform pg_advisory_xact_lock(hashtext('reportes-evento' || new.reporter_id::text));
    if (select count(*) from public.city_event_reports where reporter_id = new.reporter_id and created_at > now() - interval '24 hours') >= 10 then
      raise exception 'Llegaste al límite de reportes por hoy';
    end if;
  end if;
  return new;
end;
$$;
create trigger limite_reportes before insert on public.city_event_reports
  for each row execute function public.reportes_evento();

create function public.ocultar_evento_por_reportes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.city_event_reports where event_id = new.event_id and not resolved) >= 3 then
    update public.city_events set status = 'oculto' where id = new.event_id and status = 'publicado';
  end if;
  return null;
end;
$$;
create trigger ocultar_por_reportes after insert on public.city_event_reports
  for each row execute function public.ocultar_evento_por_reportes();

-- ---------------------------------------------------------------------
-- Borrado diario: quita los eventos vencidos y devuelve sus afiches para que el servidor los borre del bucket
-- (Supabase no deja borrar archivos desde SQL). Solo el servidor la llama.
-- ---------------------------------------------------------------------
create function public.borrar_eventos_vencidos()
returns table (poster_path text)
language sql
security definer
set search_path = ''
as $$
  delete from public.city_events e where not public.evento_vigente(e.ends_at) returning e.poster_path;
$$;
revoke execute on function public.borrar_eventos_vencidos() from public, anon, authenticated;
grant execute on function public.borrar_eventos_vencidos() to service_role;

-- ---------------------------------------------------------------------
-- Afiches: lectura pública; se suben solo con un permiso de un solo uso que da el servidor
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('afiches-eventos', 'afiches-eventos', true, 5242880, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;
create policy "admin lista afiches" on storage.objects for select to authenticated
  using (bucket_id = 'afiches-eventos' and (select public.is_admin()));
create policy "admin borra afiches" on storage.objects for delete to authenticated
  using (bucket_id = 'afiches-eventos' and (select public.is_admin()));
