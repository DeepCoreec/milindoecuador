# Plan de Mi Lindo Ecuador — Versión 3

> **Aprobado por el usuario el 2026-10-09** después de una lluvia de ideas (las decisiones técnicas las delegó en Claude:
> "lo dejo en tus manos pero recuerda todo lo que te dije").
> Mismas reglas de trabajo, seguridad y diseño de `CLAUDE.md`. El avance paso a paso está en `docs/PROGRESO.md`, sección "Versión 3".
> **Orden pedido por el usuario:** primero todo lo demás y al final Paumi (el chatbot).

## Idea central

Que los negocios **se promocionen mejor** (video y redes), que buscar y llegar sea **más fácil**, dejar la base
**más segura y ordenada**, y sumar a **Paumi**: una guacamaya guía que conversa, habla y te lleva a los lugares.

## Mapa de la versión 3 (qué parte pertenece a qué)

| Fase | Bloque | Qué trae |
| --- | --- | --- |
| 11 | **Video y redes del negocio** | 1 video por negocio, enlaces a YouTube, TikTok, Facebook, Instagram y página web |
| 12 | **Mapas y buscador** | Aceptar el enlace corto de Google Maps; buscador dentro de la base de datos |
| 13 | **Seguridad y herramientas** | Cookies `HttpOnly`, límite en el contador de visitas, las 20 reglas en `CLAUDE.md`, 4 skills de Agent Skills |
| 14 | **Paumi · cerebro** | El chatbot por texto: recomienda lugares reales, arma planes, tarjetas con fotos y Google Maps, guía en la página |
| 15 | **Paumi · cara** | La guacamaya en pixel art animado y el cuadro de diálogo retro letra por letra con sonido |
| 16 | **Paumi · voz** | Hablarle y que responda hablando; "manos libres" diciendo su nombre |

---

## Fase 11 · Video y redes del negocio

| Decisión | Respuesta |
| --- | --- |
| Video subido | **1 video por negocio**, lo sube el dueño desde "Mi negocio" (o el admin desde el panel) |
| Aprobación | **Sin aprobación**: sale al instante, como las fotos (decisión del usuario) |
| Protección | 3 reportes de video (de cuentas con 7 días o más) ocultan **solo el video** hasta que el admin lo vea. Panel "Videos": ver los nuevos, ocultar, mostrar o borrar |
| Dónde se guarda | Supabase Storage, bucket `videos-lugares`, con permiso de subida firmado de un solo uso (igual que las fotos del dueño) |
| Límites | MP4, MOV o WebM; hasta **50 MB** (máximo por archivo del plan gratis) y **90 segundos**; 5 videos nuevos al día por cuenta |
| Gasto de datos | Solo se descarga al tocar "play"; antes se ve una portada sacada del mismo video en el navegador |
| Costo | Gratis para probar (1 GB ≈ 30 videos). **Al publicar en serio, Supabase Pro (~25 $/mes)**, sin cambiar el código. Si los videos gastan mucho: Cloudflare R2 (idea para después) |
| Enlaces | YouTube, TikTok, Facebook, Instagram y página web, cada uno en su campo. El servidor comprueba que cada enlace sea de esa red (el de Facebook va a facebook.com). Solo `https://`. Se abren en la app o en otra pestaña, no se incrustan |
| Página web | Muestra solo el nombre del sitio, `rel="noopener noreferrer nofollow"`, pasa por el filtro de palabras |

Puerta: 3 negocios reales suben su video y sus redes, y se ven bien en un Android y en un iPhone.

## Fase 12 · Mapas y buscador

- **Enlace corto de Google Maps:** el dueño puede pegar el `maps.app.goo.gl/...` que da "Compartir". El servidor lo abre
  solo si es de ese dominio (sin seguir saltos a otros sitios), saca las coordenadas del enlace largo y las valida como hoy.
- **Buscador en la base:** búsqueda de texto completo en español dentro de Postgres (sin tildes, tolerante a errores
  de escritura), en vez de traer todos los lugares y filtrar en el servidor. Mismos resultados y orden que hoy, probado.

Puerta: un dueño pone su ubicación pegando el enlace corto; el buscador da los mismos resultados con 500 lugares de prueba y responde rápido.

## Fase 13 · Seguridad y herramientas

- **Cookies de sesión `HttpOnly`:** el panel de admin sube fotos con permiso firmado (como los dueños) y ningún script
  del navegador vuelve a necesitar la sesión. Así las cookies quedan invisibles para cualquier script.
- **Límite en `/api/evento`:** que nadie infle las estadísticas de un negocio (sin guardar la IP: solo una huella diaria cifrada).
- **Las 20 reglas** de seguridad (lista que trajo el usuario el 2026-10-09) como lista de revisión en `docs/ARQUITECTURA.md` §7,
  enlazada desde `CLAUDE.md`, para repasarla antes de cada lanzamiento.
- **4 skills de Agent Skills** (Addy Osmani, MIT) en `.claude/skills/`, después de leerlas enteras:
  `security-and-hardening`, `code-review-and-quality`, `shipping-and-launch`, `observability-and-instrumentation`.
- Con *observability*: avisos cuando la página falla en la vida real (lo que ofrezca gratis Vercel).

Puerta: revisión de seguridad independiente sin fallas altas; las 20 reglas marcadas.

---

## Paumi (fases 14 a 16)

| Decisión | Respuesta |
| --- | --- |
| Nombre | **Paumi** (Paulina + Michael). Escrito en **un solo lugar** del código para poder cambiarlo luego |
| Mascota | **Guacamaya de Guayaquil** (el ave símbolo de la ciudad), dibujo propio en pixel art |
| Cerebro | **Claude Haiku** desde nuestro servidor (la clave de Anthropic solo en Vercel). Librería **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`), aprobada por el usuario el 2026-10-09 solo para Paumi |
| "La IA del usuario" | Descartado: la IA dentro de Chrome no funciona en celulares, y pedir claves a los visitantes es inseguro |
| Costo | ~1 a 2 centavos por pregunta. **Interruptor** `PAUMI_ACTIVO=si` (se construye apagado) y **tope de gasto mensual** en la Consola de Anthropic. Al llegar al tope: "vuelve mañana" |
| No inventar | 1) primero la guía (lugares publicados); 2) si no está, busca en internet **solo en fuentes confiables** (Ministerio de Turismo, municipio, etc.) y **muestra el enlace**; 3) si no encuentra, dice **"no lo sé"** |
| Datos privados | Paumi **nunca recibe** correos, dueños, solicitudes, reportes ni estadísticas: no los puede soltar aunque intenten engañarlo |
| Abuso | Captcha al empezar, límite de mensajes por persona al día, mensajes cortos, sin guardar conversaciones en la base |

### Fase 14 · Paumi · cerebro (texto)

- Saludo: *"¡Hola! Soy Paumi, tu guacamaya guía de Guayaquil. ¿Te recomiendo un lugar o un plan? Dime qué buscas."*
  y explica cómo hablarle (escribiendo, con el micrófono o diciendo "Paumi").
- Herramientas del bot: buscar lugares en la guía (categoría, sector, precio, abierto ahora), ver la ficha de un lugar,
  armar un plan (dónde comer, pasear y dormir), abrir una página de la guía, buscar en fuentes confiables.
- Respuestas con **tarjetas de lugares**: foto, abierto ahora, precio, **"Cómo llegar"** (Google Maps con la ruta) y **"Ver ficha"**.
- **Te guía en la página:** "te llevo a Restaurantes de Urdesa" y la abre.
- Respuestas que aparecen mientras escribe; botón flotante en una esquina para abrir el chat.
- Reglas en Términos y Privacidad: qué es Paumi, que es una IA y puede equivocarse, que Anthropic procesa los mensajes, cómo activarla.

Puerta: 20 preguntas de prueba (incluidas trampas para que invente o suelte datos privados) responden bien; el tope de gasto funciona.

### Fase 15 · Paumi · cara (pixel art y cuadro retro)

- **Guacamaya animada** con estados: esperando (respira, parpadea), escuchando (inclina la cabeza), pensando (mira arriba, "…"),
  hablando (**abre y cierra el pico con cada palabra**), encontró algo (aletea).
- **Cuadro de diálogo retro**: rectángulo con borde pixel art, carita de Paumi y su nombre; texto **letra por letra** con un
  **"blip"** (generado por el navegador, sin archivos); triangulito ▼ para seguir; respuestas largas en varias pantallas.
- Tocar el cuadro **completa el texto**; se **esconde solo** según lo largo del mensaje (no mientras lo tocas);
  **"Ver conversación"** para releer todo; botón 🔊/🔇 que se recuerda.
- Accesible: el lector de pantalla recibe la respuesta completa de una vez; con "reducir movimiento" no se anima. Claro y oscuro.

Puerta: el usuario lo prueba en su celular y lo aprueba.

### Fase 16 · Paumi · voz

- **Hablarle** con el micrófono y que **responda hablando** (voz del teléfono, gratis); el texto sale igual en el cuadro.
- **Manos libres (opcional):** después de tocar "Activar manos libres" y dar permiso al micrófono, se activa diciendo
  **"Paumi"** (acepta parecidos como "Pau mi" o "Pami"). Solo con la página abierta y la pantalla encendida.
- Política de privacidad: el micrófono, y que en Chrome la voz la procesa Google.

Puerta: funciona en un Android y en un iPhone; el usuario lo aprueba.

---

## Fuera de la versión 3 (por ahora)

Voz natural de pago para Paumi (ElevenLabs u otra), Paumi escuchando con la pantalla apagada (solo apps instaladas),
convertir o comprimir video dentro de la página, varios videos por negocio, revisión automática del contenido de videos,
entrar con Facebook, pagos automáticos, apps en tiendas.
