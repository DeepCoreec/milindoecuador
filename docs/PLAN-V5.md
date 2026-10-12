# Mi Lindo Ecuador — Plan de la versión 5: eventos y guía útil de la ciudad

> Ideas del usuario del 2026-10-10. Estado: **borrador**; se empieza cuando termine la versión 4 (diseño) y el
> usuario lo apruebe. Fases 22 en adelante. Sin librerías nuevas salvo que el usuario lo permita.

## Fase 22 · Eventos (lo organiza la gente, gratis)

Cualquier persona con cuenta publica un evento gratis (concierto, feria, deporte, cultura, gastronomía, fiesta
del barrio, curso, otro). **Se ve desde que se publica hasta el último día del evento y al día siguiente se borra
solo.**

- **Datos del evento (toda la descripción posible):** título, categoría, descripción larga, **fecha y hora de
  inicio y de fin** ("de cuándo a cuándo"; puede durar varios días), lugar (nombre, dirección y ubicación con el
  enlace de Google Maps, o "en línea"), precio (gratis o el valor), quién lo organiza, contacto (WhatsApp, página o
  redes), afiche o foto, edad mínima si aplica, y enlace para comprar entradas si existe.
- **Publicación al instante** (como el registro de negocios): cuenta + captcha + filtro de palabras; 3 reportes lo
  ocultan; el admin lo revisa después cuando quiera.
- **Borrado automático:** una tarea programada diaria (a la medianoche de Guayaquil) borra los eventos cuya fecha
  de fin ya pasó, con su afiche. Además, la página nunca muestra un evento vencido aunque la tarea se atrase.
- **Límites contra el abuso:** máximo 3 eventos nuevos por cuenta a la semana; la fecha de inicio como mucho 6 meses
  adelante y la duración como mucho 30 días.
- **Páginas:** `/guayaquil/eventos` con "Hoy", "Este fin de semana" y "Próximos" (filtros por categoría y
  gratis); ficha del evento con "Cómo llegar", "Agregar a mi calendario" y compartir por WhatsApp; franja
  "Esta semana en Guayaquil" en la portada. "Mis eventos" en Mi cuenta para editar o borrar los propios.
- **Paumi** también recomienda eventos ("¿qué hay este fin de semana?").
- Base de datos: tabla nueva con RLS y migración; bucket para afiches; Términos y Privacidad actualizados.
- **Puerta:** el usuario publica un evento de prueba, lo ve en la guía y al día siguiente de su fecha ya no está.

## Fase 23 · Guía útil de la ciudad (información aparte de los negocios)

> Aclaración del usuario (2026-10-11): es **información adicional, aparte** de los negocios registrados. Sirve para
> que la guía (y Paumi) siempre tengan **a dónde recomendar**, aunque todavía no haya negocios registrados en ese tema.
> Por eso va en una tabla propia (`city_spots`), con su propia página, y nunca se mezcla con las fichas de negocios
> (no tiene dueño, reseñas, WhatsApp ni planes).

- **23.1 Base de datos (0017):** tabla `city_spots` (nombre, tipo, grupo, coordenadas, dirección, horario y web si
  OpenStreetMap los trae, id de OSM, estado `pendiente` / `publicado` / `descartado`). RLS: todos ven los publicados;
  solo el admin los cambia. Categoría nueva de negocios "Reparaciones y servicios" para "¿Se te dañó algo?".
- **23.2 Importar de OpenStreetMap:** botón en el panel del admin que pide a la API Overpass los lugares de Guayaquil
  (turismo: parques, museos, miradores, monumentos, iglesias; servicios: talleres, celulares, electrónica,
  cerrajerías; salud y transporte: hospitales, farmacias, paradas de Metrovía y Aerovía). Entran como **pendientes**;
  si ya existen se actualizan sin cambiar su estado. Licencia ODbL: se cita "© colaboradores de OpenStreetMap".
  Nada copiado de Google Maps.
- **23.3 Revisión del admin:** página para publicar o descartar en lote, y corregir el nombre o agregar una frase.
- **23.4 Páginas públicas:** `/guayaquil/guia-util` con tres partes: **Para visitar** (turismo), **¿Se te dañó algo?**
  (servicios de OSM + los negocios registrados de "Reparaciones y servicios") e **Información útil** (ECU 911,
  emergencias, hospitales y farmacias, Metrovía y Aerovía, consejos para turistas). Cada lugar con "Cómo llegar".
- **23.5 Paumi:** herramienta `buscar_sitios` para recomendar de esta guía cuando no haya negocios registrados,
  diciendo que es un dato de OpenStreetMap.
- **23.6 Cierre:** Términos y Privacidad (fuente ODbL), pruebas, revisión a 390 y 1440 px y revisión de seguridad.
- **Puerta:** el usuario importa, publica algunos lugares y los ve en la guía y en Paumi.

## Fase 24 · Arreglos de lo que ya tenemos (pedido del usuario, 2026-10-12)

> "En la sección de reparaciones solo está puesto el nombre y no se abre nada, y faltan cosas del esquema. Implementa
> mejor las cosas usando skills o algún agente; todo lo que hagas que quede en el esquema." Se hizo una auditoría
> independiente (agente) del plan contra el código; esto es lo que encontró y se arregla, en orden.

- **24.0 Publicación:** Vercel no publica desde el 2026-10-10 (todas las versiones fallan). Encontrar el error y arreglarlo.
- **24.1 Categorías que nunca quedan vacías:** si una categoría tiene pocos negocios, muestra debajo los lugares de
  referencia de la Guía útil que le corresponden (Reparaciones → talleres, celulares, electrónica, cerrajerías;
  Turismo, Paseos, Museos, Naturaleza, Ejercicio → parques, museos, miradores…), con "Cómo llegar". Reparaciones con
  chips por tipo. Las tarjetas de reparaciones dicen "Servicio técnico" y no "Lugar".
- **24.2 Guía útil más a la vista y más completa:** enlace en la cabecera, franja en la portada y en "Explora
  Guayaquil"; la sección "¿Se te dañó algo?" muestra también los negocios registrados de reparaciones; cada lugar
  muestra su horario y su página web si OpenStreetMap los trae; el buscador sugiere la Guía útil cuando no encuentra.
- **24.3 Portada que no se queda vacía:** si no hay restaurantes o imperdibles registrados, usa lugares de la Guía útil.
- **24.4 Pendientes del diseño (versión 4):** botón "Filtros" en el celular en la página de categoría; en la ficha, la
  barra fija del celular con Guardar y Compartir y una fila de datos útiles arriba (abierto ahora, precio, sector).
- **24.5 Detalles:** "Pide destacarlo" solo en negocios (no en parques ni lugares públicos); datos de muestra con la
  categoría nueva; `ARQUITECTURA.md` al día con las rutas de las versiones 3 a 5; lo que falte de las "Ideas para
  después" se queda ahí.
- **Revisión:** lint, tipos, pruebas, e2e y capturas a 390 y 1440 px en claro y oscuro; revisión independiente.
- **Puerta:** el usuario lo revisa en su sitio publicado.
