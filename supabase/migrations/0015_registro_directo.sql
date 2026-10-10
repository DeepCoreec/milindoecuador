-- Versión 4 (2026-10-10): el registro de negocios ya no espera al admin (la solicitud entra "aprobada" y la ficha
-- del dueño se crea al instante). El límite tiene que valer igual aunque lleguen varios registros al mismo tiempo:
-- con candado por cuenta, como mucho 3 solicitudes en 24 horas (de cualquier estado) y 10 en total (sin contar las
-- rechazadas). La app muestra el mensaje amable; esto es la barrera de verdad.
create or replace function public.limite_solicitudes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null then
    perform pg_advisory_xact_lock(hashtext('solicitudes' || new.user_id::text));
    if (select count(*) from public.business_requests where user_id = new.user_id and status = 'pendiente') >= 3 then
      raise exception 'limite_solicitudes';
    end if;
    if (select count(*) from public.business_requests where user_id = new.user_id and created_at > now() - interval '24 hours') >= 3 then
      raise exception 'limite_solicitudes_dia';
    end if;
    if (select count(*) from public.business_requests where user_id = new.user_id and status <> 'rechazada') >= 10 then
      raise exception 'limite_solicitudes_total';
    end if;
  end if;
  -- Datos de contacto de solicitudes rechazadas: se borran a los 180 días
  delete from public.business_requests where status = 'rechazada' and updated_at < now() - interval '180 days';
  return new;
end;
$$;
