# Progreso de Mi Lindo Ecuador

> Bitácora del proyecto. Claude la lee al iniciar cada sesión y la actualiza al terminar cada paso.
> Formato de un paso terminado: `- [x] 1.3 Descripción — 2026-10-07: una línea de lo hecho`.

## Estado actual

> **Mapa rápido:** Versión 1 = construida y publicada (faltan sus puertas). Versión 2 = en marcha, fase 6.
> Plan v1: `docs/PLAN.md` · Plan v2: `docs/PLAN-V2.md` · Puesta en marcha de cuentas: `docs/PUESTA-EN-MARCHA.md`

- **Fase actual:** Versión 2 · Fase 6 (Entrar y correo). Plan v2 aprobado por el usuario el 2026-10-06
- **Último paso terminado:** ver el último `[x]` de la sección "Versión 2"
- **Siguiente paso:** el primer `[ ]` de la sección "Versión 2" que no diga "(usuario)". Los pasos "(usuario)" son clics en cuentas del usuario (Claude no tiene acceso a ellas): se le guía paso a paso
- **Página real:** https://milindoecuador.vercel.app · Supabase `rlwcvrkyojcqgjigoyan` (São Paulo) · Turnstile "Mi Lindo Ecuador" · admin: deepcoreec@gmail.com
- **Lo que falta de la versión 1 (puertas, dependen del usuario):** 2.8 fotos y 20 lugares · 3.5 cinco personas (necesita la fase 6) · 4 publicar la Barbería Adaria de prueba (cierra la puerta 4) · 5.2 datos legales · 5.5 dominio (= paso 6.3) · 5.6 secretos de copias · 1.2 ajustes de GitHub · repetir `npm test` de reglas, e2e y Lighthouse contra la base real
- **Modo de trabajo (2026-10-05):** el usuario autorizó avanzar paso a paso según el plan sin pedir permiso entre pasos. Se sigue respetando: nada fuera del plan, nada de librerías nuevas sin permiso y verificar y guardar cada paso
- **Entorno de prueba (solo en la nube de Claude, no en el repo):** Postgres 16 + PostgREST 12 + Supabase Auth 2.180 + Supabase Storage + buzón SMTP, en el scratchpad de la sesión (`supa/levantar.sh`, `dev.sh`). Si la sesión es nueva hay que volver a armarlo. Desde la nube de Claude no se llega al Supabase real (la red lo bloquea)
- **Historia del 2026-10-06:** Vercel publicado con las 6 variables; Supabase real con 0001–0003 y seed; Turnstile (secret rotada tras verse en una captura); Site URL, Redirect URL y captcha en Supabase; enlace mágico probado de punta a punta; admin dado por SQL; prueba de solicitud de negocio aprobada

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
- [x] 1.3 Crear proyecto en Supabase, instalar Supabase CLI y aplicar `0001_esquema_inicial.sql` — 2026-10-06: proyecto `rlwcvrkyojcqgjigoyan` (DeepCore, São Paulo, gratis). El usuario ejecutó en el SQL Editor 0001 → 0002 → 0003 → seed.sql, los 4 con "Success" (sin CLI: se usó el editor)
- [x] 1.4 Clientes de Supabase — 2026-10-05: `config.ts`, `server.ts`, `client.ts`, `admin.ts` (con `server-only`, probado: la compilación falla si se importa en el navegador) y `src/proxy.ts` que refresca la sesión con `getClaims()`. Sin claves todavía: la página funciona sin sesión hasta el paso 1.3
- [x] 1.5 Cabeceras de seguridad — 2026-10-05: CSP (Supabase y Turnstile permitidos), HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, COOP; sin X-Powered-By. Verificadas con el servidor en marcha. CSP sin nonce para mantener páginas estáticas: revisar en 5.4
- [~] 1.6 Pruebas automáticas de las reglas de seguridad — 2026-10-05: las 36 pruebas corren en `npm test` contra un Postgres en memoria; falta repetirlas contra el Supabase real después del 1.3
- [x] 1.7 Conectar Vercel con variables de entorno y publicar una página de prueba — 2026-10-06: https://milindoecuador.vercel.app con las 6 variables (4 Config en Production+Preview; las 2 secretas como Secret solo en Production) y redeploy. La página ya lee de Supabase real
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

- [x] 3.1 Página `/entrar` con correo (enlace mágico) y Google; ruta `/auth/callback` — 2026-10-05 (adelantada con permiso del usuario mientras la fase 2 espera fotos): acción `entrarConCorreo` (Zod, mensajes claros, aviso si se pide muy seguido), `entrarConGoogle`, `salir`; `/auth/callback` cambia el código por la sesión y solo vuelve a rutas internas (`rutaSegura`, 4 pruebas). Cabecera y menú muestran "Mi cuenta" con sesión sin volver dinámicas las páginas. **Probado de punta a punta con Supabase Auth v2.180 real** (Postgres 16 + PostgREST + Auth + buzón de prueba en la nube de Claude): llega el correo, el enlace inicia sesión y vuelve a la página de origen; enlace reusado → aviso; `siguiente` externo → ignorado. **Pendiente del usuario en Supabase:** Authentication → URL Configuration (Site URL y `…/auth/callback` en Redirect URLs) y activar Google con su cliente OAuth
- [x] 3.2 Página `/cuenta` con nombre visible y mis reseñas; opción de borrar la cuenta — 2026-10-05: sin sesión manda a `/entrar`; cambiar nombre (Zod 2 a 40, sin caracteres invisibles); lista de mis reseñas con aviso si una está oculta; Salir; borrar la cuenta escribiendo BORRAR (acción en el servidor con `admin.ts` → `auth.admin.deleteUser`; borra perfil y reseñas en cascada). **Migración `0002_nombre_sin_correo.sql`**: el nombre visible ya no sale del correo (era un problema de privacidad); con Google queda "Juan P.", sin nombre "Visitante". Las pruebas RLS ahora cargan todas las migraciones en orden (39 pruebas). Probado de punta a punta con el Supabase de prueba
- [x] 3.3 Escribir, editar y borrar mi reseña (con captcha) — 2026-10-05: formulario en la ficha (estrellas como botones de radio accesibles, texto con contador), "Entra para escribir una reseña" sin sesión (vuelve a la ficha). Acción `guardarResena` en el orden de la arquitectura (Zod → captcha → sesión → cliente del usuario → revalidar ficha y cuenta); edita si ya existe; borrar en dos toques. Captcha Turnstile (`src/components/ui/Captcha.tsx` + `src/lib/captcha.ts`): en producción sin clave secreta se rechaza siempre. Aviso claro al pasar el límite de 5 por día (lo frena la base). 8 pruebas nuevas (captcha y validación). Probado de punta a punta con el Supabase de prueba (publicar, editar, borrar, límite). La clave del captcha real no se pudo probar aquí (la nube de Claude no llega a Cloudflare): **probar en Vercel**. **Pendiente del usuario:** crear el sitio en Cloudflare Turnstile y pasar las 2 claves
- [x] 3.4 Reportar una reseña — 2026-10-05: "Reportar" en cada reseña ajena (no en la propia; sin sesión lleva a entrar), panel de Radix con 5 motivos y detalle opcional (obligatorio si es "Otro"), acción `reportarResena` (Zod → sesión → cliente del usuario). Un segundo reporte de la misma persona se avisa con amabilidad (lo impide la base). Los formularios ya no borran lo escrito cuando muestran un error. Probado de punta a punta con el Supabase de prueba
- [ ] 3.5 Prueba con 5 personas reales y corrección de errores
- **Puerta:** 5 personas lo prueban sin errores.

## Fase 4 · Negocios y panel admin

- [x] 4.1 Formulario `/negocios/registro` con captcha y página `/negocios/planes` — 2026-10-05: según la maqueta Registro; acepta el celular como lo escribe la gente ("099 123 4567") y lo guarda como 593…; errores por campo sin borrar lo escrito; Zod → captcha → `admin.ts` (la tabla no acepta escrituras directas). Al enviar ofrece "Avisar por WhatsApp" al número de la guía (`WHATSAPP_GUIA` en `src/lib/sitio.ts`), como dice el plan. `/negocios/planes` con los 3 planes del PLAN, pedido por WhatsApp y cómo se paga. 6 pruebas nuevas. Probado de punta a punta con el Supabase de prueba
- [x] 4.2 Panel `/admin`: solicitudes (aprobar o rechazar) — 2026-10-05: `requireAdmin()` en el layout y en cada acción (sin sesión → entrar; usuario normal → 404, no se revela el panel). Resumen con contadores; tabla de solicitudes (pendientes primero) con WhatsApp del dueño. Aprobar crea la ficha como **borrador** con un slug libre (`src/lib/slug.ts`: "malecon-2000-2" si ya existe; 4 pruebas) y marca la solicitud; rechazar guarda una nota. Probado de punta a punta con el Supabase de prueba
- [x] 4.3 Panel `/admin`: crear y editar fichas, subir fotos
  - [x] 4.3a 2026-10-05: `/admin/lugares` (todas las fichas con estado, número de fotos y plan) y `/admin/lugares/[id]` para crear ("nuevo") y editar con Zod (`esquemaLugar`, 3 pruebas). Al crear, el slug sale del nombre y es libre; al editar no cambia. Guardar revalida las páginas públicas. Se corrigió un fallo: tras un error las listas desplegables volvían a la primera opción (ahora el formulario se redibuja con lo elegido; también en el registro de negocios). Probado de punta a punta: borrador → 404 en público, publicado → visible
  - [x] 4.3b 2026-10-05 Fotos: el navegador las gira, las achica a 1600 px y las convierte a WebP con canvas (`src/lib/imagen.ts`; así se pierden los EXIF como el GPS); se suben con la sesión del admin a `lugares/<id>/<uuid>.webp`; `registrarFoto` comprueba que el camino sea de ese lugar y guarda la fila (si falla, borra el archivo); ordenar (la primera es la principal) y borrar (fila y archivo). La CSP y las imágenes ahora toman la dirección de Supabase de la configuración (en desarrollo se permite el Supabase local). **Probado con Supabase Storage real** en el entorno de prueba: WebP sin EXIF, orden, ficha pública con fotos, borrado; visitantes y usuarios normales no pueden subir (RLS de Storage)
- [x] 4.4 Panel `/admin`: reseñas reportadas (ocultar o mantener) y respuesta del negocio — 2026-10-05: `/admin/reportes` agrupa los reportes por reseña (las más reportadas primero) con sus motivos; "Ocultar reseña" o "Mantener" cierran los reportes. En la ficha del admin: todas las reseñas del lugar (también ocultas), ocultar/mostrar y responder como el negocio. Menú con contador. Arreglo: los botones de peligro ahora sí salen en rojo. Probado de punta a punta (oculta → desaparece del público; respuesta → aparece en la ficha)
- [x] 4.5 Panel `/admin`: activar destacado y verificado a mano — 2026-10-05: en la ficha del admin, "Destacar 7 días (1 $)" y "6 semanas (5 $)" (si sigue vigente, los días se suman al final: `src/lib/planes.ts`, 3 pruebas), "Quitar destacado" y Verificado. Arreglo importante: después de guardar, las listas desplegables volvían a su valor inicial y un segundo guardado borraba el precio; ahora el formulario se redibuja tras cada guardado. **Puerta de la fase 4 probada de punta a punta con el Supabase de prueba:** solicitud sin cuenta → aprobar (borrador) → completar ficha, foto y destacado → publicar → sale primero en Restaurantes con "Destacado", foto, WhatsApp y en el buscador. Falta repetirla con el Supabase real para cerrar la fase
- **Puerta:** un negocio aprobado de punta a punta (solicitud → ficha publicada).

## Fase 5 · App y lanzamiento

- [x] 5.1 PWA: `manifest.ts`, íconos y botón "Instalar app" — 2026-10-05: manifiesto (nombre, colores de noche, `standalone`), íconos 192/512, maskable, favicon y apple-icon sacados del panorama en pixel art (faro, capilla y casas); color de la barra del teléfono según modo claro u oscuro; "Instalar app" en el pie solo cuando el navegador lo ofrece. Chrome confirma que es instalable (sin errores fuera del modo incógnito de la prueba)
- [~] 5.2 Páginas `/legal/terminos` y `/legal/privacidad` — 2026-10-05: borradores en lenguaje simple y fieles a lo que la página hace (datos que se guardan, para qué, proveedores, cuánto tiempo, derechos según la LOPDP, borrar cuenta, reglas de reseñas y de negocios, pagos manuales). Agregadas al sitemap. **Falta del usuario:** llenar en `src/lib/legal.ts` la razón social, el RUC y el correo (hoy dicen "por completar") y que lo revise un abogado
- [x] 5.3 Optimización: Lighthouse 90+ en las 5 pantallas principales — 2026-10-05: medido en compilación de producción, modo celular, mediana de 5 corridas (Lighthouse 12, instalado fuera del proyecto):

  | Pantalla | Rendimiento | Accesibilidad | Buenas prácticas | SEO |
  | --- | --- | --- | --- | --- |
  | Inicio | 92 | 100 | 100 | 100 |
  | Categoría | 93 | 100 | 100 | 100 |
  | Ficha | 92 | 100 | 100 | 100 |
  | Registro | 95 | 100 | 100 | 100 |
  | Buscar | 98 | 100 | 100 | 58* |

  \*Buscar tiene `noindex` a propósito (Google debe llegar a las fichas, no a búsquedas sueltas); por eso Lighthouse le baja el SEO. Cambios: el panorama dibuja un cuadro fijo y anima cuando el navegador queda libre; solo se precarga la fuente de títulos; títulos de sección ocultos para lectores de pantalla en categoría y buscar; las estrellas con `role="img"`. Repetir la medición en Vercel con el dominio real
- [x] 5.4 Revisión de seguridad completa (lista en `docs/ARQUITECTURA.md`) — 2026-10-05: lista recorrida y además un **revisor independiente** (agente que no escribió el código). Sin hallazgos críticos ni altos. Se corrigieron los medios y bajos con la **migración `0003_endurecer_seguridad.sql`** y cambios en el código:
  - Reseñas: ya no se pueden crear ni editar directo en la base con la clave pública (se saltaba el captcha); las escribe el servidor después del captcha
  - Perfiles: en público solo se lee el nombre visible; el rol ya no (antes se veía quién es admin); `requireAdmin` usa `is_admin()`
  - Límite de 5 reseñas al día que no se salta borrando y volviendo a crear (`review_log`), con candado contra envíos simultáneos; solo en lugares publicados
  - Máximo 10 reportes por persona al día; nombres y textos sin caracteres invisibles (suplantación)
  - Captcha también al pedir el enlace de entrada (lo verifica Supabase Auth cuando se active en su panel)
  - Las lecturas del panel vuelven a exigir admin; el optimizador de imágenes solo acepta nuestro proyecto de Supabase; aprobar una solicitud dos veces ya no crea dos fichas
  - Probado: 47 pruebas RLS, todas las pruebas de punta a punta otra vez, y ataques directos a la base con la clave pública (rechazados)
  - **Pendiente del usuario:** verificación en dos pasos en GitHub, Vercel y Supabase; activar el captcha de Supabase Auth (Authentication → Attack Protection, con la clave secreta de Turnstile); SMTP propio para los correos
- [ ] 5.5 Comprar dominio, conectarlo a Vercel y pasar Vercel a plan Pro
- [~] 5.6 Copias de seguridad semanales de la base — 2026-10-05: flujo `.github/workflows/copia-semanal.yml` (lunes 03:17 de Guayaquil y a mano): copia `public` + `auth`, la cifra con AES-256 y la guarda 90 días; sin secretos no hace nada. Ciclo completo probado en local (copiar → cifrar → descifrar → restaurar: mismos conteos en todas las tablas). Cómo restaurar en `docs/ARQUITECTURA.md` §8. **Pendiente del usuario:** secretos `SUPABASE_DB_URL` y `CLAVE_COPIAS` en GitHub, correr una vez a mano y probar una restauración real
- **Puerta:** Lighthouse 90+ y revisión de seguridad aprobada → lanzamiento.

## Mantenimiento

- 2026-10-05 Actualizaciones de Dependabot: **aceptada** React y React DOM 19.3.0 (todas las pruebas, también de punta a punta). **Rechazadas por ahora:** ESLint 10 (rompe eslint-plugin-react de eslint-config-next), TypeScript 7 (typescript-eslint no lo soporta) y @types/node 26 (la página corre en Node 22). Dependabot ya no propone esos saltos grandes; revisarlos a mano cada pocos meses. Los pull requests viejos de esas 3 se pueden cerrar en GitHub
- 2026-10-05 Pruebas de punta a punta del proyecto: `npm run test:e2e` (Playwright, `tests/e2e/`): catálogo en celular y escritorio, 404 de borradores, cuenta (nombre y borrar), reseñas (publicar, editar, reportar, borrar) y la puerta de la fase 4 completa (solicitud → panel → foto → destacado → publicado). Inician sesión sin correo (enlace generado con la clave de servicio, solo en la prueba) y borran todo lo que crean. 9 pruebas pasan contra el Supabase de prueba. De paso se corrigió que una foto dañada mostraba el error del navegador en inglés

## Versión 2

> Plan: `docs/PLAN-V2.md` (aprobado 2026-10-06). "(usuario)" = lo hace el usuario en sus cuentas con guía de Claude.

### Fase 6 · Entrar y correo
- [ ] 6.1 Esconder "Entrar con Google" hasta que Google esté configurado (`NEXT_PUBLIC_GOOGLE_ACTIVO=si`)
- [ ] 6.2 Entrar con correo y contraseña: crear cuenta (confirmación por correo), entrar, "Olvidé mi contraseña", cambiarla en "Mi cuenta"; con captcha y Zod. El enlace mágico se quita
- [ ] 6.3 (usuario) Comprar el dominio y conectarlo en Vercel (= paso 5.5 de la v1)
- [ ] 6.4 (usuario) Cuenta en Resend, verificar el dominio y poner su SMTP en Supabase
- [ ] 6.5 Correos en español (confirmar cuenta, recuperar contraseña): plantillas en `docs/PUESTA-EN-MARCHA.md`; (usuario) pegarlas en Supabase
- [ ] 6.6 (usuario) Configurar Google en Google Cloud y Supabase; poner `NEXT_PUBLIC_GOOGLE_ACTIVO=si` en Vercel
- **Puerta:** una persona que no es el admin crea su cuenta y entra

### Fase 7 · Cómo llegar
- [ ] 7.1 Migración 0004: latitud y longitud en `places` (con límites de Ecuador)
- [ ] 7.2 Formulario de lugar: campos de ubicación, "Usar mi ubicación actual" y pegar coordenadas de Google Maps
- [ ] 7.3 Ficha: botones "Cómo llegar" con ruta en Google Maps y en Waze (si no hay coordenadas, se busca por dirección como hoy)
- **Puerta:** desde el celular, "Cómo llegar" abre la ruta correcta en 3 lugares reales

### Fase 8 · Cuentas de dueño
- [ ] 8.1 Migración 0005: dueño de cada lugar y de cada solicitud, con reglas de seguridad
- [ ] 8.2 La solicitud de negocio pide iniciar sesión; al aprobarla, la cuenta queda como dueña
- [ ] 8.3 Pruebas de reglas: un dueño no puede tocar un negocio ajeno ni hacerse admin
- **Puerta:** las pruebas de seguridad pasan

### Fase 9 · Mi negocio y moderación
- [ ] 9.1 Filtro automático de textos (palabras prohibidas editables por el admin, enlaces y teléfonos) en servidor y base
- [ ] 9.2 Página "Mi negocio": editar datos, horario, precio, sector, WhatsApp y ubicación (sale al instante)
- [ ] 9.3 Fotos del dueño: hasta 15, ordenar y borrar
- [ ] 9.4 El dueño responde las reseñas de su negocio
- [ ] 9.5 Límites diarios por cuenta (cambios y fotos)
- [ ] 9.6 Panel: "Cambios recientes" y ocultar ficha o foto con un clic
- [ ] 9.7 "Reportar este lugar"; con 3 reportes se oculta sola
- [ ] 9.8 Pruebas de punta a punta del flujo del dueño
- **Puerta:** 3 negocios reales llenan su ficha solos y el filtro bloquea las palabras de prueba

### Fase 10 · Extras
- [ ] 10.1 "Abierto ahora / Cerrado" según el horario
- [ ] 10.2 Estadísticas para el dueño (vistas, toques a WhatsApp y "Cómo llegar")
- [ ] 10.3 Favoritos
- **Puerta:** el usuario los prueba y los aprueba

## Ideas para después (no se hacen hasta terminar la versión 1)

- Búsqueda y filtros: hoy se cargan todos los lugares publicados de la ciudad y se filtra en el servidor (bien hasta unos cientos de lugares). Con más lugares, pasar la búsqueda a la base (texto completo en español)
- Revisar en 5.4: `profiles.role` se puede leer en público (deja ver quién es admin); valorar una vista pública solo con `display_name`
- **Grupos para salir juntos** (pedido del usuario, 2026-10-05): crear un grupo para ir a hacer algo en Guayaquil. Requiere reglas de seguridad: solo mayores de 18, puntos de encuentro públicos, reportar y bloquear
- **Armar un plan**: elegir lugar, fecha y hora y compartir un enlace con tarjeta por WhatsApp con amigos (primer paso hacia los grupos)
- Más categorías: playas cerca de Guayaquil, servicios útiles

- Mapa interactivo dibujado en la página (fuera de la v2: API de pago)
- Chatbot que recomienda lugares con los datos de la página
- Guías turísticos locales y rutas con GPS
- Pagos automáticos (Payphone o Kushki)
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
