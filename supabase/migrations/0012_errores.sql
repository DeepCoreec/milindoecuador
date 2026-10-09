-- =====================================================================
-- 0012 · Errores de la página en producción (versión 3, paso 13.5)
-- Cuando algo falla en el servidor (una página, una acción, una ruta), se anota aquí para que el admin lo vea
-- en el panel ("Errores") sin depender de servicios de pago. Los repetidos se agrupan (mismo lugar y mensaje).
-- No se guarda nada de la persona: ni IP, ni cuenta, ni cabeceras, ni lo que buscó (solo la plantilla de la ruta).
-- =====================================================================

create table public.error_log (
  id          bigint generated always as identity primary key,
  route       text not null check (char_length(route) between 1 and 200),
  kind        text not null check (char_length(kind) <= 40),
  message     text not null check (char_length(message) <= 500),
  digest      text check (char_length(digest) <= 64),
  times       integer not null default 1 check (times > 0),
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  resolved    boolean not null default false
);
create index error_log_pendientes_idx on public.error_log (resolved, last_seen desc);
alter table public.error_log enable row level security;
create policy "admin gestiona" on public.error_log for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.error_log from anon, authenticated;
grant select, update (resolved) on public.error_log to authenticated;

-- Anota un error (solo el servidor). Si ya hay uno igual sin resolver de las últimas 24 horas, suma 1.
create function public.anotar_error(ruta text, tipo text, mensaje text, codigo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r text := left(coalesce(nullif(ruta, ''), '?'), 200);
  m text := left(coalesce(nullif(mensaje, ''), 'Error sin mensaje'), 500);
begin
  perform pg_advisory_xact_lock(hashtext('error' || r || m));
  update public.error_log set times = times + 1, last_seen = now(), digest = coalesce(left(codigo, 64), digest)
  where route = r and message = m and not resolved and last_seen > now() - interval '24 hours';
  -- Tope: como mucho 200 errores distintos nuevos por hora (si algo se rompe en cadena, no se llena la base)
  if not found and (select count(*) from public.error_log where first_seen > now() - interval '1 hour') < 200 then
    insert into public.error_log (route, kind, message, digest) values (r, left(coalesce(tipo, '?'), 40), m, left(codigo, 64));
  end if;
  -- Se guardan 30 días
  if random() < 0.02 then
    delete from public.error_log where last_seen < now() - interval '30 days';
  end if;
end;
$$;
revoke execute on function public.anotar_error(text, text, text, text) from public, anon, authenticated;
grant execute on function public.anotar_error(text, text, text, text) to service_role;
