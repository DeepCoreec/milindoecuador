# Mi Lindo Ecuador — Plan de la versión 11: una buena guía de turismo

> Pedido del usuario del 2026-10-31 (04:20): "no le pongas nada de reseñas a lo que nosotros estamos subiendo […]
> encárgate de hacer según tus conocimientos una app que me ayude, en base a lo que ya tenemos; mejórala sin agregar
> cosas innecesarias ni dejar vulnerabilidades; ayúdame creando una guía de turismo buena; te doy el permiso de iniciar".
> Antes (04:11): "quiero algo más bonito donde pueda ver las fotos de cada lugar turístico […] no pongas estatuas […]
> mejor donde se pueden hacer actividades y sean espaciosos y divertidos". Estado: **aprobado por el usuario el
> 2026-10-31 04:20**. Fase 39. **Sin reseñas en los lugares de la guía, sin librerías nuevas y sin migraciones.**

## Fase 39 · Cada lugar turístico con su página

- **39.1 Página de cada lugar para visitar** (`/guayaquil/visitar/<nombre>-<id>`): foto grande con su crédito, qué es
  y dónde está, "Sobre el lugar" (la nota de la guía o el extracto de Wikipedia, con su enlace), horario, teléfono,
  página web, y "Cómo llegar" con Google Maps y Waze. Sin reseñas.
- **39.2 Qué hay cerca:** en la misma página, más lugares para visitar a menos de 3 km (primero los que tienen foto),
  negocios registrados cerca (para comer o tomar algo después) y eventos de esta semana cerca.
- **39.3 Se llega desde todas partes:** las tarjetas de la Guía útil y de las categorías, "Cerca de mí" y el mapa del
  sitio para Google llevan a esa página.
- **39.4 Google y WhatsApp:** título y descripción propios, foto al compartir y datos estructurados
  (TouristAttraction). Las páginas sin foto ni descripción no se ofrecen a Google.
- **Seguridad:** solo lectura de datos públicos (con la clave pública y las reglas de la base); la dirección se valida
  (el número del lugar debe tener formato de id) y lo que no existe da 404; ningún formulario nuevo; los datos
  estructurados se escriben escapados.
- **Puerta:** desde Turismo se abre la página de un lugar con su foto y lo que hay cerca; revisado a 390 px y
  computadora, claro y oscuro; lint, tipos y pruebas sin errores.
