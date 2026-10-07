# Plan de Mi Lindo Ecuador — Versión 2

> **Aprobado por el usuario el 2026-10-06** ("me parece bien, lo dejo a tu criterio, hazlo"). Las decisiones abiertas las tomó Claude por encargo del usuario.
> Se construye encima de la versión 1 (`docs/PLAN.md`), con las mismas reglas de trabajo, seguridad y diseño de `CLAUDE.md`.
> El avance paso a paso está en `docs/PROGRESO.md`, sección "Versión 2".

## Idea central

Que **los dueños manejen su propio negocio** en la página y que la gente llegue al lugar **con un toque**,
sin que el admin tenga que aprobar cada cambio y **sin pagar servicios extra**.

## Decisiones (2026-10-06)

| Decisión | Respuesta |
| --- | --- |
| Mapas | Solo enlaces a **Google Maps** y **Waze**. Sin API de pago ni tarjeta. No hay mapa dibujado dentro de la página |
| Quién llena las fichas | **El dueño del negocio**, desde su cuenta |
| Alta de un negocio nuevo | El admin la aprueba **una sola vez** con un clic (evita negocios falsos o hacerse pasar por otro) |
| Cambios de los dueños | **Se publican al instante.** Un filtro automático revisa el texto antes de guardar; el admin revisa después, cuando quiera |
| Fotos por negocio | Hasta **15**, comprimidas en WebP (~4 MB por negocio; el plan gratis de Supabase alcanza para ~200 negocios) |
| Cómo se entra | **Google** o **correo y contraseña**. El correo solo se usa para confirmar la cuenta y para recuperar la contraseña (gasta menos correos que el enlace mágico) |
| Botón de Google | Se esconde hasta que Google esté configurado en Supabase (variable `NEXT_PUBLIC_GOOGLE_ACTIVO=si`) |
| Costo | 0 $ al mes en servicios (salvo el dominio, ~10–15 $ al año) |

## Funciones nuevas

1. **Entrar con contraseña.** Crear cuenta con correo y contraseña (confirmación por correo una vez),
   entrar, "Olvidé mi contraseña" y cambiarla desde "Mi cuenta". Con captcha.
2. **Cómo llegar con ruta.** La ficha guarda la ubicación exacta (latitud y longitud). Los botones abren
   Google Maps o Waze en el teléfono **con la ruta ya trazada** desde donde está la persona.
   Para marcar la ubicación, sin API de pago: "Usar mi ubicación actual" (estando en el local) o pegar las
   coordenadas que da Google Maps al dejar presionado un punto.
3. **Cuenta de dueño.** La solicitud de negocio se hace con sesión iniciada. Al aprobarse, esa cuenta queda
   como dueña de ese negocio (y solo de ese).
4. **"Mi negocio".** Página donde el dueño edita su ficha: descripción, horario, precio, sector, WhatsApp,
   ubicación y hasta 15 fotos, y responde las reseñas. Lo que guarda sale al instante.
5. **Moderación automática (el "bot").** Antes de guardar cualquier texto (fichas, reseñas, respuestas):
   - lista de palabras prohibidas en español de Ecuador, que el admin puede ampliar desde el panel;
   - bloquea enlaces y números de teléfono dentro de los textos (evita spam y estafas);
   - límites por cuenta (cambios y fotos por día).
   Las fotos solo se revisan por formato y tamaño (revisar su contenido automáticamente cuesta dinero); para las fotos
   están los reportes.
6. **Revisión después, no antes.** En el panel, "Cambios recientes" para revisar cuando el admin quiera y ocultar una
   ficha o foto con un clic. Botón "Reportar este lugar"; con 3 reportes la ficha se oculta sola hasta que el admin la vea.
7. **Extras (ideas de Claude aprobadas):**
   - "Abierto ahora / Cerrado" según el horario;
   - estadísticas para el dueño: vistas de su ficha y toques a WhatsApp y "Cómo llegar" (ayuda a vender Destacado y Verificado);
   - favoritos: guardar lugares para ir después.

## Fases y puertas

| Fase | Entrega | Puerta para pasar a la siguiente |
| --- | --- | --- |
| 6 · Entrar y correo | Botón de Google escondido hasta configurarlo, entrar con contraseña, dominio propio, correo con Resend, correos en español, Google configurado | Una persona que no es el admin crea su cuenta y entra |
| 7 · Cómo llegar | Ubicación exacta en la base y en el formulario; botones con ruta a Google Maps y Waze | Desde el celular, "Cómo llegar" abre la ruta correcta en 3 lugares reales |
| 8 · Cuentas de dueño | Solicitud con cuenta, dueño de cada negocio, reglas de seguridad | Pruebas de seguridad: un dueño no puede tocar un negocio ajeno |
| 9 · Mi negocio y moderación | Editor del dueño, 15 fotos, respuestas a reseñas, filtro de palabras, límites, "Cambios recientes", reportes de fichas | 3 negocios reales llenan su ficha solos y el filtro bloquea las palabras de prueba |
| 10 · Extras | Abierto ahora, estadísticas para el dueño, favoritos | El usuario los prueba y los aprueba |

El código que no depende de las cuentas del usuario (dominio, Resend, Google) se adelanta mientras tanto y se prueba
con el Supabase de prueba. Las puertas solo se cierran con la página real y la aprobación del usuario.
La puerta de la fase 2 de la versión 1 (20 lugares con fotos) se puede cumplir con fichas llenadas por los dueños.

## Fuera de la versión 2

Mapa dibujado dentro de la página (API de pago), navegación paso a paso propia, revisión automática de fotos,
pagos automáticos, apps en tiendas, otras ciudades, inglés, grupos para salir juntos.
