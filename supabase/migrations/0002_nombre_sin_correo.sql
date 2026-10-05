-- =====================================================================
-- 0002 · El nombre visible nunca sale del correo
-- Antes, sin nombre, se usaba la parte del correo antes de la @ ("rosa1791"),
-- y eso quedaba a la vista de todos junto a las reseñas.
-- Ahora: con nombre de Google → nombre y la inicial del apellido ("Juan P.");
-- sin nombre → "Visitante". La persona lo cambia en /cuenta cuando quiera.
-- Los perfiles que ya existen no se tocan.
-- =====================================================================

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
  if completo is not null then
    partes := regexp_split_to_array(completo, '\s+');
    nombre := partes[1];
    if array_length(partes, 1) > 1 then
      nombre := nombre || ' ' || upper(left(partes[2], 1)) || '.';
    end if;
  end if;
  nombre := left(nombre, 40);
  if nombre is null or char_length(nombre) < 2 then
    nombre := 'Visitante';
  end if;
  insert into public.profiles (id, display_name) values (new.id, nombre);
  return new;
end;
$$;
