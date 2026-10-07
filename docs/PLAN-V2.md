# Plan de Mi Lindo Ecuador — Versión 2 (PROPUESTA)

> Estado: **propuesta del 2026-10-06, falta la aprobación del usuario.** No se programa nada de aquí hasta que la apruebe.
> Se construye encima de la versión 1 (`docs/PLAN.md`), con las mismas reglas de trabajo, seguridad y diseño de `CLAUDE.md`.

## Idea central

Que **los dueños manejen su propio negocio** en la página y que la gente llegue al lugar **con un toque**,
sin que el admin tenga que aprobar cada cambio y **sin pagar servicios extra**.

## Decisiones tomadas (2026-10-06)

| Decisión | Respuesta |
| --- | --- |
| Mapas | Solo enlaces a **Google Maps** (y Waze). Sin API de pago ni tarjeta. No hay mapa dibujado dentro de la página |
| Quién llena las fichas | **El dueño del negocio**, desde su cuenta |
| Cambios de los dueños | **Se publican al instante.** Un filtro automático revisa el texto antes de guardar; el admin revisa después, cuando quiera |
| Fotos por negocio | Hasta 15 (pedido del usuario, 2026-10-06) |
| Costo | 0 $ al mes en servicios (salvo el dominio, ~10–15 $ al año) |

## Decisión pendiente (la pregunta del 2026-10-06)

| Pregunta | Recomendación de Claude |
| --- | --- |
| ¿El admin aprueba el **negocio nuevo** una sola vez (un clic) antes de que salga, o sale directo? | Aprobar **solo el alta** del negocio (un clic, una vez). Evita negocios falsos y copias de negocios ajenos. Después, todos los cambios del dueño salen al instante |

| ¿Agregar **correo con contraseña** al entrar? | Sí, junto con Google (ver respuesta del 2026-10-06). Pendiente de confirmar |

## Problemas conocidos de la versión 1

- "Entrar con Google" da error: falta configurar el proveedor Google en Supabase (Google Cloud → cliente OAuth). Es configuración, no código

## Funciones nuevas

1. **Cómo llegar con ruta.** La ficha guarda la ubicación exacta (latitud y longitud). El botón "Cómo llegar"
   abre Google Maps (o Waze) en el teléfono **con la ruta ya trazada** desde donde está la persona.
   Para marcar la ubicación, sin API de pago:
   - "Usar mi ubicación actual" (el dueño lo toca estando en su local), o
   - pegar las coordenadas que da Google Maps al dejar presionado un punto.
2. **Cuenta de dueño.** La solicitud de negocio se hace con la cuenta del dueño. Al aprobarse, esa cuenta queda
   como dueña de ese negocio (y solo de ese).
3. **"Mi negocio".** Página donde el dueño edita su ficha: descripción, horario, precio, sector, WhatsApp,
   ubicación y fotos (hasta 15, se guardan comprimidas en WebP), y responde las reseñas. Lo que guarda sale al instante.
4. **Moderación automática (el "bot").** Antes de guardar cualquier texto (fichas, reseñas, respuestas):
   - lista de palabras prohibidas en español de Ecuador (groserías, insultos, contenido sexual), que el admin puede ampliar;
   - bloquea enlaces y números de teléfono dentro de los textos (evita spam y estafas);
   - límites por cuenta (cuántos cambios y fotos por día).
   Las fotos: solo se revisa formato y tamaño (revisar el contenido de una foto automáticamente cuesta dinero).
   Para las fotos se usan los reportes de la gente.
5. **Revisión después, no antes.** En el panel, una lista "Cambios recientes" para que el admin revise cuando quiera
   y pueda ocultar una ficha o foto con un clic. Con 3 reportes, una foto o ficha se oculta sola hasta que el admin la vea.
   Botón "Reportar este lugar" en cada ficha.

## Fases y puertas

| Fase | Entrega | Puerta para pasar a la siguiente |
| --- | --- | --- |
| 6 · Dominio y correo | Dominio propio en Vercel, correo con Resend en Supabase, correo del enlace en español | Una persona que no es el admin entra con su correo |
| 7 · Cómo llegar | Ubicación exacta en la base y en el formulario; botón con ruta a Google Maps y Waze | Desde el celular, "Cómo llegar" abre la ruta correcta en 3 lugares reales |
| 8 · Cuentas de dueño | Solicitud con cuenta, rol de dueño, reglas de seguridad (cada dueño solo toca su negocio) | Pruebas de seguridad: un dueño no puede editar un negocio ajeno |
| 9 · Mi negocio y moderación | Editor del dueño, fotos, respuestas a reseñas, filtro de palabras, límites, "Cambios recientes", reportes de fichas | 3 negocios reales llenan su ficha solos y el filtro bloquea las palabras de prueba |

La fase 6 va primero porque sin correo propio nadie más que el admin puede entrar.
La puerta de la fase 2 de la versión 1 (20 lugares con fotos) se puede cumplir con fichas llenadas por los dueños.

## Fuera de la versión 2

Mapa dibujado dentro de la página (API de pago), navegación paso a paso propia, revisión automática de fotos,
pagos automáticos, apps en tiendas, otras ciudades, inglés, grupos para salir juntos.
