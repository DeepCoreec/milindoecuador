-- =====================================================================
-- 0004 · Ubicación exacta de cada lugar (versión 2, paso 7.1)
-- Para que "Cómo llegar" abra Google Maps o Waze con la ruta ya trazada.
-- Sin API de pago: solo guardamos latitud y longitud y armamos el enlace.
-- =====================================================================

alter table public.places
  add column latitude  numeric(8, 6),
  add column longitude numeric(9, 6);

-- Las dos van juntas (o ninguna) y dentro de Ecuador, Galápagos incluidas.
-- Así un error de tipeo (por ejemplo, el signo cambiado) no manda a la gente a otro país.
alter table public.places add constraint ubicacion_completa
  check ((latitude is null) = (longitude is null));
alter table public.places add constraint ubicacion_en_ecuador
  check (latitude is null or (latitude between -5.1 and 1.7 and longitude between -92.1 and -75.1));

-- Permisos: las columnas nuevas siguen las reglas de la tabla (lectura pública de lugares publicados,
-- escritura solo del admin), que en 0001 se dieron a la tabla entera.
