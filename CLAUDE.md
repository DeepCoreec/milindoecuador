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

## 2. Reglas de trabajo

- **Un paso a la vez.** Trabaja solo en el paso que dice `docs/PROGRESO.md`. No adelantes trabajo de otras fases.
- **Nada fuera del plan.** Si algo no está en `docs/PLAN.md` o `docs/ARQUITECTURA.md`, no lo agregues.
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

## 5. Diseño

- El diseño aprobado manda: no inventes colores, tamaños ni componentes fuera del sistema de diseño (`docs/DISENO.md`).
- Usa la skill `frontend-design` para cualquier trabajo visual.
- Mobile first: cada pantalla se revisa a 390 px de ancho y en escritorio, en modo claro y oscuro.
- Accesibilidad: contraste suficiente, foco visible, textos alternativos en fotos, formularios con etiquetas.

## 6. Comandos

```bash
npm run dev        # servidor local en http://localhost:3000
npm run build      # compilación de producción
npm run lint       # revisión de estilo
npm run typecheck  # revisión de tipos (tsc --noEmit)
npm test           # pruebas
```

## 7. Documentos del proyecto

- `docs/PLAN.md` — qué se construye, fases y puertas (resumen del plan aprobado).
- `docs/ARQUITECTURA.md` — carpetas, rutas, tecnologías y convenciones.
- `docs/PROGRESO.md` — bitácora: dónde estamos y qué sigue. **Se actualiza en cada paso.**
- `docs/DISENO.md` — sistema de diseño (se crea en la fase 0).
- `supabase/migrations/` — la base de datos completa, en orden.
