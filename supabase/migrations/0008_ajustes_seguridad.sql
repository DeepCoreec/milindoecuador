-- =====================================================================
-- 0008 · Ajustes de seguridad de la versión 2 (revisión independiente del 2026-10-07)
--   1. Las funciones de la moderación ya no se pueden llamar desde el navegador
--      (antes se podía preguntar a la base qué palabras están prohibidas).
--   2. Límites diarios de los dueños atómicos: se cuenta y se anota en la misma transacción,
--      así dos pedidos al mismo tiempo no pasan el límite. También cuenta los permisos de subida de fotos.
--   3. Reportes: para ocultar sola una ficha solo cuentan cuentas con 7 días o más, y las fichas
--      verificadas no se ocultan solas (evita que alguien oculte a la competencia con cuentas nuevas).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Los disparadores corren con los permisos de su dueño; las funciones de ayuda, solo para ellos.
-- ---------------------------------------------------------------------
alter function public.revisar_textos_lugar() security definer;
alter function public.revisar_textos_resena() security definer;
alter function public.revisar_textos_solicitud() security definer;
alter function public.revisar_nombre_perfil() security definer;
alter function public.normalizar_palabra() security definer;

revoke execute on function public.motivo_no_permitido(text, boolean) from public, anon, authenticated;
revoke execute on function public.revisar_campo(text, text, boolean) from public, anon, authenticated;
revoke execute on function public.normalizar_texto(text) from public, anon, authenticated;
grant execute on function public.motivo_no_permitido(text, boolean) to service_role;

-- ---------------------------------------------------------------------
-- 2. Límites diarios de los dueños, atómicos.
--    Devuelve el id de la anotación si hay cupo, o null si llegó al límite.
--    Si después el guardado falla, el servidor borra la anotación.
-- ---------------------------------------------------------------------
alter table public.place_changes drop constraint place_changes_kind_check;
alter table public.place_changes add constraint place_changes_kind_check
  check (kind in ('ficha', 'estado', 'foto-permiso', 'foto-nueva', 'foto-borrada', 'foto-orden', 'respuesta', 'oculta-por-reportes'));

create function public.anotar_con_limite(
  usuario uuid, lugar uuid, tipo text, contar text[], maximo integer, detalle text, revisado boolean default false
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  nuevo bigint;
begin
  perform pg_advisory_xact_lock(hashtext('limite-dueno' || usuario::text));
  if (
    select count(*) from public.place_changes
    where user_id = usuario and kind = any (contar) and created_at > now() - interval '24 hours'
  ) >= maximo then
    return null;
  end if;
  insert into public.place_changes (place_id, user_id, kind, detail, reviewed)
  values (lugar, usuario, tipo, left(detalle, 300), revisado)
  returning id into nuevo;
  return nuevo;
end;
$$;
revoke execute on function public.anotar_con_limite(uuid, uuid, text, text[], integer, text, boolean) from public, anon, authenticated;
grant execute on function public.anotar_con_limite(uuid, uuid, text, text[], integer, text, boolean) to service_role;

-- ---------------------------------------------------------------------
-- 3. Ocultar por reportes, con más cuidado.
-- ---------------------------------------------------------------------
create or replace function public.ocultar_por_reportes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.place_reports r
    join public.profiles p on p.id = r.reporter_id
    where r.place_id = new.place_id and not r.resolved and p.created_at < now() - interval '7 days'
  ) >= 3
     and exists (select 1 from public.places where id = new.place_id and status = 'publicado' and not is_verified) then
    update public.places set status = 'oculto' where id = new.place_id;
    insert into public.place_changes (place_id, kind, detail)
    values (new.place_id, 'oculta-por-reportes', 'Se ocultó sola al llegar a 3 reportes');
  end if;
  return null;
end;
$$;
