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

## Fase 23 · Guía útil de la ciudad

- **Lugares turísticos públicos** sin que nadie se registre, importados de **OpenStreetMap** (licencia ODbL: citar
  "© colaboradores de OpenStreetMap"), revisados por el admin antes de publicarse (muchos vienen sin foto ni horario).
  Nada copiado de Google Maps (sus términos lo prohíben); textos de Wikipedia solo citando la fuente (CC BY-SA).
- **"¿Se te dañó algo?":** categorías nuevas de servicios (talleres, celulares, electrónica, cerrajerías); los
  negocios se registran solos como cualquier otro.
- **Información útil:** página con ECU 911, hospitales, farmacias, transporte (Metrovía, Aerovía) y datos para turistas.
- **Puerta:** el usuario lo aprueba.
