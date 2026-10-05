# Sistema de diseño de Mi Lindo Ecuador

> Fuente principal: el artefacto "Mi Lindo Ecuador" (Design System) en Claude:
> https://claude.ai/artifact/KTbvdQGGgSK6RG56iBmXzN
> Valores exactos en `docs/diseno-tokens.json`. Si algo no está aquí o allá, no se inventa: se pregunta.

## Idea

Guía de ciudad editorial: mucho espacio, fotos reales como protagonistas y la identidad de Guayaquil
en los detalles. El elemento propio de la marca es la **Fachada**: el selector de categorías con forma
de casa de Las Peñas, cada categoría con su color.

## Colores (modo claro / oscuro)

| Token | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `papel` | #F5F8FA | #0B1D28 | Fondo de página |
| `papel-alto` | #FFFFFF | #122A39 | Tarjetas, buscador, ficha |
| `linea` | #D3DFE6 | #25404F | Divisores |
| `linea-fuerte` | #72909F | #6F8C9C | Bordes de campos y controles |
| `rio` | #0E2E40 | #E8F1F5 | Texto principal |
| `rio-suave` | #4A6475 | #A3B9C5 | Texto secundario |
| `celeste` | #5AAFE3 | #6BBCEB | Identidad y categoría Hoteles (nunca texto) |
| `celeste-tinta` | #17628F | #7FC6F0 | Botón principal, enlaces, activo |
| `on-celeste-tinta` | #FFFFFF | #0B1D28 | Texto sobre celeste-tinta |
| `celeste-suave` | #E2F0F9 | #123A52 | Fondos teñidos |
| `mango` | #F2B33D | #F5BE55 | Restaurantes, insignia Destacado |
| `mango-suave` | #FDF1D8 | #3A2E12 | Fondo de ficha destacada |
| `faro` | #D9483B | #F06B5E | Lugares turísticos |
| `manglar` | #2F8A62 | #4DB385 | Dónde hacer ejercicio |
| `buganvilla` | #C2457F | #E070A6 | Dónde pasear |
| `on-color` | #0E2E40 | #0E2E40 | Texto sobre mango y whatsapp |
| `estrella` | #A86A00 | #F5BE55 | Calificaciones |
| `whatsapp` | #25D366 | #25D366 | Botón Escribir por WhatsApp |
| `exito` | #1F7A4D | #5BC48E | Confirmaciones |
| `error` | #B42318 | #FF8A80 | Errores |

Todos los pares de texto cumplen 4,5:1 y los bordes de controles 3:1, en ambos modos (verificado).

## Tipografía

| Familia | Fuente | Uso |
| --- | --- | --- |
| `rotulo` | Krona One | Nombre de la marca y títulos grandes (`rotulo-hero` 40/44, `rotulo-seccion` 24/30) |
| `sans` | Hanken Grotesk 400–700 | Toda la interfaz (`titulo-ficha` 28/34, `titulo-tarjeta` 18/24, `cuerpo` 16/24, `cuerpo-chico` 14/20, `etiqueta` 13/16) |
| `historia` | Source Serif 4 | Solo la historia de cada lugar (18/30) |

Las tres tienen licencia OFL; en la fase 1 sus archivos `.woff2` se sirven desde el propio sitio.

## Espacios, esquinas y sombras

- Espacios base 4px: 4, 8, 12, 16, 24, 32, 48, 64 (`space-1` a `space-16`).
- Esquinas: `radius-sm` 4px (insignias, campos), `radius-md` 12px (fotos de tarjeta, botones), `radius-lg` 20px (foto de ficha, diálogos), `radius-full` solo el buscador.
- Tarjetas sin sombra. `sombra-flotante` solo para lo que flota. `anillo-foco` en todo lo que se toca.

## Componentes definidos

Botón (principal, secundario, WhatsApp, texto) · Fachada · Buscador · Estrellas · Insignia (Destacado, Verificado, neutra) · Tarjeta de lugar · Reseña · Historia.
Las reglas de uso de cada uno están en el artefacto.

## Reglas que más se olvidan

- Nunca texto todo en mayúsculas. Nunca emojis en la interfaz. Nunca negro puro: el texto es `rio`.
- El botón principal aparece una sola vez por pantalla.
- El color de categoría nunca va solo: siempre con su nombre escrito.
- Fotos propias, con permiso, con texto alternativo descriptivo.
- Todavía no hay logo: el nombre se escribe en `rotulo`.
