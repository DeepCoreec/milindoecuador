# Progreso de Mi Lindo Ecuador

> Bitácora del proyecto. Claude la lee al iniciar cada sesión y la actualiza al terminar cada paso.
> Formato de un paso terminado: `- [x] 1.3 Descripción — 2026-10-07: una línea de lo hecho`.

## Estado actual

- **Fase actual:** 0 · Plan y diseño
- **Último paso terminado:** 0.2 Esquema técnico escrito (CLAUDE.md, ARQUITECTURA.md, migración SQL probada)
- **Siguiente paso:** 0.3 Elegir 3 a 5 páginas de referencia de diseño con el usuario
- **Bloqueos / esperando al usuario:** decisiones pendientes de `docs/PLAN.md` (nombre, inicio de sesión, moderación, WhatsApp)

## Fase 0 · Plan y diseño

- [x] 0.1 Plan del proyecto escrito y revisado con el usuario — 2026-10-05
- [x] 0.2 Esquema técnico: CLAUDE.md, ARQUITECTURA.md, PROGRESO.md y migración SQL probada — 2026-10-05
- [ ] 0.3 Referencias de diseño: el usuario elige 3 a 5 sitios y anotamos qué tomar de cada uno
- [ ] 0.4 Sistema de diseño: logo, colores, tipografías, espaciados y componentes → `docs/DISENO.md`
- [ ] 0.5 Maquetas en celular y computadora: inicio, categoría, ficha, registro de negocio, panel admin
- [ ] 0.6 Respuestas a las decisiones pendientes del plan
- **Puerta:** el usuario aprueba las maquetas.

## Fase 1 · Base técnica

- [ ] 1.1 Crear proyecto Next.js con TypeScript estricto, ESLint, Tailwind y shadcn/ui; scripts `typecheck` y `test`
- [ ] 1.2 Conectar GitHub (`deepcoreec/milindoecuador`), activar Dependabot y protección de la rama `main`
- [ ] 1.3 Crear proyecto en Supabase, instalar Supabase CLI y aplicar `0001_esquema_inicial.sql`
- [ ] 1.4 Clientes de Supabase (`server.ts`, `client.ts`, `admin.ts`) y `proxy.ts` para refrescar la sesión
- [ ] 1.5 Cabeceras de seguridad (CSP y otras) en `next.config.ts`
- [ ] 1.6 Pruebas automáticas de las reglas de seguridad (visitante, usuario, admin)
- [ ] 1.7 Conectar Vercel con variables de entorno y publicar una página de prueba
- **Puerta:** las pruebas de reglas de seguridad pasan.

## Fase 2 · Catálogo público

- [ ] 2.1 Componentes base del sistema de diseño (botón, tarjeta, buscador, estrellas, insignias)
- [ ] 2.2 Página de inicio
- [ ] 2.3 Página de ciudad y de categoría con filtros (sector y precio)
- [ ] 2.4 Ficha de lugar con fotos, WhatsApp y "Cómo llegar"
- [ ] 2.5 Buscador `/buscar`
- [ ] 2.6 Enlaces para compartir: metadatos Open Graph e imagen por lugar; botones de compartir
- [ ] 2.7 `sitemap.ts` y `robots.ts`
- [ ] 2.8 Cargar 20 lugares reales con fotos propias (datos en `supabase/seed.sql` o desde el panel)
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
