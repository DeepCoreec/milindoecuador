-- =====================================================================
-- 0014 · Paumi, la guacamaya guía (versión 3, fase 14)
-- Cada mensaje a Paumi cuesta dinero (la IA de Anthropic). Para cuidar el gasto, la base cuenta los mensajes del día:
--   - por "huella" (código cifrado de la conexión + el día, como en 0011; la IP no se guarda);
--   - y en total, para que nunca se pase un tope diario aunque lleguen muchas personas.
-- Las conversaciones NO se guardan.
-- =====================================================================

create table public.paumi_usage (
  fingerprint  text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  day          date not null default ((now() at time zone 'America/Guayaquil')::date),
  n            integer not null default 1 check (n > 0),
  primary key (fingerprint, day)
);
create index paumi_usage_dia_idx on public.paumi_usage (day);
alter table public.paumi_usage enable row level security;
revoke all on public.paumi_usage from anon, authenticated;

-- 'ok' si se puede responder; 'persona' si esa huella llegó a su máximo del día; 'total' si se llegó al tope diario.
create function public.usar_paumi(huella text, maximo_persona integer, maximo_total integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  hoy date := (now() at time zone 'America/Guayaquil')::date;
  mio integer;
begin
  if huella !~ '^[0-9a-f]{64}$' or maximo_persona < 1 or maximo_total < 1 then
    raise exception 'uso inválido';
  end if;
  perform pg_advisory_xact_lock(hashtext('paumi'));
  if (select coalesce(sum(n), 0) from public.paumi_usage where day = hoy) >= maximo_total then
    return 'total';
  end if;
  select n into mio from public.paumi_usage where fingerprint = huella and day = hoy;
  if coalesce(mio, 0) >= maximo_persona then
    return 'persona';
  end if;
  insert into public.paumi_usage (fingerprint, day) values (huella, hoy)
  on conflict (fingerprint, day) do update set n = public.paumi_usage.n + 1;
  if random() < 0.02 then
    delete from public.paumi_usage where day < hoy - 1;
  end if;
  return 'ok';
end;
$$;
revoke execute on function public.usar_paumi(text, integer, integer) from public, anon, authenticated;
grant execute on function public.usar_paumi(text, integer, integer) to service_role;
