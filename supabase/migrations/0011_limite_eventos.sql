-- =====================================================================
-- 0011 · Límite en el contador de visitas (versión 3, paso 13.4)
-- Las estadísticas del dueño (0007) se podían inflar mandando el mismo aviso muchas veces.
-- Ahora cada "huella" (un código cifrado que sale de la conexión + el día; NO se guarda la IP) cuenta
-- como máximo 20 veces por día el mismo tipo de evento de un mismo lugar, y 1000 eventos por día en total.
-- Son generosos a propósito: en Ecuador muchas personas comparten la misma IP del operador móvil.
-- =====================================================================

create table public.event_limits (
  fingerprint  text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  day          date not null default ((now() at time zone 'America/Guayaquil')::date),
  place_id     uuid not null,
  kind         text not null check (kind in ('views', 'whatsapp', 'route', 'video')),
  n            integer not null default 1 check (n > 0),
  primary key (fingerprint, day, place_id, kind)
);
create index event_limits_dia_idx on public.event_limits (day);
alter table public.event_limits enable row level security;
-- Nadie la lee ni la escribe desde el navegador (sin políticas ni permisos); solo la función de abajo.
revoke all on public.event_limits from anon, authenticated;

-- Cuenta el evento solo si esa huella no pasó los límites del día. Devuelve true si contó.
create function public.registrar_evento(huella text, lugar uuid, tipo text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  hoy date := (now() at time zone 'America/Guayaquil')::date;
  veces integer;
begin
  if huella !~ '^[0-9a-f]{64}$' or tipo not in ('views', 'whatsapp', 'route', 'video') then
    raise exception 'evento inválido';
  end if;
  if not exists (select 1 from public.places where id = lugar and status = 'publicado') then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtext('evento' || huella));
  if (select coalesce(sum(n), 0) from public.event_limits where fingerprint = huella and day = hoy) >= 1000 then
    return false;
  end if;
  insert into public.event_limits (fingerprint, day, place_id, kind) values (huella, hoy, lugar, tipo)
  on conflict (fingerprint, day, place_id, kind) do update set n = public.event_limits.n + 1
  returning n into veces;
  if veces > 20 then
    return false;
  end if;
  perform public.contar_evento(lugar, tipo);
  -- De vez en cuando se borran los días viejos (la huella cambia cada día: no sirve para seguir a nadie)
  if random() < 0.02 then
    delete from public.event_limits where day < hoy - 1;
  end if;
  return true;
end;
$$;
revoke execute on function public.registrar_evento(text, uuid, text) from public, anon, authenticated;
grant execute on function public.registrar_evento(text, uuid, text) to service_role;
