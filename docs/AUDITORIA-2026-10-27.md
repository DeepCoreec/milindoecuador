# Auditoría de Supabase y PostgreSQL · 27 de octubre de 2026

> Segunda auditoría independiente, solo de la base de datos y su acceso: 17 migraciones, `seed.sql`, acciones del
> servidor, lectores de datos, rutas `/api` y el flujo de copias. Se cargaron todas las migraciones en un Postgres local
> (PGlite) imitando los permisos por defecto de Supabase y se probaron 40 ataques como visitante, usuario, dueño y admin.
> El informe completo (matriz de permisos, evidencia, consultas para el Supabase real) está en el documento privado
> "Auditoría de seguridad Supabase · Mi Lindo Ecuador" de Claude. **Ojo:** este repositorio es público; los detalles de
> lo que sigue abierto van solo en ese documento.

## Resumen

- **Críticas: 0. Altas: 0 (la posible, H1, se descartó: no hay copias publicadas). Medias: 3. Bajas: 3. Informativas: 3.**
- Nadie logró: leer datos privados de otra persona (favoritos, reportes, solicitudes, estadísticas, errores, contadores
  de Paumi), cambiar su rol, tocar un negocio ajeno, llamar funciones internas ni subir o borrar archivos sin permiso.
- RLS activado en las 22 tablas; la vista `place_ratings` respeta RLS; las 27 funciones `SECURITY DEFINER` fijan
  `search_path = ''` y las que no son disparadores solo las ejecuta `service_role` (salvo `is_admin()`, inofensiva).

## Hallazgos y estado

| # | Severidad | Hallazgo | Estado |
| --- | --- | --- | --- |
| C1 | Media | El repositorio sigue público y el flujo de copias guarda la base (con `auth`) como artifact descargable | **Usuario:** hacerlo privado (PUESTA-EN-MARCHA §15) |
| C2 | Media | Una reseña que el admin ocultó volvía a salir si su autor la borraba y la enviaba de nuevo | **Arreglado** (0018: `review_holds`; la nueva entra oculta) |
| C3 | Media | Tres cuentas recién creadas ocultaban cualquier evento (lugares y videos ya pedían 7 días) | **Arreglado** (0018: solo cuentan cuentas de 7+ días) |
| C4 | Baja | Fotos subidas con permiso firmado y nunca registradas se quedaban para siempre en el bucket | **Arreglado:** la tarea diaria las borra a las 3 horas |
| C5 | Baja | Registro directo de negocios: se puede crear la ficha de un negocio que aún no está en la guía | Abierto: decisión de producto (usuario) |
| C6 | Baja | El archivo de un contenido ocultado sigue accesible por su URL pública | Abierto: espera decisión del usuario |
| I1 | Info | `reviews.user_id` es público | **No se cambia:** la página lo usa para marcar "tu reseña" y unir el nombre del autor |
| I2 | Info | El admin podía cambiar roles desde el navegador | **Arreglado** (0018: `revoke update (role)`; admins solo por SQL) |
| I3 | Info | La protección del rol depende de `current_user` | Regla para migraciones futuras (abajo) |
| H1 | Posible | Copias ya publicadas con una clave débil | **Descartada hoy:** el 2026-10-27 no hay ningún artifact de copias (el flujo todavía no tiene sus secretos). Vuelve a ser real en cuanto se pongan, si el repositorio sigue público |
| H2–H3 | Posibles | Dependen del Supabase real y de Vercel | **Usuario:** consultas del informe (PUESTA-EN-MARCHA §15) |

## Diferencias entre documentos y código (arregladas en esta rama)

- `ARQUITECTURA.md` §3 y `src/lib/supabase/admin.ts` decían que la clave de servicio solo se usaba en 3 lugares; ahora
  tienen la lista completa (16 archivos).
- `ARQUITECTURA.md` §5 solo describía las tablas hasta 0008; ahora incluye las 9 que faltaban (0009 a 0018).
- La regla "el rol nunca se cambia" ahora vale también para el admin desde la página.

## Reglas para migraciones futuras (nuevas)

1. Toda función `SECURITY DEFINER` que actualice `profiles` o `reviews` salta los disparadores que miran
   `current_user` (`protect_profile_role`, `protect_review_fields`): no escribir esos campos desde una de ellas.
2. Todo "ocultar solo por reportes" cuenta solo cuentas con 7 días o más.
3. Si el admin oculta algo, borrar y volver a crear no debe saltarse esa decisión (videos: `video_review`; reseñas:
   `review_holds`).

## Pruebas

- `tests/rls/reglas.mjs`: 12 reglas nuevas (227 en total). Sin la migración 0018 fallan 5, con ella pasan todas.
- 129 pruebas unitarias, `lint` y `typecheck` sin errores.
