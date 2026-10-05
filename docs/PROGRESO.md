# Progreso de Mi Lindo Ecuador

> Bitácora del proyecto. Claude la lee al iniciar cada sesión y la actualiza al terminar cada paso.
> Formato de un paso terminado: `- [x] 1.3 Descripción — 2026-10-07: una línea de lo hecho`.

## Estado actual

- **Fase actual:** 1 · Base técnica (abierta solo por 1.3, 1.6 y 1.7, que esperan las cuentas del usuario) y fase 2 (todo hecho menos 2.8, que espera fotos y Supabase)
- **Último paso terminado:** 0.5 Maquetas aprobadas (fase 0 cerrada)
- **Modo de trabajo (2026-10-05):** el usuario autorizó avanzar paso a paso según el plan sin pedir permiso entre pasos. Se sigue respetando: nada fuera del plan, nada de librerías nuevas sin permiso y verificar y guardar cada paso
- **Siguiente paso:** la fase 2 terminó todo lo que no depende del usuario. Lo que sigue necesita sus cuentas: **1.3** (recibir Project URL y clave anon de Supabase y ponerlas en `.env.local` y en Vercel), luego **1.6** (aplicar la migración y `seed.sql` en Supabase y comprobar las reglas contra la base real) y **2.8c**. Mientras no lleguen, NO adelantar la fase 3: su puerta exige probar con Supabase real
- **Bloqueos / esperando al usuario:** ajustes de seguridad en GitHub (1.2); crear el proyecto en Supabase y pasar URL y clave pública (1.3); cuenta de Vercel (1.7)

## Fase 0 · Plan y diseño

- [x] 0.1 Plan del proyecto escrito y revisado con el usuario — 2026-10-05
- [x] 0.2 Esquema técnico: CLAUDE.md, ARQUITECTURA.md, PROGRESO.md y migración SQL probada — 2026-10-05
- [x] 0.3 Referencias de diseño — 2026-10-05: Airbnb, Time Out, TripAdvisor y Atlas Obscura; el usuario delegó la elección
- [x] 0.4 Sistema de diseño — 2026-10-05: 21 colores (claro y oscuro, contraste verificado), 3 tipografías OFL, espacios, esquinas, 8 componentes y portada → `docs/DISENO.md`. Logo pendiente
- [x] 0.4d 11 categorías — 2026-10-05: a pedido del usuario; 6 nuevas con su afiche (cafés, vida nocturna, museos, compras, niños, naturaleza), barra con 5 principales y panel "Todas las categorías"; columna `is_main` en `categories`
- [x] 0.4c Panorama en pixel art animado — 2026-10-05: a pedido del usuario; faro que gira, balandra que cruza el río, siempre de noche (decisión del usuario), pausa fuera de pantalla y con reducir movimiento
- [x] 0.4b Arte propio — 2026-10-05: a pedido del usuario, las casitas planas se reemplazaron por la ilustración Panorama y 5 afiches de Categoría (día y noche) → `docs/arte/`
- [x] 0.5 Maquetas — 2026-10-05: 5 pantallas en computadora y celular, con modo claro y oscuro, en un lienzo de diseño (enlace en `docs/maquetas/README.md`). Revisadas a 390 y 1440 px. **Aprobadas por el usuario el 2026-10-05: fase 0 cerrada**
- [x] 0.6 Decisiones del plan — 2026-10-05: nombre, inicio de sesión con correo y Google, un solo admin, WhatsApp 593986225038
- **Puerta:** el usuario aprueba las maquetas (antes de empezar la fase 2, que es la primera que dibuja pantallas).

## Fase 1 · Base técnica

- [x] 1.1 Proyecto Next.js — 2026-10-05: Next.js 16.3, TypeScript estricto, ESLint, Tailwind 4, colores generados desde los tokens (`npm run tokens`), 3 fuentes propias, scripts `typecheck` y `test` (incluye las 36 pruebas RLS). lint, typecheck, test y build sin errores. shadcn/ui se agrega en la fase 2 con los primeros componentes
- [x] 1.2 GitHub — 2026-10-05: repositorio conectado y `.github/dependabot.yml` (revisión semanal). **Pendiente del usuario** en GitHub → Settings: activar Dependabot alerts y security updates, y proteger `main` contra force push y borrado (desde aquí la API no lo permite)
- [ ] 1.3 Crear proyecto en Supabase, instalar Supabase CLI y aplicar `0001_esquema_inicial.sql`
- [x] 1.4 Clientes de Supabase — 2026-10-05: `config.ts`, `server.ts`, `client.ts`, `admin.ts` (con `server-only`, probado: la compilación falla si se importa en el navegador) y `src/proxy.ts` que refresca la sesión con `getClaims()`. Sin claves todavía: la página funciona sin sesión hasta el paso 1.3
- [x] 1.5 Cabeceras de seguridad — 2026-10-05: CSP (Supabase y Turnstile permitidos), HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, COOP; sin X-Powered-By. Verificadas con el servidor en marcha. CSP sin nonce para mantener páginas estáticas: revisar en 5.4
- [~] 1.6 Pruebas automáticas de las reglas de seguridad — 2026-10-05: las 36 pruebas corren en `npm test` contra un Postgres en memoria; falta repetirlas contra el Supabase real después del 1.3
- [ ] 1.7 Conectar Vercel con variables de entorno y publicar una página de prueba
- **Puerta:** las pruebas de reglas de seguridad pasan.

## Fase 2 · Catálogo público

- [x] 2.1 Componentes base del sistema de diseño — 2026-10-05: Botón, Insignia, Estrellas, Buscador, TarjetaLugar, afiches de categoría (generados desde `docs/arte/` con `npm run arte`), barra de categorías desplegable, Panorama en canvas, Cabecera y Pie. Muestrario en `/dev/componentes` (404 en producción). Revisado a 390 y 1440 px, claro y oscuro, sin desborde horizontal. shadcn/ui queda para cuando un componente necesite Radix (menú del celular en 2.2): su registro está bloqueado desde la nube de Claude, así que se instalará desde la compu del usuario o se pedirá permiso para usar Radix directo
- [x] 2.2 Página de inicio — 2026-10-05: portada con Panorama y Buscador, barra de categorías, "Dónde comer encebollado", "Imperdibles de Guayaquil" y llamado para negocios, igual a la maqueta. Menú del celular con `@radix-ui/react-dialog` (permiso del usuario el 2026-10-05): atrapa el foco, cierra con Escape y devuelve el foco. Datos de muestra en `src/lib/datos/inicio.ts` (negocios con insignia "Ejemplo"); se cambian por Supabase sin tocar la página. Revisada a 390 y 1440 px, claro y oscuro. `npm audit` en producción: 0 problemas (los 5 avisos son del revisor de estilo, solo en desarrollo)
- [x] 2.3 Página de ciudad y de categoría con filtros — 2026-10-05: `/guayaquil` muestra las 11 categorías con su afiche; `/guayaquil/[categoria]` sigue la maqueta: migas, barra con la activa marcada, filtros de sector, precio y orden (formulario GET con `next/form`: se aplican solos con JavaScript y con botón sin él), cuadrícula de tarjetas, estado vacío y "Quitar filtros". Ciudad o categoría inexistente → 404. Los filtros de la dirección se validan con Zod (`src/lib/validacion/filtros.ts`); lo inválido se ignora. Datos de muestra en `src/lib/datos/lugares.ts`. 11 pruebas nuevas con Vitest (filtros y orden). Revisado a 390 y 1440 px, claro y oscuro, y sin JavaScript
- [x] 2.4 Ficha de lugar — 2026-10-05: `/[ciudad]/[categoria]/[lugar]` según la maqueta: galería (1 grande + 2 chicas; espacios mientras no haya fotos), insignias, datos, estrellas, botón de WhatsApp con saludo ya escrito (solo si el número cumple 593 + 9 dígitos), "Cómo llegar" a Google Maps, cuadro de información, "La historia" y reseñas (escribir llega en la fase 3). Lugar de otra categoría o inexistente → 404. Los negocios de ejemplo llevan `noindex` para que Google no los muestre. Datos de muestra separados en `src/lib/datos/muestra.ts`; enlaces en `src/lib/enlaces.ts` con 6 pruebas nuevas
- [x] 2.5 Buscador `/buscar` — 2026-10-05: `q` validado con Zod (2 a 80 caracteres); busca sin importar tildes ni mayúsculas en nombre, datos, sector y categoría, exige todas las palabras y pone primero las coincidencias en el nombre. Estado vacío con la barra de categorías. Resultados con `noindex`. Probado con texto malicioso (`<script>`): se muestra como texto. 9 pruebas nuevas (`tests/unit/buscar.test.ts`)
- [x] 2.6 Enlaces para compartir — 2026-10-05: `metadataBase` desde `NEXT_PUBLIC_SITE_URL` (`src/lib/sitio.ts`, con respaldo local), título, descripción, dirección canónica y Open Graph en cada página. Imágenes al compartir (1200×630) para el inicio, la ciudad, cada categoría y cada lugar, con el panorama en pixel art y las fuentes del proyecto (`src/app/_og/`; las fuentes se pasaron a .ttf porque el generador no lee .woff2). Los negocios de ejemplo dicen "Ejemplo" también en su tarjeta. Botón "Compartir" en la ficha: menú del teléfono o, si no existe, copia el enlace y lo avisa
- [x] 2.7 `sitemap.ts` y `robots.ts` — 2026-10-05: el sitemap lista inicio, ciudades, categorías y solo lugares reales (los de ejemplo no); robots bloquea `/dev/`, `/admin`, `/cuenta`, `/auth/` y `/buscar`. Además, página 404 propia (`not-found.tsx`, que está en la arquitectura) con buscador y botón al inicio
- [~] 2.8 Cargar 20 lugares reales con fotos propias (datos en `supabase/seed.sql` o desde el panel)
  - [x] 2.8a 2026-10-05: `supabase/seed.sql` con 4 lugares turísticos reales (Malecón 2000, Cerro Santa Ana, Parque Seminario, Isla Santay) como `borrador`; se puede ejecutar varias veces. Probado en PGlite (38 pruebas)
  - [ ] 2.8b **Usuario:** elegir los otros 16 lugares (restaurantes, hoteles, paseos…) y tomar 3 fotos propias de cada uno: horizontales, con luz de día, sin caras de personas en primer plano, sin logos de otras marcas. Anotar por lugar: nombre, sector, dirección, horario, precio ($, $$, $$$) y WhatsApp si es negocio que aceptó aparecer
  - [x] 2.8c-1 2026-10-05: la página ya lee Supabase cuando hay claves (`src/lib/datos/base.ts` con el cliente público `src/lib/supabase/publico.ts`) y usa `muestra.ts` cuando no las hay. Destacado solo si no venció `featured_until`. Fotos desde la URL pública del bucket (`next.config.ts` solo permite `*.supabase.co/storage/v1/object/public/fotos-lugares/**`). Inicio se regenera cada 5 minutos. **Probado contra Postgres 16 real + PostgREST 12** armados en la nube de Claude (no en el repo): la migración y el seed corren sin errores; borradores dan 404; reseñas ocultas no cuentan en el promedio; destacado vencido desaparece
  - [ ] 2.8c-2 Con Supabase listo (1.3 y 1.6): subir las fotos al bucket `fotos-lugares`, completar `seed.sql` con los 20 lugares, publicar y revisar las páginas con la base real
- **Puerta:** 20 lugares reales cargados con fotos propias.

## Fase 3 · Usuarios y reseñas

- [ ] 3.1 Página `/entrar` con correo (enlace mágico) y Google; ruta `/auth/callback`
- [ ] 3.2 Página `/cuenta` con nombre visible y mis reseñas; opción de borrar la cuenta
- [ ] 3.3 Escribir, editar y borrar mi reseña (con captcha)
- [ ] 3.4 Reportar una reseña
- [ ] 3.5 Prueba con 5 personas reales y corrección de errores
- **Puerta:** 5 personas lo prueban sin errores.

## Fase 4 · Negocios y panel admin

- [ ] 4.1 Formulario `/negocios/registro` con captcha y página `/negocios/planes`
- [ ] 4.2 Panel `/admin`: solicitudes (aprobar o rechazar)
- [ ] 4.3 Panel `/admin`: crear y editar fichas, subir fotos
- [ ] 4.4 Panel `/admin`: reseñas reportadas (ocultar o mantener) y respuesta del negocio
- [ ] 4.5 Panel `/admin`: activar destacado y verificado a mano
- **Puerta:** un negocio aprobado de punta a punta (solicitud → ficha publicada).

## Fase 5 · App y lanzamiento

- [ ] 5.1 PWA: `manifest.ts`, íconos y botón "Instalar app"
- [ ] 5.2 Páginas `/legal/terminos` y `/legal/privacidad`
- [ ] 5.3 Optimización: Lighthouse 90+ en las 5 pantallas principales
- [ ] 5.4 Revisión de seguridad completa (lista en `docs/ARQUITECTURA.md`)
- [ ] 5.5 Comprar dominio, conectarlo a Vercel y pasar Vercel a plan Pro
- [ ] 5.6 Copias de seguridad semanales de la base
- **Puerta:** Lighthouse 90+ y revisión de seguridad aprobada → lanzamiento.

## Ideas para después (no se hacen hasta terminar la versión 1)

- Búsqueda y filtros: hoy se cargan todos los lugares publicados de la ciudad y se filtra en el servidor (bien hasta unos cientos de lugares). Con más lugares, pasar la búsqueda a la base (texto completo en español)
- Revisar en 5.4: `profiles.role` se puede leer en público (deja ver quién es admin); valorar una vista pública solo con `display_name`
- **Grupos para salir juntos** (pedido del usuario, 2026-10-05): crear un grupo para ir a hacer algo en Guayaquil. Requiere reglas de seguridad: solo mayores de 18, puntos de encuentro públicos, reportar y bloquear
- **Armar un plan**: elegir lugar, fecha y hora y compartir un enlace con tarjeta por WhatsApp con amigos (primer paso hacia los grupos)
- Más categorías: playas cerca de Guayaquil, servicios útiles

- Mapa interactivo
- Chatbot que recomienda lugares con los datos de la página
- Guías turísticos locales y rutas con GPS
- Pagos automáticos (Payphone o Kushki)
- Panel para que cada dueño edite su ficha
- Apps en Google Play y App Store
- Otras ciudades e inglés

## Registro de sesiones

| Fecha | Qué se hizo | Quedó pendiente |
| --- | --- | --- |
| 2026-10-05 | Plan del proyecto, esquema técnico y migración SQL probada | Referencias de diseño y decisiones del usuario |
| 2026-10-05 | Repositorio subido a GitHub; referencias de diseño y decisiones cerradas | 0.4 Sistema de diseño |
| 2026-10-05 | Sistema de diseño publicado y revisado en claro y oscuro | 0.5 Maquetas |
| 2026-10-05 | Arte propio: Panorama del Cerro Santa Ana y afiches de Categoría | Aprobación del usuario y 0.5 Maquetas |
| 2026-10-05 | Panorama en pixel art animado, siempre de noche | Aprobación del usuario y 0.5 Maquetas |
| 2026-10-05 | 11 categorías con afiche y barra desplegable; grupos anotados para la versión 2 | 0.5 Maquetas |
| 2026-10-05 | Maquetas pospuestas por el usuario; 1.1 proyecto Next.js | 1.2 |
| 2026-10-05 | 1.2, 1.4, 1.5 y maquetas de las 5 pantallas | Aprobación de maquetas; datos de Supabase y Vercel |
