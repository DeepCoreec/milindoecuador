# Auditoría de ciberseguridad · 9 de octubre de 2026

> Pedida por el usuario ("análisis de ciberseguridad en todos los aspectos posibles").
> Hecha con la skill `security-and-hardening` y **4 revisores independientes** (agentes que no escribieron el código),
> cada uno en un frente, con **ataques reales** contra la copia de prueba (base, API de Supabase, Storage, Auth y la página).
> Rama revisada: `v3-video` (versión 3, fases 11 a 13). Arreglos en la migración `0013_auditoria.sql` y en el código.

## Resumen

- **Críticas: 0.** **Altas: 1** (las copias de la base en un repositorio público). **Medias: 6.** **Bajas: ~10.**
- Ningún ataque logró: leer datos privados de otra persona, tocar el negocio de otro, hacerse admin, ejecutar código en la
  página (XSS), subir archivos donde no debía, saltarse el captcha de las reseñas ni la regla "solo lo publicado se ve".
- **SSH:** el proyecto no usa SSH. No hay servidores propios: Vercel y Supabase son servicios administrados y todo va por
  HTTPS y por las cuentas del dueño. Por eso la seguridad de esas **cuentas** (verificación en dos pasos) es clave.

## Hallazgos y estado

| # | Severidad | Frente | Hallazgo | Estado |
| --- | --- | --- | --- | --- |
| 1 | **Alta** | Operación | El repositorio de GitHub es **público** y el flujo de copias guarda la copia de la base (con la tabla de cuentas) como archivo descargable por cualquiera con cuenta de GitHub; solo la protege la contraseña de cifrado. Además `main` no está protegida | **Arreglado en parte:** la copia ya no incluye sesiones ni tokens, exige una contraseña de 25+ caracteres y la pasa sin mostrarla. **Falta (usuario):** hacer el repositorio **privado** y proteger `main` |
| 2 | Media | Base | El nombre visible al **crear la cuenta** no pasaba por el filtro de palabras (sí al editar) y se podía usar "Admin" o "Soporte Mi Lindo" | **Arreglado** (0013): al crear queda "Visitante"; al editar se rechaza; nombres reservados bloqueados |
| 3 | Media | Servidor | Cualquiera podía llenar el panel "Errores" mandando pedidos mal formados, con texto elegido por él | **Arreglado:** esos pedidos no se anotan y el texto entre comillas se tapa |
| 4 | Media | Servidor | Varias solicitudes de negocio al mismo tiempo pasaban el límite de 3 pendientes | **Arreglado** (0013): límite en la base con candado |
| 5 | Media | Privacidad | La política de privacidad no contaba todo (copias de 90 días, huella de visitas, registro de errores, GitHub, favoritos, negocios) | **Arreglado:** política actualizada; las solicitudes rechazadas se borran solas a los 180 días (0013). **Falta (usuario):** datos legales en `src/lib/legal.ts` y revisión de un abogado |
| 6 | Media | Operación | Las fotos y videos (Storage) no tienen copia de seguridad | **Aceptado por ahora** (anotado en "Ideas para después") |
| 7 | Media | Navegador | La CSP permite scripts en línea (`'unsafe-inline'`): hoy no hay ningún XSS, pero si apareciera uno, la CSP no lo frenaría | **Aceptado por ahora:** pasar a nonce vuelve dinámicas las páginas (más lentas). Anotado para hacerlo en las páginas privadas |
| 8 | Baja | Servidor | Un carácter raro en `?siguiente=` daba error 500 al entrar | **Arreglado:** solo caracteres normales de ruta |
| 9 | Baja | Servidor/Navegador | Fotos y videos se registraban sin mirar su contenido real (solo el tipo declarado) | **Arreglado:** se revisa la firma de los primeros bytes (WebP, JPEG, MP4/MOV, WebM) |
| 10 | Baja | Servidor | La misma foto se podía registrar dos veces | **Arreglado** (0013): camino único |
| 11 | Baja | Supply chain | La clave de servicio se usaba fuera de `admin.ts` (huella de visitas) | **Arreglado:** clave derivada dentro de `admin.ts` |
| 12 | Baja | CI | La acción de GitHub fijada por etiqueta y contraseña visible en procesos | **Arreglado:** fijada por SHA, Dependabot también vigila las acciones, contraseña por la entrada estándar |
| 13 | Baja | Docs | El correo del admin estaba escrito en la bitácora pública | **Arreglado** (sigue en el historial de git) |
| 14 | Baja | Base | Permisos de columna de sobra para `authenticated` en `places` (status, verificado, destacado) y `profiles.role` | **Aceptado:** el admin edita con su sesión y las reglas RLS + el disparador de rol bloquean a los demás (probado) |
| 15 | Baja | Servidor | Límite de visitas: la huella usa la IP que pone Vercel (fuera de Vercel se podría falsificar); convertir enlaces cortos no tiene límite por día | **Aceptado** (solo en Vercel; solo dueños o admin convierten enlaces) |
| 16 | Baja | Supply chain | `npm audit`: 5 avisos altos **solo en herramientas de desarrollo** (lint); 0 en lo que llega a producción | **Aceptado:** esperar el parche de `eslint-config-next` (no usar `audit fix --force`) |
| 17 | Info | Auth | El captcha y los límites de Supabase Auth se activan en su panel | **Usuario:** confirmar en Supabase → Authentication → Attack Protection |

## Lo que resistió (resumen)

- **Base y API directa:** tablas privadas (solicitudes con WhatsApp, reportes, estadísticas, errores, huellas, favoritos
  ajenos), columnas ocultas (dueño, rol, tamaño de video), borradores, escritura directa de lugares/reseñas/videos,
  funciones internas, Storage sin permiso firmado, buscador con 20 000 caracteres (17 ms).
- **Servidor:** dueño contra negocio ajeno (todas las acciones), usuario normal contra acciones de admin, CSRF
  (Server Actions y `/api/evento`), ocultar un negocio con cuentas nuevas, límite de 5 reseñas al mismo tiempo,
  redirecciones a otros sitios, SSRF del enlace corto, caché con datos privados.
- **Navegador:** XSS guardado y reflejado en todas las pantallas (nombre, reseñas, respuestas, fichas, enlaces, búsqueda,
  panel), enlaces `javascript:`/`data:`, clickjacking, cookies de sesión `httpOnly`, ninguna clave en el código del navegador.
- **Supply chain:** un solo lockfile, ningún secreto en los 87 commits, `.env*` ignorado, flujo de copias con permisos mínimos.

## Lo que tiene que hacer el dueño (ordenado por importancia)

1. **GitHub → repositorio → Settings → General → Danger Zone → Change visibility → Private.** (Vercel sigue funcionando.)
2. **Verificación en dos pasos** en GitHub, Vercel, Supabase, Google (la cuenta admin y la de Google Cloud) y Cloudflare.
3. **GitHub → Settings → Branches → regla para `main`:** sin force push y sin borrar.
4. **GitHub → Settings → Code security:** activar Dependabot alerts y security updates.
5. Cuando se activen las copias: `CLAVE_COPIAS` de 25+ caracteres al azar, guardada también fuera de GitHub.
6. Supabase → Authentication → Attack Protection: captcha (Turnstile) activado.
7. Completar `src/lib/legal.ts` (razón social, RUC, correo) y pedir revisión de un abogado.
8. Revisar quién tiene acceso en GitHub, Vercel y Supabase (solo tú).
