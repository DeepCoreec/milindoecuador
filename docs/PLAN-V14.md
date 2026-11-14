# Mi Lindo Ecuador — Plan de la versión 14: encontrar mejor, fichas que convencen y valor para los dueños

> Sale de la revisión de la página hecha por Claude (Fable) el 2026-11-14, como turista y como dueño de negocio,
> y de las ideas que ya estaban anotadas en `docs/PROGRESO.md`. El usuario pidió estructurarla como plan el 2026-11-14.
> **Borrador: cada fase se empieza solo cuando el usuario apruebe su puerta.**
> Sin librerías nuevas, salvo las que se piden con permiso aquí mismo. Cada migración la aplica el usuario en Supabase.
> Cada fase termina con sus pruebas (unitarias y de RLS si hay migración) y revisión de seguridad independiente.

## Fase 44 · Buscar y encontrar

- **44.1 Buscador que entiende:** hoy «almuerzo» no encuentra nada. Agregar un diccionario de palabras comunes
  (platos, servicios: almuerzo, encebollado, piscina, karaoke, parrillada…) que lleve a la categoría o al filtro
  correcto, sin tildes y con errores comunes de escritura. Vive en el código (como `CATEGORIAS_DICHAS` de Paumi), sin migración.
- **44.2 Sin callejones sin salida:** cuando el buscador no encuentre nada, ofrecer «pregúntale a Paumi» (abre la
  ventana con la búsqueda ya escrita) además de las categorías.
- **44.3 Paumi usa el mismo diccionario** en sus atajos, para que hablar y buscar entiendan lo mismo (0 costo de API).
- **Puerta:** «almuerzo», «donde comer ceviche» y 10 búsquedas reales más llevan a resultados útiles; la búsqueda
  vacía ofrece Paumi; las pruebas unitarias cubren el diccionario.

## Fase 45 · Fichas que convencen (migración 0025)

- **45.1 Base (migración 0025):** en `places`: platos o servicios estrella (hasta 3, nombre y precio opcional),
  accesibilidad (rampa, baño adaptado) y formas de pago (efectivo, tarjeta, transferencia), todo opcional.
  Horario estructurado opcional por día (para la fase 45.4). RLS igual que el resto de la ficha: escribe el servidor.
- **45.2 «Qué pedir»:** el dueño los llena en «Mi negocio» (con el filtro de palabras); la ficha los muestra arriba,
  antes de la historia. En restaurantes y cafés se llama «Qué pedir»; en otras categorías, «Lo más pedido».
- **45.3 Accesibilidad y pago en la ficha:** iconos claros (rampa, tarjeta…) y filtros en la categoría.
- **45.4 «Abierto ahora»:** si el dueño llenó el horario por día, el filtro «Abierto ahora» aparece en categorías,
  en «Cerca de mí» y en el buscador. El horario en texto libre de siempre se mantiene y no es obligatorio.
- **Puerta:** un negocio llena platos, accesibilidad, pago y horario por día; sus filtros funcionan; nada es
  obligatorio y las fichas sin esos datos se ven igual que hoy; RLS probado; revisión sin hallazgos altos.

## Fase 46 · Portada siempre viva y eventos sembrados

- **46.1 Portada sin huecos:** si no hay eventos esta semana, esa sección muestra en su lugar lugares destacados o
  una leyenda de «Guayaquil de misterio» (rotando). El aviso «publica tu evento gratis» se queda, más chico.
- **46.2 Agente de eventos (como el de la Guía útil, fase 27):** propone eventos desde fuentes oficiales y públicas
  (municipio, teatros, centros culturales), con fuente y enlace; **el admin aprueba cada uno** desde el panel.
  Usa la misma clave de Claude Haiku ya configurada. Nada se publica solo.
- **Puerta:** con 0 eventos la portada se ve viva; el agente propone al menos 5 eventos reales con fuente y el
  admin aprueba o rechaza desde el panel; costo del agente medido y anotado.

## Fase 47 · La página trabaja para el dueño (migración 0026)

- **47.1 Base (migración 0026):** contadores **agregados por día** por ficha: vistas y toques al botón de WhatsApp.
  Privacidad: solo números sumados (fecha, ficha, cuántos); **sin IP, sin cuenta, sin nada de la persona**. RLS: los
  lee solo el dueño de la ficha y el admin; escribe el servidor.
- **47.2 «Tu semana» en Mi negocio:** cuántos vieron tu ficha y cuántos tocaron tu WhatsApp, esta semana y la
  pasada. Con una línea que invita al plan Destacado si los números son buenos.
- **47.3 Afiche con QR para pedir reseñas:** botón «Descargar mi afiche» en «Mi negocio»: un PDF listo para
  imprimir con el nombre del negocio y un QR a su ficha («Déjanos tu reseña en Mi Lindo Ecuador»).
  **Pide permiso:** librería chica para el QR (por ejemplo `qrcode`, sin dependencias nativas). El PDF se arma
  con lo que ya hay (una página imprimible), sin librería de PDF.
- **Puerta:** los contadores suman sin guardar datos personales (revisado en la prueba de RLS y en la política de
  privacidad); el dueño ve «Tu semana»; el afiche se descarga y el QR abre la ficha; revisión sin hallazgos altos.

## Fase 48 · «Armar un plan» para compartir por WhatsApp

- **48.1 Armar el plan:** desde una ficha o un lugar de la guía: elegir fecha y hora (y opcionalmente otra parada).
  Sin cuenta y sin guardar nada en la base: el plan viaja en el enlace (parámetros firmados ligeros o solo parámetros
  validados con Zod).
- **48.2 La tarjeta:** el enlace abre una página del plan (foto, nombre, fecha, hora, mapa de cómo llegar) con
  vista previa linda al compartirse por WhatsApp (imagen Open Graph generada con `next/og`, que ya viene en Next.js).
- **48.3 Botones:** «Mandar al grupo» (WhatsApp) y «Guardar en mi calendario» (archivo .ics, sin librería).
- **Puerta:** un plan se arma en menos de 1 minuto, la tarjeta se ve bien en WhatsApp (probado en un teléfono real),
  y un enlace manipulado no rompe nada ni muestra datos raros; revisión sin hallazgos altos.

## Fuera de esta versión (se deciden después)

- **Cobro automático del plan Destacado** (Payphone o Kushki): necesita que el usuario abra cuenta en uno de los dos
  y decidir comisiones. Plan propio cuando el usuario quiera.
- **Inglés para turistas** (Turismo, Guía útil, Misterio y guías primero): versión 15.
- **Galería del negocio con flechas** como la de los lugares turísticos: revisar al pasar por la fase 45.
- Invitar guías y negocios reales no es código: campaña del usuario (el afiche QR de 47.3 ayuda).
