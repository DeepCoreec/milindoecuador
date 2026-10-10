# Mi Lindo Ecuador — Plan de la versión 4: diseño más llamativo

> Pedido del usuario (2026-10-10): "si está bonito, pero quiero que sea más llamativo y más profesional".
> Estado: **borrador, falta la aprobación del usuario**. Las fases siguen la numeración (17 a 21).
> Skill nueva para esta versión: `frontend-ui-engineering` (Agent Skills de Addy Osmani, `.claude/skills/`),
> junto con `frontend-design`. Sin librerías nuevas.

## Diagnóstico (2026-10-10, capturas a 390 y 1440 px)

Lo que ya funciona y se mantiene: la identidad (Panorama del Cerro Santa Ana en pixel art, afiches serigrafía de
categorías, Paumi), los colores con contraste revisado, la tipografía (Krona One + Hanken Grotesk), el modo oscuro.

Lo que hace que se vea "apagada":

1. **En computadora la página usa la mitad de la pantalla**: todo queda a la izquierda (ancho angosto) y la derecha
   vacía; el Panorama, la pieza más fuerte, sale chico.
2. **Portada sin golpe de entrada**: el título y el buscador son chicos; no se entiende de un vistazo qué ofrece.
3. **Casi todo es blanco**: los colores de categoría solo viven en los afiches; las secciones no tienen ritmo
   (todas iguales, fondo claro, una tras otra).
4. **Tarjetas de lugar planas**: sin foto se ven como cajas beige; poca jerarquía entre nombre, calificación,
   precio y "abierto ahora".
5. **Categorías**: los filtros ocupan mucho y parecen un formulario; los resultados quedan en segundo plano.
6. **Ficha**: buena base, pero la acción principal (WhatsApp) y los datos útiles (abierto ahora, cómo llegar,
   precio) podrían leerse más rápido; el pie de página es muy débil.

## Fases

### Fase 17 · Dirección visual (antes de programar)
- 17.1 Referencias: 3 o 4 guías de ciudad y apps de lugares muy bien hechas → decisiones anotadas (jerarquía,
  densidad, navegación, fotos), **sin copiar** marcas ni diseños.
- 17.2 **Dos propuestas** de dirección para la portada (celular y computadora) en el lienzo de diseño del usuario:
  una "pulida" (misma identidad, más color y escala) y una "atrevida" (bandas de color de categoría, Panorama a
  todo lo ancho, tipografía grande).
- 17.3 El usuario elige; se anota en `docs/DISENO.md` (y en tokens solo si cambia algo aprobado).
- **Puerta:** el usuario aprueba una dirección.

### Fase 18 · Portada
- Entrada grande con el Panorama a todo lo ancho, el título y el buscador como protagonistas.
- Categorías como afiches más grandes; secciones con ritmo (bandas de color de categoría, no todo blanco).
- "Dónde comer" e "Imperdibles" con tarjetas nuevas; llamado para negocios más visible; pie de página completo.
- **Puerta:** el usuario la aprueba en su celular y en computadora.

### Fase 19 · Tarjeta de lugar, categorías y buscador
- Tarjeta nueva: foto protagonista (y un respaldo ilustrado con el color de la categoría si no hay foto),
  calificación, precio y "abierto ahora" de un vistazo.
- Página de categoría: filtros compactos (chips y un botón "Filtros" en el celular), más resultados a la vista.
- Buscador con la misma tarjeta.
- **Puerta:** el usuario la aprueba.

### Fase 20 · Ficha del lugar
- Encabezado con galería a lo ancho, barra de acciones (WhatsApp, Cómo llegar, Guardar, Compartir) siempre a mano
  en el celular, datos útiles arriba (abierto ahora, precio, sector), video y reseñas con mejor jerarquía.
- **Puerta:** el usuario la aprueba.

### Fase 21 · Resto de pantallas y revisión final
- Registro, Mi negocio, Mi cuenta, Entrar, 404 y panel de admin con el mismo lenguaje (sin rehacer su lógica).
- Revisión final: 390, 768, 1024 y 1440 px, claro y oscuro, teclado y lector de pantalla, velocidad (las fotos y
  el Panorama no deben hacer lenta la carga), las 20 reglas de seguridad intactas.
- **Puerta:** revisión independiente sin fallas altas y aprobación del usuario.

## Reglas de esta versión
- El diseño aprobado sigue mandando: lo nuevo se aprueba primero en el lienzo y luego se programa.
- Mobile first; cada pantalla se revisa a 390 px y en computadora, claro y oscuro.
- Sin emojis, sin texto en mayúsculas, un solo botón principal por pantalla, color de categoría siempre con su nombre.
- Nada de "estética de IA" (degradados morados, todo redondeado, sombras pesadas, grillas de tarjetas iguales).
- Paumi, la seguridad y los datos no cambian en esta versión.

## Fuera de la versión 4 (por ahora)
Logo nuevo (sigue el nombre en `rotulo`), fotos profesionales de los lugares (las suben los negocios), animaciones
nuevas además del Panorama.
