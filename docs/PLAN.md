# Plan de Mi Lindo Ecuador (resumen)

> El plan completo, con diagramas, está en el documento "Mi Lindo Ecuador — Plan del proyecto".
> Este archivo es la copia corta que Claude usa como referencia dentro del repositorio.

## Qué es

Guía de Guayaquil con restaurantes, hoteles, lugares turísticos, sitios para hacer ejercicio y para pasear,
con reseñas reales y contacto directo por WhatsApp. Aparecer es gratis; los negocios pagan por extras.

**No es (en la versión 1):** mapa de calles, cartelera de eventos, venta de entradas, pagos dentro de la página
ni marketplace de compra y venta.

## Versión 1: 8 funciones (solo Guayaquil)

1. Fichas de lugares (fotos, descripción, horario, sector, precio, WhatsApp, "Cómo llegar")
2. 11 categorías (5 principales en una barra y el resto en "Todas las categorías"), buscador y filtros por sector y precio
3. Enlaces para compartir con tarjeta (WhatsApp, Instagram, Facebook)
4. Cuentas de usuario (correo o Google), solo para reseñas
5. Reseñas: estrellas, comentario, respuesta del negocio, reportes
6. Registro de negocios por solicitud; se publica cuando el admin aprueba
7. Panel de administración
8. App instalable (PWA)

**Fuera de la versión 1:** grupos para salir juntos y "Armar un plan", mapa, chatbot, guías y GPS, pagos automáticos, panel para dueños,
apps en tiendas, otras ciudades, inglés.

## Categorías

| Tipo | Categorías (slug) |
| --- | --- |
| Principales (barra) | `restaurantes`, `hoteles`, `turismo`, `ejercicio`, `paseos` |
| En "Todas las categorías" | `cafes`, `vida-nocturna`, `museos`, `compras`, `ninos`, `naturaleza` |

Cada categoría tiene su afiche ilustrado (`docs/arte/`). Una categoría nueva necesita su afiche antes de publicarse.

## Planes para negocios

| Plan | Precio | Qué incluye |
| --- | --- | --- |
| Ficha gratis | 0 $ | Fotos, horario, ubicación, WhatsApp, reseñas |
| Destacado | 1 $ por 7 días (paquete 6 semanas por 5 $) | Sale primero en su categoría, sello "Destacado" |
| Verificado | 2 $ pago único | Sello "Verificado" después de confirmar que el negocio existe |

En la versión 1 se cobra por transferencia o DeUna y el admin lo activa a mano.

## Fases y puertas

| Fase | Entrega | Puerta para pasar a la siguiente |
| --- | --- | --- |
| 0 · Plan y diseño | Plan, sistema de diseño, maquetas | El usuario aprueba las maquetas |
| 1 · Base técnica | Next.js, GitHub, Vercel, Supabase con tablas y reglas | Las pruebas de reglas de seguridad pasan |
| 2 · Catálogo público | Inicio, categorías, fichas, buscador, enlaces para compartir | 20 lugares reales con fotos propias |
| 3 · Usuarios y reseñas | Inicio de sesión, reseñas, reportes | 5 personas lo prueban sin errores |
| 4 · Negocios y panel admin | Registro de negocios, panel completo | Un negocio aprobado de punta a punta |
| 5 · App y lanzamiento | PWA, SEO, legal, seguridad, dominio | Lighthouse 90+ y revisión de seguridad aprobada |

## Decisiones tomadas (2026-10-05)

| Decisión | Respuesta |
| --- | --- |
| Nombre | Mi Lindo Ecuador |
| Inicio de sesión | Correo (enlace mágico, sin contraseña) y Google |
| Quién modera y aprueba | Solo el dueño (un único admin en la versión 1) |
| WhatsApp que recibe avisos de solicitudes | 593986225038 (las solicitudes se guardan en la base; WhatsApp es solo el aviso) |
| Referencias de diseño | Ver tabla siguiente |

## Referencias de diseño

| Sitio | Qué tomamos | Qué NO tomamos |
| --- | --- | --- |
| Airbnb | Fotos grandes como protagonistas, tarjetas limpias, ficha con galería y datos clave arriba | Mapa lateral y reservas |
| Time Out (guías de ciudad) | Voz editorial y local: listas como "Dónde comer encebollado", titulares con personalidad | Exceso de publicidad |
| TripAdvisor | Bloque de reseñas claro: promedio, cantidad, estrellas y respuesta del negocio | Pantallas saturadas y ventanas emergentes |
| Atlas Obscura | Cada lugar cuenta una historia o dato curioso, no solo una dirección | Textos largos tipo artículo |

**Dirección visual resultante:** guía de ciudad editorial, con mucho espacio, fotografía real como protagonista
y la identidad de Guayaquil (celeste y blanco de su bandera, el río Guayas, las casas de colores de Las Peñas)
en detalles, no en adornos.
