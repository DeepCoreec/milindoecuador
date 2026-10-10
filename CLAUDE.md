# Mi Lindo Ecuador — instrucciones para Claude

Guía de Guayaquil: restaurantes, hoteles, lugares turísticos, sitios para hacer ejercicio y para pasear,
con reseñas y contacto por WhatsApp. Dueño del proyecto: DeepCore (Ecuador). Idioma del proyecto: español.

## 1. Al empezar CADA sesión (obligatorio, antes de tocar código)

1. Lee `docs/PROGRESO.md` completo: dice la fase actual, el último paso terminado y el siguiente.
2. Ejecuta `git status` y `git log --oneline -10`.
   - Si hay cambios sin commit, la sesión anterior se cortó a mitad de un paso (por ejemplo, se fue la luz).
     Revisa esos cambios con `git diff`, dile al usuario qué encontraste y pregúntale si los terminas o los descartas.
3. Lee la sección de `docs/ARQUITECTURA.md` que toque al paso siguiente.
4. Resume al usuario en 3 líneas: dónde quedamos, qué sigue y qué vas a hacer ahora. Espera su "ok" antes de empezar.

Este proyecto usa Next.js 16: lee también `AGENTS.md` y la documentación en `node_modules/next/dist/docs/` antes de escribir código.

## 2. Reglas de trabajo

- **Un paso a la vez.** Trabaja solo en el paso que dice `docs/PROGRESO.md`. No adelantes trabajo de otras fases.
- **Nada fuera del plan.** Si algo no está en `docs/PLAN.md`, `docs/PLAN-V2.md`, `docs/PLAN-V3.md`, `docs/PLAN-V4.md` o `docs/ARQUITECTURA.md`, no lo agregues.
  Anótalo en la sección "Ideas para después" de `docs/PROGRESO.md` y sigue.
- **Sin librerías nuevas sin permiso.** Las permitidas están en `docs/ARQUITECTURA.md`. Para cualquier otra, pregunta primero.
- **Puertas de fase.** Una fase solo se cierra cuando se cumple su puerta (ver `docs/PLAN.md`) y el usuario la aprueba.
- **Explica simple.** El usuario está aprendiendo: al terminar cada paso, explica en pocas líneas qué hiciste y por qué.

## 3. Guardar el avance (para no perder nada si se corta la sesión)

Después de CADA paso terminado, en este orden:

1. Verifica: `npm run lint`, `npm run typecheck` y `npm test` sin errores (cuando existan).
2. Actualiza `docs/PROGRESO.md`: marca el paso con `[x]`, escribe la fecha y una línea de lo hecho,
   y deja escrito el **siguiente paso** de forma que otra sesión pueda empezarlo sin preguntar.
3. Haz commit: `git add -A && git commit -m "fase N: <qué se hizo>"`.
4. Si el repositorio remoto está configurado: `git push`.

Commits pequeños y frecuentes: un corte de luz solo debe perder, como mucho, el paso en curso.
Si una tarea es larga, divídela en sub-pasos en `docs/PROGRESO.md` y haz commit de cada uno.

## 4. Seguridad (no negociable)

- Nunca escribas claves en el código ni en archivos que vayan a git. Solo en `.env.local` (ignorado por git) y en Vercel.
- En el navegador solo puede ir `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  `SUPABASE_SERVICE_ROLE_KEY` solo se usa en `src/lib/supabase/admin.ts`, que importa `server-only`.
- Toda tabla nueva lleva Row Level Security y sus políticas en una migración de `supabase/migrations/`.
  Nunca cambies la base desde el panel de Supabase sin dejar la migración.
- Todo dato que llega de un formulario se valida con Zod en el servidor, aunque ya se validó en la página.
- Prohibido `dangerouslySetInnerHTML` con contenido de usuarios. Prohibido armar SQL concatenando texto.
- Las acciones de admin verifican el rol en el servidor en cada llamada, no solo en la página.
- Si el usuario pega una clave secreta en el chat, avísale que debe regenerarla.
- Antes de cada lanzamiento, repasa **las 20 reglas** de `docs/ARQUITECTURA.md` §7 (y la skill `shipping-and-launch`)
  y actualiza su estado. Para revisar seguridad usa la skill `security-and-hardening` y un revisor independiente.

## 5. Diseño

- El diseño aprobado manda: no inventes colores, tamaños ni componentes fuera del sistema de diseño (`docs/DISENO.md`).
- Usa las skills `frontend-design` y `frontend-ui-engineering` para cualquier trabajo visual.
- Mobile first: cada pantalla se revisa a 390 px de ancho y en escritorio, en modo claro y oscuro.
- Accesibilidad: contraste suficiente, foco visible, textos alternativos en fotos, formularios con etiquetas.

## 6. Comandos

```bash
npm run dev        # servidor local en http://localhost:3000
npm run build      # compilación de producción
npm run lint       # revisión de estilo
npm run typecheck  # revisión de tipos (genera los tipos de rutas y corre tsc)
npm test           # pruebas unitarias + pruebas de reglas de seguridad
npm run test:e2e   # flujos completos en navegador (necesita la página levantada y Supabase; ver tests/e2e)
npm run tokens     # regenera src/app/tokens.css si cambian los colores aprobados
```

## 7. Documentos del proyecto

- `docs/PLAN.md` — versión 1: qué se construye, fases y puertas (resumen del plan aprobado).
- `docs/PLAN-V2.md` — versión 2 (dueños, cómo llegar, moderación automática, extras): fases 6 a 10.
- `docs/PLAN-V3.md` — versión 3 (video y redes, mapas y buscador, seguridad, Paumi el chatbot): fases 11 a 16.
- `docs/PLAN-V4.md` — versión 4 (diseño más llamativo y profesional): fases 17 a 21.
- `docs/ARQUITECTURA.md` — carpetas, rutas, tecnologías y convenciones.
- `docs/PROGRESO.md` — bitácora: dónde estamos y qué sigue. **Se actualiza en cada paso.**
- `docs/DISENO.md` — sistema de diseño (se crea en la fase 0).
- `docs/PUESTA-EN-MARCHA.md` — pasos para conectar Supabase, Vercel, Turnstile y GitHub reales.
- `supabase/migrations/` — la base de datos completa, en orden.
