# Mi Lindo Ecuador — Plan de la versión 7: fotos, descripción y lugares turísticos buenos

> Pedido del usuario del 2026-10-28: "que estas secciones tengan también fotos y una descripción" y "una API gratuita
> que nos genere lugares ya existentes como una guía, con fotos, videos, descripción y cómo llegar". Condición del
> usuario: **"no queremos llenar de basura, solo lugares buenos"**; él también irá buscando y sugiriendo lugares.
> Estado: **aprobado por el usuario el 2026-10-28** ("claro encargate"). Fases 29 a 31.
> **Sin librerías nuevas:** todo con `fetch` desde el servidor, igual que Paumi y el agente.

## La idea en una línea

Las fotos y descripciones salen de **Wikimedia** (Wikidata, Wikipedia en español y Wikimedia Commons), que es gratis y
permite usarlas dando el crédito. El **agente** de la versión 6 revisa cada lugar con un criterio estricto y **solo
pasa lo bueno**. Videos de YouTube al final y aparte.

## Regla de calidad: solo lugares buenos (no negociable)

1. **Mejor pocos y buenos que muchos y vacíos.** Un lugar nuevo solo se publica si tiene **foto real, descripción y
   ubicación** y el agente lo recomienda. Sin foto o sin descripción, no entra (se queda "por revisar").
2. **Nada de fotos de relleno:** no se ponen imágenes genéricas ni fotos de otro lugar. Si un lugar ya publicado no
   tiene foto buena, se queda como está hoy.
3. **Cero inventos:** la descripción sale del texto de Wikipedia. Claude Haiku solo la **acorta** a 1–2 frases con lo
   que dice ese texto; si el texto no alcanza, no hay descripción. Nunca escribe datos que no estén en la fuente.
4. **El mismo lugar, seguro:** la foto y el texto solo se usan si el enlace a Wikidata viene de OpenStreetMap o si el
   lugar de Wikidata está a menos de 300 m y con nombre parecido (las reglas del agente). Si hay duda, no se usa.
5. **Licencias:** solo fotos con licencia libre (dominio público, CC0, CC BY, CC BY-SA). Cada foto muestra su autor y
   licencia; cada descripción, "Texto: Wikipedia (CC BY-SA 4.0)" con su enlace. Se guarda la fuente de todo.
6. **Lo de terceros es dato, no órdenes:** textos de Wikipedia y nombres de OpenStreetMap van marcados como datos en
   el pedido a Claude y la respuesta se valida con Zod (igual que en la fase 27).
7. **Se puede deshacer:** foto y descripción se pueden quitar o cambiar desde el panel; nada se borra solo.

## Fase 29 · Foto y descripción para los lugares publicados

- **29.1 Base de datos (0020):** en `city_spots`: `wikidata` (Q…), `photo_path` (copia de la foto en NUESTRO bucket),
  `photo_credit` (autor), `photo_license`, `photo_source` (enlace a Commons), `description` (≤300), `description_source`
  (enlace a Wikipedia). Lectura pública solo de lo publicado (como hoy); escribe solo el servidor. Pruebas RLS.
- **29.2 Guardar el enlace de OpenStreetMap:** al importar, guardar las etiquetas `wikidata` y `wikipedia`; volver a
  traer los lugares para completar los que ya existen (sin cambiar su estado).
- **29.3 Buscar foto y texto** (`src/lib/wikimedia.ts`, botón "Buscar fotos y descripción" en `/admin/guia`):
  - con el Q de Wikidata: la foto principal (P18) en Commons con su autor y licencia, y el artículo de Wikipedia en
    español; si no hay enlace, se busca en Wikidata por nombre cerca del lugar y se aplica la regla 4;
  - la foto se **copia** a nuestro bucket (la página sigue sin cargar imágenes de otros sitios: la política de
    seguridad no cambia), en tamaño web;
  - Claude Haiku acorta el texto (regla 3) y dice si la foto corresponde al lugar por su descripción en Commons;
  - pedidos con nombre propio de la página en `User-Agent` y despacio, como pide Wikimedia.
- **29.4 Mostrarlo:** en "Más lugares para conocer" y en Explorar, cada tarjeta con foto (texto alternativo con el
  nombre), las 1–2 frases y el crédito; "Cómo llegar" como hoy. Revisión a 390 px y escritorio, claro y oscuro.
- **Puerta:** los lugares publicados con enlace a Wikidata muestran foto y descripción correctas; ninguno muestra
  una foto equivocada (revisión de todos uno por uno por Claude, con muestra al usuario).

## Fase 30 · Lugares turísticos buenos que ya existen

- **30.1 Candidatos desde Wikidata:** lugares turísticos "ubicados en" Guayaquil, Samborondón o Durán (museos, parques,
  monumentos, iglesias históricas, malecones, miradores, reservas…). Solo entran como candidatos los que tienen
  **foto, artículo en Wikipedia y coordenadas**. Llegan "por revisar"; nunca se publican solos.
- **30.2 Agente con criterio estricto:** las reglas de la fase 27 (duplicados con lo que ya hay) + Claude Haiku con la
  regla de calidad de arriba. Recomienda publicar solo lo que un visitante de verdad querría conocer.
- **30.3 Sugerencias del usuario:** en `/admin/guia`, "Agregar un lugar" pegando su enlace de Wikipedia, Wikidata o
  OpenStreetMap: se trae nombre, ubicación, foto y descripción, y pasa por el mismo agente.
- **Puerta:** los lugares nuevos publicados tienen foto, descripción, crédito y "Cómo llegar"; cero duplicados.

## Fase 31 · Videos (después, opcional)

- Un video de YouTube por lugar destacado, elegido con la API de YouTube (gratis: 10 000 unidades al día; cada búsqueda
  gasta 100, unas 100 búsquedas diarias). Claude propone el video y se publica solo si es del lugar y de una fuente
  seria (municipio, turismo, medios). Se muestra con `youtube-nocookie.com` y solo después de un clic (privacidad).
- Necesita: una clave de Google que crea el usuario (se guarda solo en Vercel) y permitir YouTube en la política de
  seguridad (`frame-src`). Por eso va aparte y se aprueba al llegar.

## Lo que NO se hace y por qué

- **Google Places:** buenas fotos, pero sus reglas no permiten guardarlas (hay que pedirlas cada vez) y cobra después
  de 1000 fichas al mes (20 $ por cada 1000). [Google](https://developers.google.com/places/web-service/place-photos)
- **Fotos o textos copiados de otras páginas** (blogs, TripAdvisor, Instagram): no tenemos permiso.
- **Textos escritos por la IA sin fuente:** pueden traer datos falsos (horarios, historia) y eso es basura.

## Costo

Wikimedia: gratis. Claude Haiku 5.5 para acortar textos y revisar: menos de 1 $ para unos cientos de lugares.
Espacio en Supabase: fotos en tamaño web (unos 150 KB), unos 30 MB por cada 200 lugares.
