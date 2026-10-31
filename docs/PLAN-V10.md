# Mi Lindo Ecuador — Plan de la versión 10: más calidad antes de abrir a los negocios

> Pedido del usuario del 2026-10-30 (23:17): "enfoquémonos en mejorar la calidad de la página; consulta con otras IAs
> para guiarte de sus ideas y luego aplícalo consultándome". Claude puso a tres revisores independientes (diseño,
> contenido y confianza, técnico) a revisar la página sin cambiar nada; juntó sus ideas, quitó las repetidas y las que
> van contra decisiones del usuario, y le presentó la lista. Estado: **aprobado por el usuario el 2026-10-31 00:14**
> ("me parece"). Fases 36 a 38. **Sin librerías nuevas ni migraciones.**

## Decisiones del usuario

- **"Recomendados" pasa a "Destacados"**, con la nota "Negocios que pagan por salir aquí" (lo pagado se dice claro).
- **Precio por rangos por persona** en vez de solo "$ / $$ / $$$": $ menos de 10 $, $$ de 10 a 25 $, $$$ más de 25 $
  (números propuestos por Claude y aprobados; se pueden ajustar).
- **Datos legales** (nombre o razón social, RUC, correo) en Términos y Privacidad: los da el usuario (paso 35.6).

## Descartado (y por qué)

- Lugares turísticos en la portada cuando nadie paga Destacado: el usuario pidió que no aparezca nada (versión 8).
- Accesibilidad y formas de pago en la ficha: necesita migración y no está en ningún plan → "Ideas para después".
- Vista previa de una ficha de ejemplo en el registro, categorías en el menú del celular y "datos actualizados el…":
  poco valor para su costo por ahora.

## Fase 36 · Rápida y sólida (técnico; no cambia lo que se ve)

- **36.1** La ficha y los eventos no descargan la librería de validación: los motivos de reporte van a un archivo sin Zod
  (hoy la ficha baja 289 KB de código frente a 191 KB del resto).
- **36.2** Páginas de Guayaquil guardadas unos minutos (`generateStaticParams` + revalidación); lo personal de la ficha
  (mi reseña, guardado) se carga aparte.
- **36.3** Páginas de error y de "cargando" en español con el diseño de la guía (raíz y ciudad).
- **36.4** Imagen al compartir por WhatsApp en todas las páginas; eventos con su afiche, fichas con su foto (y en caché).
- **36.5** Google: cada página con su canonical propio (hoy varias dicen ser la portada), `noindex` en "Publica un
  evento", `/buscar` sin bloqueo en robots (solo `noindex`), fechas en el sitemap y datos estructurados JSON-LD
  (LocalBusiness y Event).
- **36.6** Paumi se descarga solo cuando alguien la toca.
- **36.7** "Saltar al contenido" para teclado y enlaces del pie de 44 px de alto.
- **Puerta:** lint, tipos y pruebas sin errores; la ficha pesa menos que hoy; errores en español; medido con Playwright.

## Fase 37 · Retoques visuales (dentro de `docs/DISENO.md`)

- **37.1** Ficha sin foto: la ilustración de la categoría en vez de la caja "Foto principal del lugar".
- **37.2** Tarjetas sin foto más bajas en computadora.
- **37.3** Guía útil: secciones vacías escondidas; todos los títulos con la misma letra.
- **37.4** Detalles: cabecera alineada con el contenido; comillas « » bien en títulos; sin hueco doble en la portada;
  pista de que la fila de categorías se desliza; "Cómo llegar" sin repetirse en la ficha; insignias en su línea.
- **Puerta:** revisado a 390 px y en computadora, claro y oscuro.

## Fase 38 · Para que los negocios se registren

- **38.1** "Continuar con Google" en Crear cuenta (hoy solo ofrece correo, y el correo aún no está listo: el dueño se
  queda atascado). **Se hace primero** por ser lo más urgente.
- **38.2** Registro: "Gratis para siempre. Si quieres salir primero: 1 $ por 7 días", los 3 pasos y contador de letras.
- **38.3** "Mi negocio" ofrece el Destacado (1 $ por 7 días, por WhatsApp) junto a sus visitas; si ya lo tiene, hasta cuándo.
- **38.4** "Verificado" explicado junto al sello.
- **38.5** Textos: "Destacados" en la portada con su nota; reseñas con una pregunta que sirva para cualquier lugar;
  "La historia" → "Sobre el lugar"; "Negocios" y "Sitios de la ciudad" en las categorías; "¿Es tu negocio?
  Adminístralo gratis"; formulario del dueño más claro; precio por rangos.
- **Puerta:** un dueño entiende en segundos cómo registrarse y cuánto cuesta destacar; revisado a 390 px y computadora.
