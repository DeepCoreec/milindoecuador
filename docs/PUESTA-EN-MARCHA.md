# Puesta en marcha (pasos 1.3, 1.6, 1.7 y lanzamiento)

Guía para dejar la página funcionando con las cuentas reales. Se hace **en este orden**.
Lo que dice 🔒 es secreto: nunca va en el chat, en el código ni en GitHub; solo en Vercel o Supabase.

---

## 1. Cloudflare Turnstile (el captcha) — 5 minutos

1. Entra a dash.cloudflare.com (cuenta gratis) → **Turnstile** → **Add widget**.
2. Nombre: `Mi Lindo Ecuador`. Dominios: tu dominio de Vercel (por ejemplo `milindoecuador.vercel.app`) y, más adelante, el dominio propio. Modo: **Managed**.
3. Te da dos claves:
   - **Site key** (pública) → la puedes pasar por el chat.
   - **Secret key** 🔒 → va a Vercel y a Supabase (pasos 2.6 y 3.2).

## 2. Supabase — 20 minutos

1. supabase.com → **New project**: nombre `milindoecuador`, región **South America (São Paulo)**. La contraseña de la base 🔒 guárdala en un gestor de contraseñas.
2. **Cargar la base:** SQL Editor → New query → pega y ejecuta, **uno por uno y en orden**, los archivos:
   1. `supabase/migrations/0001_esquema_inicial.sql`
   2. `supabase/migrations/0002_nombre_sin_correo.sql`
   3. `supabase/migrations/0003_endurecer_seguridad.sql`
   4. `supabase/seed.sql` (los lugares turísticos, como borrador)

   Cada uno debe terminar en "Success". Si alguno falla, detente y avisa (no ejecutes el siguiente).
3. **Claves** (Project Settings → API):
   - **Project URL** y **anon public** (o "publishable key") → se pueden pasar por el chat.
   - **service_role** (o "secret key") 🔒 → solo a Vercel.
4. **Direcciones** (Authentication → URL Configuration):
   - Site URL: `https://<tu-dominio-de-vercel>`
   - Redirect URLs: `https://<tu-dominio-de-vercel>/auth/callback` y `http://localhost:3000/auth/callback`
5. **Correo y contraseña** (versión 2, paso 6.2):
   - Authentication → Sign In / Providers → **Email**: activado, con **Confirm email** activado.
     En **Minimum password length** pon **8** (la página ya lo exige, pero así también lo exige Supabase si alguien le habla directo).
   - Recomendado: **SMTP propio** (Resend, paso 6.4), porque el correo de Supabase solo manda unos pocos por hora y solo a los miembros de tu organización.
   - Authentication → Emails → plantillas en español (paso 6.5):
     - **Confirm signup** — Asunto: `Confirma tu cuenta de Mi Lindo Ecuador` — Cuerpo:
       `<p>Hola:</p><p>Toca este enlace para activar tu cuenta de Mi Lindo Ecuador. Después entra con tu correo y tu contraseña.</p><p><a href="{{ .ConfirmationURL }}">Activar mi cuenta</a></p><p>Si no creaste una cuenta, ignora este correo.</p>`
     - **Reset password** — Asunto: `Crea una contraseña nueva para Mi Lindo Ecuador` — Cuerpo:
       `<p>Hola:</p><p>Pediste una contraseña nueva. Toca este enlace en el mismo teléfono o computadora donde la pediste y escribe la nueva en "Mi cuenta". Funciona una sola vez y por poco tiempo.</p><p><a href="{{ .ConfirmationURL }}">Crear contraseña nueva</a></p><p>Si no lo pediste, ignora este correo: tu contraseña sigue igual.</p>`
     - **Magic Link** (ya no se usa en la página, pero por si acaso) — Asunto: `Tu enlace para entrar a Mi Lindo Ecuador` — Cuerpo:
       `<p>Hola:</p><p>Toca este enlace para entrar a Mi Lindo Ecuador. Funciona una sola vez y por poco tiempo.</p><p><a href="{{ .ConfirmationURL }}">Entrar a Mi Lindo Ecuador</a></p><p>Si no lo pediste, ignora este correo.</p>`
   - Las cuentas creadas antes (con el enlace mágico) no tienen contraseña: se pone una con "Olvidé mi contraseña".
6. **Protección contra robots** (Authentication → Attack Protection): activa **CAPTCHA**, proveedor **Turnstile**, y pega la **Secret key** 🔒 de Cloudflare.
7. **Entrar con Google** (opcional, puede ser después): Authentication → Providers → Google. Necesita un "OAuth client" de Google Cloud con la dirección de vuelta que muestra Supabase (`https://<ref>.supabase.co/auth/v1/callback`). Cuando funcione, poner en Vercel `NEXT_PUBLIC_GOOGLE_ACTIVO` = `si` y volver a desplegar: hasta entonces el botón "Entrar con Google" no aparece.
8. **Verificación en dos pasos** de tu cuenta de Supabase: Account → Security.

## 3. Vercel — 10 minutos

1. vercel.com → **Add New → Project** → importa `DeepCoreec/milindoecuador` (plan Hobby).
2. **Environment Variables** (para Production y Preview):

   | Nombre | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | `https://<tu-dominio-de-vercel>` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL de Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public de Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` 🔒 | service_role de Supabase |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Site key de Cloudflare |
   | `TURNSTILE_SECRET_KEY` 🔒 | Secret key de Cloudflare |

3. **Deploy**. Cuando termine, abre la página.
4. **Verificación en dos pasos** de tu cuenta de Vercel: Settings → Authentication.

## 4. Tu usuario de administrador — 2 minutos

1. En la página publicada, ve a **Entrar** y entra con tu correo.
2. En Supabase → SQL Editor ejecuta (con tu correo):
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'TU_CORREO@ejemplo.com');
   ```
3. Abre `/admin`: debe aparecer el panel.

## 5. Comprobar que todo funciona

Claude lo hace con estas herramientas (ya probadas con el Supabase de prueba):

- `npm run test:e2e` contra la página de Vercel: catálogo, cuenta, reseñas, reportes y la puerta de la fase 4.
  Para estas pruebas conviene un despliegue "Preview" con las **claves de prueba de Turnstile**, que siempre aprueban:
  site key `1x00000000000000000000AA` y secret key `1x0000000000000000000000000000000AA`.
- Lighthouse (5 pantallas, 90+) y securityheaders.com.
- Con eso se cierran las puertas de las fases 1, 3 (después de las 5 personas) y 4.

## 6. GitHub — 5 minutos

1. **Settings → Advanced Security** (o Code security): activa Dependabot alerts y Dependabot security updates.
2. **Settings → Branches/Rules**: regla para `main` con "Block force pushes" y "Restrict deletions".
3. **Settings → Secrets and variables → Actions** (copias semanales, paso 5.6):
   - `SUPABASE_DB_URL` 🔒: Supabase → Project Settings → Database → Connection string → "Session pooler" (con la contraseña de la base).
   - `CLAVE_COPIAS` 🔒: una contraseña larga nueva; guárdala también en tu gestor de contraseñas (sin ella las copias no se pueden abrir).
   - Luego Actions → "Copia semanal de la base" → **Run workflow** una vez para probar.
4. **Verificación en dos pasos** en tu cuenta de GitHub.

## 7. Antes de lanzar

- Datos legales en `src/lib/legal.ts` (razón social, RUC, correo) y revisión de un abogado.
- 20 lugares reales con fotos propias (paso 2.8).
- 5 personas prueban la página (paso 3.5).
- Dominio propio (paso 5.5): comprarlo, conectarlo en Vercel → Domains, y actualizar `NEXT_PUBLIC_SITE_URL`, la Site URL y las Redirect URLs de Supabase y los dominios de Turnstile.

## 8. Publicar la versión 2 (dueños, Cómo llegar, moderación, extras)

El código de la versión 2 está en la rama `v2` de GitHub. Lee columnas y tablas nuevas, así que **primero la base y
después el código** (si se publica antes, la página falla).

1. **Base de datos** — Supabase → SQL Editor → **+** (una consulta nueva para cada archivo), pega y ejecuta en orden.
   Cada uno debe decir "Success"; si uno falla, detente y avisa:
   1. `supabase/migrations/0004_ubicacion.sql`
   2. `supabase/migrations/0005_duenos.sql`
   3. `supabase/migrations/0006_moderacion.sql` (avisará "destructive operation": es normal, toca **Run query**)
   4. `supabase/migrations/0007_extras.sql`
   5. `supabase/migrations/0008_ajustes_seguridad.sql` (también avisará: **Run query**)
2. **Ajustes de Supabase** (Authentication):
   - Sign In / Providers → **Email**: Confirm email activado y **Minimum password length = 8** (§2.5).
   - Sign In / Providers → **Secure password change** activado (pide entrar de nuevo antes de cambiar la contraseña:
     si alguien roba una sesión, no se queda con la cuenta).
   - Emails: plantillas en español de "Confirm signup" y "Reset password" (§2.5).
3. **Código** — Claude une la rama `v2` a `main` y la sube (`git merge v2 && git push`); Vercel publica solo.
4. **Probar** en la página real: crear cuenta, registrar un negocio, aprobarlo, entrar a "Mi negocio", poner foto,
   ubicación y horario, publicar, reportar desde otra cuenta, "Cambios recientes" y "Palabras prohibidas" en el panel.

## 9. Publicar las fases 11 y 12 de la versión 3 (video, redes, enlace corto de Maps y buscador)

El código está en la rama `v3-video`. Lee columnas y tablas nuevas: **primero la base y después el código**.

1. **Base de datos** — Supabase → SQL Editor → **+** (consulta nueva) → pega todo
   `supabase/migrations/0009_video_y_redes.sql` → **Run**. Avisará "destructive operation" (cambia una regla de los
   reportes): es normal, toca **Run query**. Debe decir "Success".
   Después, otra consulta nueva con todo `supabase/migrations/0010_buscador.sql` → **Run** → "Success".
2. **Comprobar** (otra consulta nueva, pega y Run). Debe salir una fila con `videos-lugares | true | 52428800`:
   ```sql
   select id, public, file_size_limit from storage.buckets where id = 'videos-lugares';
   ```
   Y el buscador (debe salir una lista, aunque sea vacía, sin error):
   ```sql
   select * from public.buscar_lugares('malecon', 'guayaquil');
   ```
3. **Código** — Claude une la rama `v3-video` a `main` y la sube; Vercel publica solo.
4. **Probar** en la página real, desde el celular: en "Mi negocio" poner Instagram con `@usuario`, subir un video
   corto y verlo en la ficha; desde otra cuenta, "Reportar este video"; en el panel, "Videos". En Ubicación, pegar
   el enlace de «Compartir» de Google Maps (`maps.app.goo.gl/…`). Buscar con un error a propósito ("encebolado").
5. **Espacio:** el plan gratis de Supabase trae 1 GB para archivos (≈ 30 videos). Mirar el uso en Supabase →
   Settings → Usage → Storage. Cuando se acerque, pasar a Supabase Pro (ver precios ese día).
