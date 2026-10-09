-- =====================================================================
-- 0013 · Arreglos de la auditoría de seguridad del 2026-10-09
--   1. Nombre visible al crear la cuenta: pasaba sin el filtro de palabras (el filtro solo revisaba al editar)
--      y se podía usar un nombre que imita a la guía ("Admin", "Soporte Mi Lindo"). Ahora:
--        - al crear la cuenta, un nombre no permitido queda como "Visitante" (no se corta el registro);
--        - al editar, se rechaza con el mensaje de siempre.
--      También se quitan letras invisibles del nombre que manda Google (antes cortaban el registro).
--   2. Máximo 3 solicitudes de negocio pendientes por cuenta, contado EN la base con candado
--      (antes lo contaba el servidor y varias a la vez se pasaban del límite).
--   3. Las solicitudes rechazadas se borran solas a los 180 días (datos de contacto: nombre y WhatsApp).
--   4. Una misma foto no se puede registrar dos veces.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Nombres reservados y filtro también al crear la cuenta
-- ---------------------------------------------------------------------
create function public.nombre_reservado(t text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select public.normalizar_texto(t) ~ '(^| )(admin|administrador|administracion|moderador|moderacion|soporte|oficial|staff|mi ?lindo|milindoecuador|deepcore)( |$)';
$$;
revoke execute on function public.nombre_reservado(text) from public, anon, authenticated;

create or replace function public.revisar_nombre_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.display_name is distinct from old.display_name then
    perform public.revisar_campo('nombre', new.display_name, true);
    if public.nombre_reservado(new.display_name) then
      raise exception 'texto_no_permitido:nombre:reservado';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  completo text;
  partes text[];
  nombre text;
begin
  completo := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), '')
  );
  -- Sin letras invisibles ni de control (las prohíbe la tabla)
  completo := nullif(trim(regexp_replace(completo, '[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩﻿]', '', 'g')), '');
  if completo is not null then
    partes := regexp_split_to_array(completo, '\s+');
    nombre := partes[1];
    if array_length(partes, 1) > 1 then
      nombre := nombre || ' ' || upper(left(partes[2], 1)) || '.';
    end if;
  end if;
  nombre := left(nombre, 40);
  if nombre is null or char_length(nombre) < 2
     or public.motivo_no_permitido(nombre, true) is not null
     or public.nombre_reservado(nombre) then
    nombre := 'Visitante';
  end if;
  insert into public.profiles (id, display_name) values (new.id, nombre);
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2 y 3. Solicitudes de negocio: límite atómico y limpieza de las rechazadas
-- ---------------------------------------------------------------------
create function public.limite_solicitudes()
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
  end if;
  -- Datos de contacto de solicitudes rechazadas: se borran a los 180 días
  delete from public.business_requests where status = 'rechazada' and updated_at < now() - interval '180 days';
  return new;
end;
$$;
create trigger limite_solicitudes before insert on public.business_requests
  for each row execute function public.limite_solicitudes();

-- ---------------------------------------------------------------------
-- 4. Una foto, una fila
-- ---------------------------------------------------------------------
create unique index place_photos_camino_unico on public.place_photos (storage_path);
