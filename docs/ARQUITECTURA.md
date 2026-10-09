# Arquitectura de Mi Lindo Ecuador

> Fuente de verdad técnica. Si algo no está aquí, no se agrega sin aprobación del usuario.

## 1. Tecnologías permitidas

| Parte | Tecnología | Por qué |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) + React 19 | Páginas generadas en el servidor: las tarjetas al compartir en WhatsApp funcionan y Google indexa bien |
| Lenguaje | TypeScript en modo estricto | Detecta errores antes de publicar |
| Estilos | Tailwind CSS 4 | Rápido y consistente con el sistema de diseño |
| Componentes | Radix (`@radix-ui/react-dialog`, aprobado 2026-10-05) y shadcn/ui cuando se pueda instalar | Accesibles con teclado y lector de pantalla; el código queda en el proyecto |
| Base de datos, usuarios y fotos | Supabase (PostgreSQL, Auth, Storage) | Reglas de seguridad dentro de la base (RLS) |
| Conexión con Supabase | `@supabase/ssr`, `@supabase/supabase-js` | Sesión guardada en cookies seguras |
| Validación | Zod | Mismo esquema en la página y en el servidor |
| Captcha | Cloudflare Turnstile | Gratis y sin rompecabezas molestos |
| Pruebas | Vitest (unidades) y Playwright (flujos completos) | Comprobar cada puerta de fase |
| Hosting | Vercel | Publica solo con cada `git push` |
| Errores en producción (13.5) | `src/instrumentation.ts` de Next.js + tabla `error_log` (sin librerías) | Ver en el panel lo que falla en la página real |
| Chatbot Paumi (fases 14–16) | Vercel AI SDK (`ai`, `@ai-sdk/anthropic`), aprobado 2026-10-09 | Conversación, herramientas y respuestas en vivo con Claude; solo para Paumi |

Cualquier otra librería necesita aprobación del usuario.

> Next.js 16 trae cambios grandes: antes de escribir código, consulta la documentación incluida en
> `node_modules/next/dist/docs/` (el archivo `AGENTS.md` que crea Next.js lo recuerda). Por ejemplo,
> `middleware.ts` ahora se llama `proxy.ts` y `params` es una promesa.

## 2. Estructura de carpetas

```
milindoecuador/
├── CLAUDE.md                     # reglas para Claude (se lee en cada sesión)
├── docs/
│   ├── PLAN.md                   # resumen del plan aprobado
│   ├── ARQUITECTURA.md           # este archivo
│   ├── PROGRESO.md               # bitácora: dónde estamos y qué sigue
│   └── DISENO.md                 # sistema de diseño (fase 0)
├── supabase/
│   ├── migrations/
│   │   └── 0001_esquema_inicial.sql
│   └── seed.sql                  # lugares reales iniciales (fase 2)
├── public/
│   └── icons/                    # íconos de la app (fase 5)
├── src/
│   ├── app/
│   │   ├── fonts/                # archivos .woff2 de las 3 fuentes (OFL)
│   │   ├── fonts.ts              # carga de fuentes con next/font/local
│   │   ├── globals.css           # Tailwind + clases de colores y fuentes del sistema
│   │   ├── tokens.css            # GENERADO desde docs/diseno-tokens.json (npm run tokens)
│   │   ├── dev/componentes/      # muestrario de componentes; responde 404 en producción
│   │   ├── layout.tsx            # HTML base, fuentes, metadatos globales
│   │   ├── page.tsx              # inicio
│   │   ├── [ciudad]/
│   │   │   ├── page.tsx                          # /guayaquil
│   │   │   └── [categoria]/
│   │   │       ├── page.tsx                      # /guayaquil/restaurantes
│   │   │       └── [lugar]/
│   │   │           ├── page.tsx                  # ficha del lugar
│   │   │           └── opengraph-image.tsx       # imagen al compartir
│   │   ├── buscar/page.tsx
│   │   ├── negocios/
│   │   │   ├── registro/page.tsx
│   │   │   └── planes/page.tsx
│   │   ├── entrar/page.tsx  crear-cuenta/  recuperar/   # correo y contraseña (v2)
│   │   ├── mi-negocio/page.tsx  mi-negocio/[id]/page.tsx # el dueño maneja su ficha (v2)
│   │   ├── api/evento/route.ts                   # estadísticas para el dueño (v2)
│   │   ├── auth/callback/route.ts               # vuelta del correo o de Google
│   │   ├── cuenta/page.tsx                       # requiere sesión
│   │   ├── admin/                                # requiere rol admin
│   │   │   ├── layout.tsx                        # verifica el rol en el servidor
│   │   │   ├── page.tsx                          # resumen
│   │   │   ├── solicitudes/page.tsx
│   │   │   ├── lugares/page.tsx
│   │   │   ├── lugares/[id]/page.tsx
│   │   │   └── resenas/page.tsx
│   │   ├── legal/terminos/page.tsx
│   │   ├── legal/privacidad/page.tsx
│   │   ├── manifest.ts           # PWA
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   └── not-found.tsx
│   ├── acciones/                 # Server Actions: el único lugar donde se escriben datos
│   │   ├── resenas.ts
│   │   ├── reportes.ts
│   │   ├── solicitudes.ts
│   │   └── admin.ts
│   ├── components/
│   │   ├── ui/                   # Boton, Insignia, iconos (y shadcn/ui cuando se instale)
│   │   ├── arte/                 # Afiche, afiches.tsx (generado con `npm run arte`), Panorama
│   │   ├── categorias/           # BarraCategorias, Filtros
│   │   ├── lugares/              # TarjetaLugar, TarjetaResumen, Estrellas; luego ficha y galería
│   │   ├── busqueda/
│   │   └── layout/               # Cabecera, Pie, MenuMovil (panel de Radix), Migas
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── config.ts         # lee URL y clave pública; sin ellas la página funciona sin sesión
│   │   │   ├── server.ts         # cliente con la sesión del usuario (componentes de servidor y acciones)
│   │   │   ├── client.ts         # cliente del navegador SOLO para subir con permiso firmado (sin sesión)
│   │   │   ├── cookies.ts        # cookies de sesión httpOnly + aviso "mle-con-sesion" para los menús
│   │   │   ├── publico.ts        # cliente sin sesión para leer el catálogo público (no usa cookies)
│   │   │   └── admin.ts          # cliente con service_role; importa 'server-only'
│   │   ├── datos/                # funciones de lectura: getLugar, getLugaresPorCategoria…
│   │   │                         # lugares.ts elige: base.ts (Supabase) si hay claves, muestra.ts si no;
│   │   │                         # tipos.ts, textos.ts, filtrar.ts, buscar.ts
│   │   ├── validacion/           # esquemas Zod compartidos (filtros.ts: filtros de la dirección)
│   │   ├── captcha.ts            # verificación de Turnstile en el servidor
│   │   └── auth.ts               # requireUsuario(), requireAdmin()
│   ├── types/
│   │   └── database.ts           # tipos generados con `supabase gen types`
│   └── proxy.ts                  # refresca la sesión de Supabase en cada visita
├── scripts/
│   ├── tokens.mjs                # genera src/app/tokens.css desde los tokens aprobados
│   └── arte.mjs                  # convierte los afiches SVG de docs/arte/ en src/components/arte/afiches.tsx
├── tests/
│   ├── unit/                     # Vitest (vitest.config.mts)
│   ├── rls/reglas.mjs            # 38 pruebas de reglas de seguridad y del seed (PGlite, npm run test:rls)
│   └── e2e/                      # Playwright: npm run test:e2e (flujos completos; ver playwright.config.ts)
├── .env.example                  # nombres de variables, sin valores reales
└── next.config.ts                # cabeceras de seguridad
```

## 3. Cómo se mueven los datos

- **Leer:** las páginas son componentes de servidor que llaman a `src/lib/datos/*` con el cliente de
  `server.ts`. RLS decide qué filas se ven: un visitante solo ve lugares publicados y reseñas visibles.
- **Escribir:** solo con Server Actions de `src/acciones/`. Cada acción sigue este orden:
  1. Validar los datos con Zod.
  2. Verificar el captcha si el formulario es público.
  3. Verificar la sesión y el rol (`requireUsuario()` o `requireAdmin()`).
  4. Escribir con el cliente del usuario (RLS aplica). Usan `admin.ts` (clave de servicio) solo cuando la base
     no acepta escrituras directas desde el navegador: las solicitudes de negocios, crear y editar reseñas
     (migración 0003: así nadie se salta el captcha; el autor se fija con el id de la sesión verificada) y
     borrar la cuenta (Supabase Auth).
  5. `revalidatePath()` de las páginas afectadas.
- **Fotos:** el admin las sube al bucket `fotos-lugares` desde el panel (las reglas del bucket le dejan). El dueño
  (versión 2) recibe del servidor un permiso de subida firmado, de un solo uso, para un camino que elige el servidor;
  no tiene permisos en el bucket. Antes de subir se convierten a WebP en el navegador y se les quitan los datos EXIF.
- **Dueños (versión 2):** no tienen NINGÚN permiso de escritura en la base. Editan solo con `src/acciones/dueno.ts`:
  Zod → sesión → dueño de ESE lugar (`owner_id`, leído de la base, nunca del navegador) → límite diario atómico
  (`anotar_con_limite`) → `admin.ts` → la base revisa los textos. Las lecturas de "Mi negocio" (`src/lib/datos/dueno.ts`)
  usan `admin.ts` siempre filtrando por la cuenta de la sesión.
- **Moderación (versión 2):** disparadores en la base rechazan palabras prohibidas (`banned_words`, la edita el admin),
  enlaces y teléfonos en descripciones, reseñas y respuestas. `src/lib/moderacion.ts` traduce el rechazo a un mensaje.

## 4. Variables de entorno

| Variable | Dónde se usa | ¿Pública? |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | URLs absolutas y metadatos al compartir | Sí |
| `NEXT_PUBLIC_SUPABASE_URL` | Clientes de Supabase | Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clientes de Supabase | Sí (está protegida por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo `src/lib/supabase/admin.ts` | **No. Nunca en el navegador ni en git** |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Widget del captcha | Sí |
| `NEXT_PUBLIC_GOOGLE_ACTIVO` | `si` muestra "Entrar con Google" (solo cuando Google está configurado en Supabase) | Sí |
| `TURNSTILE_SECRET_KEY` | `src/lib/captcha.ts` | **No** |

`.env.local` está en `.gitignore`. En Vercel se cargan en Settings → Environment Variables.

## 5. Base de datos

Definida completa en `supabase/migrations/` (0001 a 0008, en orden). Resumen:

| Tabla | Lee | Escribe |
| --- | --- | --- |
| `cities`, `categories` | Todos | Admin |
| `places` | Todos (solo publicados); admin todo | Admin |
| `place_photos` | Todos (de lugares publicados) | Admin |
| `profiles` | Todos, solo `id` y `display_name` (el rol no; se consulta con `is_admin()`) | El propio usuario solo su `display_name`; el rol nunca |
| `reviews` | Todos (solo visibles); el autor ve las suyas | El servidor crea y edita (después del captcha); el autor borra la suya; admin modera |
| `review_log` | Nadie | Solo el trigger: cuenta reseñas creadas para el límite diario (no se salta borrando) |
| `review_reports` | Admin | Usuarios con sesión |
| `business_requests` | Admin | Solo el servidor, después del captcha |
| Vista `place_ratings` | Todos | Nadie: se calcula sola |
| `places.owner_id` (0005) | Nadie desde el navegador | Solo el servidor (al aprobar una solicitud con cuenta) |
| `banned_words` (0006) | Admin | Admin |
| `place_changes` (0006) | Admin ("Cambios recientes") | Solo el servidor; el admin marca revisado |
| `place_reports` (0006) | Admin | Usuarios con sesión (lugares publicados, 1 por persona, 10 por día); 3 reportes de cuentas con 7+ días ocultan la ficha (salvo verificadas) |
| `place_stats` (0007) | Admin; el dueño, por el servidor | Solo `contar_evento`, desde `POST /api/evento` |
| `favorites` (0007) | Cada uno los suyos | Cada uno los suyos (lugares publicados, máximo 500) |

Reglas dentro de la base: una reseña por usuario y lugar, solo en lugares publicados; estrellas de 1 a 5;
texto de 10 a 1000 caracteres sin caracteres invisibles; máximo 5 reseñas por usuario cada 24 horas
(aunque borre alguna) y 10 reportes; nombre visible sin caracteres invisibles; slugs únicos por ciudad; WhatsApp con formato
`593XXXXXXXXX`; el primer admin se asigna a mano desde Supabase (ver el final de la migración).

## 6. Convenciones

- Código (variables, funciones, tablas) en inglés; textos visibles, rutas y documentación en español.
- Nombres de archivos de componentes en `PascalCase.tsx`; el resto en `camelCase.ts`.
- Un componente por archivo. Componentes de servidor por defecto; `'use client'` solo si hace falta.
- Fechas guardadas en UTC, mostradas en hora de Ecuador (`America/Guayaquil`).
- Commits en español: `fase N: qué se hizo`.

## 7. Revisión de seguridad antes del lanzamiento

Revisión hecha el 2026-10-05 (paso 5.4), con un revisor independiente además de la lista. Resultado en `docs/PROGRESO.md`.

- [x] RLS activado en todas las tablas (`select tablename from pg_tables where schemaname = 'public' and not rowsecurity` devuelve 0 filas)
- [x] Pruebas de `tests/rls/` pasan como visitante, usuario y admin (47)
- [x] Ningún archivo del navegador contiene `SERVICE_ROLE` ni la clave de servicio (buscado en `.next/static`)
- [x] Cabeceras de seguridad activas (revisadas con curl; repetir con securityheaders.com en el dominio real). **Decisión CSP:** se mantiene sin nonce (`'unsafe-inline'` en scripts) en la versión 1, para que las páginas públicas sigan siendo estáticas y rápidas; es aceptable porque no hay ningún punto donde se inserte HTML de usuarios. Revisar si se agrega contenido de terceros
- [x] Captcha en reseñas y solicitudes (en producción, sin clave secreta se rechaza siempre). [ ] Activar también el captcha de Supabase Auth para los enlaces al correo (panel de Supabase)
- [ ] Verificación en dos pasos en GitHub, Vercel y Supabase (usuario)
- [x] `npm audit` sin vulnerabilidades en dependencias de producción
- [x] Política de privacidad publicada (borrador) y opción de borrar la cuenta funcionando
- [ ] HSTS `preload`: dejarlo solo cuando el dominio propio esté listo; probarlo antes de enviarlo a hstspreload.org

### Las 20 reglas antes de cada lanzamiento (versión 3, paso 13.2)

Lista que trajo el usuario el 2026-10-09 ("20 cosas para pedirle a Claude antes de lanzar tu app"). **Antes de cada
lanzamiento se repasa entera** (además de la skill `shipping-and-launch`) y se actualiza el estado. Cómo se cumple aquí:

| # | Regla | Cómo se cumple | Estado |
| --- | --- | --- | --- |
| 1 | Ocultar API keys | Solo en `.env.local` y Vercel; el navegador solo recibe la clave pública | ✅ |
| 2 | Secretos fuera de Git | `.env*` ignorado; revisar el historial con `git log -p` buscando claves antes de lanzar | ✅ (revisado 2026-10-09) |
| 3 | Clave pública para la base | El navegador usa la anon key; la de servicio solo en `src/lib/supabase/admin.ts` (`server-only`) | ✅ |
| 4 | Row Level Security | En todas las tablas; `npm test` lo comprueba (ninguna tabla sin RLS) | ✅ |
| 5 | Encriptar datos sensibles | Supabase cifra la base; copias con AES-256; no guardamos tarjetas ni cédulas | ✅ |
| 6 | Forzar la autenticación | `requireUsuario` / `requireDueno` / `requireAdmin` en el servidor, en cada acción | ✅ |
| 7 | Restringir el acceso a registros | Dueño solo su negocio (si no, "no existe"); RLS por fila | ✅ |
| 8 | Bloquear manipulación de campos | Permisos por columna: nadie cambia rol, dueño, verificado, destacado ni la marca de revisión de video | ✅ |
| 9 | Proteger las cookies de sesión | `HttpOnly` (ningún script las lee), `SameSite=Lax` y `Secure` en producción (`src/lib/supabase/cookies.ts`); el navegador no usa la sesión: las subidas van con permiso firmado | ✅ (13.3) |
| 10 | Hashear contraseñas | Supabase Auth con bcrypt | ✅ |
| 11 | Rate limiting | Límites diarios en la base (reseñas, reportes, dueños, fotos, videos, solicitudes), Supabase Auth y `/api/evento` (huella cifrada por día, 0011) | ✅ (13.4) |
| 12 | Protección contra bots | Turnstile al crear cuenta, entrar, reseñar y registrar negocio | ✅ |
| 13 | Parametrizar queries | Nunca SQL armado con texto (regla de CLAUDE.md §4) | ✅ |
| 14 | Validar inputs | Zod en el servidor en cada acción, más reglas en la base | ✅ |
| 15 | Sanitizar contenido | React escapa todo, `dangerouslySetInnerHTML` prohibido, filtro de palabras, enlaces y teléfonos | ✅ |
| 16 | Restringir archivos | Fotos: WebP ≤ 5 MB; videos: mp4/mov/webm ≤ 50 MB; permisos firmados de un solo uso; tamaño medido en el bucket | ✅ |
| 17 | Devolver solo lo necesario | Lectura por columnas: el público no ve correos, dueños, roles ni tamaños de archivo | ✅ |
| 18 | Security headers | CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP | ✅ |
| 19 | Forzar HTTPS | Vercel lo obliga y HSTS lo fija | ✅ |
| 20 | Escanear dependencias | Dependabot semanal y `npm audit` (0 problemas el 2026-10-09); falta que el usuario active las alertas en GitHub (paso 1.2) | 🟡 usuario |

Regla para migraciones futuras: Supabase da todos los permisos a `anon` y `authenticated` en cada tabla nueva.
Cada migración que cree una tabla debe hacer `revoke all` y dar solo lo necesario, además de RLS.

## 8. Copias de seguridad

- **Base de datos:** `.github/workflows/copia-semanal.yml` hace cada lunes una copia de los esquemas `public`
  (la guía) y `auth` (las cuentas), la **cifra con contraseña** (AES-256) y la guarda 90 días en GitHub Actions.
  Necesita los secretos `SUPABASE_DB_URL` y `CLAVE_COPIAS` (la contraseña se guarda también fuera de GitHub).
- **Fotos:** viven en Supabase Storage y no entran en esa copia. Guardar siempre los originales de las fotos
  propias en la computadora o en una carpeta de respaldo.
- **Restaurar** (probado el 2026-10-05 con la base de prueba):
  1. Descargar el archivo `copia-AAAA-MM-DD.dump.gpg` desde GitHub → Actions → la ejecución → Artifacts.
  2. `gpg -d copia-AAAA-MM-DD.dump.gpg > copia.dump` (pide la contraseña).
  3. Restaurar en un proyecto de Supabase nuevo o vacío: `pg_restore -d "<cadena de conexión>" --no-owner copia.dump`
     (el aviso "schema public already exists" es normal).
  4. Borrar `copia.dump` al terminar: tiene datos personales sin cifrar.
