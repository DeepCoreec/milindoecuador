# Maquetas de Mi Lindo Ecuador

Lienzo de diseño con las 5 pantallas, en computadora (1440 px) y celular (390 px):
https://claude.ai/artifact/XjEhgck6NNfLcK4yaQaVc7

En el lienzo, el ajuste **Modo** de cada pantalla cambia entre claro y oscuro.

| Pantalla | Ruta en el sitio |
| --- | --- |
| Inicio | `/` |
| Categoría (ejemplo: Restaurantes) | `/guayaquil/restaurantes` |
| Ficha de un lugar | `/guayaquil/restaurantes/<lugar>` |
| Registra tu negocio | `/negocios/registro` |
| Panel de administración (Solicitudes) | `/admin/solicitudes` |

## Archivos

- `comun.css`: los estilos de las maquetas, hechos solo con los tokens del sistema de diseño.
- `pantallas.py`: el HTML de cada pantalla (usa los afiches de `docs/arte/`). En la fase 2 cada bloque
  se convierte en componentes React; es la referencia exacta de textos, orden y medidas.

## Reglas que se aplicaron

- Revisadas a 390 px y 1440 px, en claro y oscuro, sin desbordes horizontales.
- Un solo botón principal por pantalla; sin textos en mayúsculas; sin puntos medios entre datos.
- Lugares turísticos reales; negocios marcados con la insignia "Ejemplo".
- Fotos como espacios marcados ("Foto del lugar"): se reemplazan por fotos propias con permiso.
