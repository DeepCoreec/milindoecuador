# Mi Lindo Ecuador — Plan de la versión 12: más fotos y más información de cada lugar

> Pedido del usuario del 2026-10-31 (12:21): "aún hay lugares que no tienen fotos y me gustaría que los lugares tengan
> más fotos […] agrega más info al entrar […] que tenga para ver más fotos de un mismo lugar y una flechita para mover
> a la siguiente foto o volver". Propuesta de Claude aprobada por el usuario el **2026-10-31 12:24** ("sí, me parece
> bien, hazlo así"). Fase 40. Sin librerías nuevas; **una migración** (0022) que aplica el usuario en Supabase.

## Fase 40 · Galería y más información

- **40.1 Base:** tabla `city_spot_photos` (hasta 8 fotos más por lugar, de Commons con su crédito o propias), y en
  `city_spots` un párrafo de Wikipedia y datos rápidos de Wikidata. Solo escribe el servidor; el público lee lo publicado.
- **40.2 Más fotos de Wikimedia Commons:** de la carpeta (categoría) del lugar en Commons y de sus fotos en Wikidata,
  hasta 6 por lugar, solo con licencia libre y buen tamaño, copiadas a nuestro almacenamiento con su crédito. Botón en
  el panel ("Traer más fotos"), por tandas. Claude revisa y quita las que no sirven (delegado por el usuario).
- **40.3 Fotos propias desde el panel:** el admin sube fotos de un lugar de la guía (WebP, sin datos del celular), con
  una descripción corta; puede borrarlas.
- **40.4 Galería con flechas:** en la página de cada lugar, la foto grande con flechas para pasar a la siguiente o volver,
  "2 de 6", deslizar con el dedo y flechas del teclado; el crédito de cada foto debajo.
- **40.5 Más información:** "Sobre el lugar" con un párrafo de Wikipedia (con su crédito) y "Datos rápidos" de Wikidata
  cuando existan (inauguración, superficie, patrimonio); la página oficial va en "Antes de ir".
- **40.6 Horario, web y teléfono** (pedido del usuario del 2026-10-31 13:48: "en todos los lugares no hay horarios ni la
  página web […] al menos ponle el horario para tener noción, y la página web de cada lugar"): botón en el panel que los
  completa desde OpenStreetMap (por el Q de Wikidata o el id; solo llena lo que falta) y formulario en «Fotos y datos
  del lugar» para ponerlos a mano desde fuentes oficiales. El aviso "confírmalo antes de ir" se mantiene.
- **40.7 Completar todos los lugares visibles** (pedido del usuario del 2026-10-31 15:35: "haz que todos los visibles
  tengan información […] busca fotos en Wikimedia de los que no tenían […] ayúdate con otras IAs y busca información
  extra pero cierta"): tres investigadores independientes buscan horario, web, teléfono, una frase y fotos libres de
  Commons, siempre con fuente; en el panel se agregan fotos de Commons por su enlace (la primera pasa a principal si no
  hay), se puede pasar una foto de Commons a principal y se edita la frase de la guía junto al horario.
- **No se hace:** copiar fotos de Google, Instagram o TripAdvisor (tienen dueño).
- **Puerta:** un lugar con varias fotos se recorre con las flechas en el celular y en la computadora; las fotos llevan
  su crédito; RLS probado; revisión de seguridad independiente sin hallazgos altos.
