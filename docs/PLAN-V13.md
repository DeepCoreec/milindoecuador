# Mi Lindo Ecuador — Plan de la versión 13: guías turísticos, recorridos y "Guayaquil de misterio"

> Idea traída por el usuario el 2026-10-31 (consultó a otra IA: perfil del guía, creador de rutas, agenda y reservas,
> fichas completas, Paumi para guías, confianza; credenciales contra el catastro del MINTUR) y su pedido de una sección
> de "exploración urbana" de terror (el cementerio de noche, la morgue cerrada del cerro). Propuesta de Claude en 3 fases
> **aprobada por el usuario el 2026-10-31** ("me parece increíble, agrégalo al plan y dale inicio").
> Sin librerías nuevas. Cada fase con su migración (la aplica el usuario en Supabase), pruebas de RLS y revisión de
> seguridad independiente.

## Fase 41 · Guías turísticos

- **41.1 Base (migración 0023):** categoría nueva "Guías turísticos" (`guias`). En `places`, datos del guía: idiomas y
  especialidades (de una lista fija), zonas donde trabaja (texto corto), número de credencial del MINTUR (**privado**:
  no lo lee el público, solo el servidor) y fecha de acreditación (solo la pone el admin). Lo escribe el servidor.
- **41.2 Registro y perfil:** el guía se registra como cualquier negocio eligiendo "Guías turísticos"; su foto, su
  presentación (descripción) y su WhatsApp son los de la ficha. En «Mi negocio» aparece "Tu perfil de guía" con
  idiomas, especialidades, zonas y número de credencial. Si cambia el número, pierde la acreditación hasta que se revise.
- **41.3 Insignia "Guía acreditado":** distinta de "Verificado". El admin la pone a mano después de buscar el número en
  el catastro turístico del MINTUR (https://servicios.turismo.gob.ec/catastro-turistico/); el panel muestra el número
  y el enlace al catastro, y un botón para poner o quitar la insignia.
- **41.4 La ficha del guía** muestra la insignia, idiomas, especialidades y zonas, y el botón de WhatsApp de siempre.
- **41.5 Sección "Guías turísticos" en Turismo:** primero los acreditados y con foto; enlace a la lista completa.
- **41.6 Privacidad:** la política de privacidad dice qué datos del guía se publican y que la credencial no se publica.
- **Puerta:** un guía se registra, llena su perfil y aparece en Turismo; el admin pone y quita la insignia; el número de
  credencial no sale en ninguna página ni en la API pública; RLS probado; revisión de seguridad sin hallazgos altos.

## Fase 42 · Recorridos de los guías

- **42.1 Base (migración 0024):** tabla de recorridos de un guía: nombre, duración, precio por persona, punto de
  encuentro, descripción y paradas elegidas de los lugares de la Guía útil (en orden). Tope por guía. RLS: el público
  lee los recorridos publicados de guías publicados; escribe el servidor.
- **42.2 Crear recorridos** desde «Mi negocio» (solo guías): elegir paradas de la lista, ordenarlas y publicar.
- **42.3 Página del recorrido:** paradas con foto, enlace de Google Maps con todas las paradas en orden, y el botón
  "Pedir este recorrido por WhatsApp" con la fecha y el número de personas ya escritos en el mensaje.
- **42.4 Paumi recomienda** guías y recorridos cuando le preguntan por tours o guías (solo publicados).
- **No se hace aún:** calendario y reservas con pago, "Paumi para guías" en otros idiomas.
- **Puerta:** un guía publica un recorrido de 3 paradas, se abre en Maps en orden y el mensaje de WhatsApp sale con fecha
  y personas; RLS probado; revisión de seguridad sin hallazgos altos.

## Fase 43 · "Guayaquil de misterio"

- **43.1 Leyendas con lugar real:** historias conocidas de la ciudad (con fuente: libros, prensa, municipio), cada una
  ligada a un lugar de la guía que se puede visitar de forma segura.
- **43.2 Recorridos nocturnos oficiales:** solo los que se confirme que existen hoy (por ejemplo, los del Cementerio
  General o el municipio), con su fuente y su contacto oficial.
- **43.3 Rutas de terror de los guías:** los guías con la especialidad «Recorridos de noche» y sus recorridos salen en esta sección (decidido el 2026-10-31: así no hace falta otra migración; el guía lo marca en su perfil).
- **Regla de seguridad:** no se recomienda entrar a lugares abandonados, cerrados o privados (por ejemplo, la antigua
  morgue del cerro): solo se cuenta su historia y se ve desde la calle o con un guía autorizado. Aviso visible.
- **Puerta:** cada leyenda y recorrido oficial con su fuente; ninguna página invita a entrar a un lugar cerrado.
