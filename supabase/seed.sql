-- =====================================================================
-- Lugares reales de Guayaquil para el paso 2.8.
-- Entran como 'borrador': se publican cuando tengan sus fotos propias
-- (update public.places set status = 'publicado' where slug = '...').
-- Los textos se revisan en persona al tomar las fotos.
-- Se puede ejecutar varias veces: si el lugar ya existe, no hace nada.
-- =====================================================================

insert into public.places (city_id, category_id, slug, name, sector, description, short_fact, hours, price_level, address, status)
select c.id, k.id, v.slug, v.name, v.sector, v.description, v.short_fact, v.hours, null, v.address, 'borrador'
from (values
  ('malecon-2000', 'Malecón 2000', 'Centro',
   'Unos dos kilómetros y medio de paseo junto al río Guayas, con jardines, miradores y juegos. En el camino están la Torre Morisca y el Hemiciclo de la Rotonda, que recuerda el encuentro de Bolívar y San Martín en 1822. Al norte termina junto al barrio Las Peñas.',
   'Entrada libre', 'Todos los días', 'Av. Malecón Simón Bolívar, centro'),
  ('cerro-santa-ana', 'Cerro Santa Ana', 'Las Peñas',
   'Una escalinata de 444 escalones numerados sube entre casas de colores, tiendas y cafés hasta el faro y la capilla de la cima, desde donde se ve el río y media ciudad. Al pie está Las Peñas, el barrio más antiguo de Guayaquil.',
   '444 escalones', 'Todos los días', 'Al norte del Malecón 2000, junto al barrio Las Peñas'),
  ('parque-seminario', 'Parque Seminario', 'Centro',
   'También se llama Parque Bolívar, por la estatua ecuestre del Libertador que tiene en el centro. Es famoso por las iguanas que bajan de los árboles y caminan entre la gente, frente a la Catedral.',
   'Entrada libre', 'Todos los días', 'Calles Chile y 10 de Agosto, frente a la Catedral'),
  ('isla-santay', 'Isla Santay', 'Durán',
   'Una isla protegida en medio del río Guayas, con manglares, aves y senderos de madera. Se llega caminando o en bicicleta por el puente que sale del sur del malecón, y adentro vive una pequeña comunidad.',
   'Naturaleza', 'Todos los días', 'Puente peatonal en el Malecón Simón Bolívar y calle El Oro')
) as v(slug, name, sector, description, short_fact, hours, address)
join public.cities c on c.slug = 'guayaquil'
join public.categories k on k.slug = 'turismo'
on conflict (city_id, slug) do nothing;
