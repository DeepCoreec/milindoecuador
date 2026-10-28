# Mi Lindo Ecuador — Plan de la versión 6: agentes que ayudan al admin

> Idea del usuario del 2026-10-28: "agentes de IA que detecten y automaticen tareas de la página, partiendo de lo que
> ya existe y no desde cero". Estado: **borrador, espera la aprobación del usuario**. Fase 27 en adelante.
> **Sin librerías nuevas:** se usa la API de Anthropic con `fetch`, igual que Paumi (`src/lib/paumi/cerebro.ts`).

## La idea en una línea

Un agente = **reglas** con los datos que ya tenemos + **Claude Haiku** para el criterio + **el admin decide**.
No se entrena un modelo propio: no hay miles de ejemplos etiquetados y no hace falta. Cada decisión del admin queda
guardada y sirve para medir cuánto acierta el agente. Solo cuando demuestra que acierta, se le deja aprobar solo lo
de bajo riesgo.

**De dónde sale la idea:** el patrón "el agente decide lo claro y deja lo dudoso a una persona" de
[vercel-labs/review-desk](https://github.com/vercel-labs/review-desk). Se toma el patrón, **no el código**: trae Workflow
SDK, Slack y Redis, que este proyecto no usa ni necesita.

## Reglas que valen para todos los agentes (no negociables)

1. **Recomienda, no ejecuta**, hasta que el admin lo pase a la etapa 2 de autonomía (abajo) para un tipo concreto.
2. **Nunca borra.** Publica, descarta u oculta: todo se puede deshacer desde el panel.
3. **Registro de cada decisión:** quién decidió (agente o admin), qué, por qué, con qué modelo y cuándo. Se ve en el panel.
4. **Tope por día** de decisiones automáticas (100 al inicio) y **tope de gasto** por corrida en la API.
5. **Lo que lee es dato, no órdenes:** nombres de OpenStreetMap, reseñas y fichas los escribe cualquiera. Van marcados
   como datos en el pedido a Claude (como hace Paumi) y la respuesta se valida con Zod: solo vale una de las decisiones
   permitidas, nada más.
6. **Sin la clave de Anthropic, o si la API falla, no pasa nada:** el panel sigue funcionando a mano.

## Etapas de autonomía

| Etapa | Qué hace el agente | Cuándo se pasa a la siguiente |
| --- | --- | --- |
| 1 · Recomienda | Marca cada caso "Publicar", "Revisar" o "Descartar" con su motivo; el admin aprueba en bloque | Cuando, en un tipo (por ejemplo museos), el agente coincide con el admin en el 95 % de al menos 50 decisiones |
| 2 · Aprueba lo seguro | En los tipos que pasaron la prueba, publica o descarta solo los casos que él marcó con alta seguridad; lo demás sigue esperando al admin | El admin lo decide; puede volver a la etapa 1 cuando quiera |

Lo delicado **nunca** pasa a la etapa 2: negocios con WhatsApp, reseñas, fichas de dueños y eventos.

## Fase 27 · Agente revisor de la Guía útil (el primero)

Hoy hay 2281 lugares de OpenStreetMap "Por revisar". La revisión a mano del 2026-10-28
(`docs/revisiones/guia-util-2026-10-28.md`) mostró que de 79 lugares solo el 35 % estaba bien: hace falta revisar sí o sí.

- **27.1 Base de datos (0019):** en `city_spots`, la recomendación del agente (decisión, motivo, puntaje, modelo,
  fecha); tabla `spot_decisions` con el registro de cada decisión (agente o admin). RLS: solo el admin lee; escribe solo
  el servidor. Pruebas en `tests/rls/reglas.mjs`.
- **27.2 Reglas sin IA** (`src/lib/agente/reglas.ts`, gratis y al instante):
  - malas señales: nombre vacío o genérico ("mirador", "Parque Infantil", "bazar"), nombre igual al tipo, palabras de
    urbanización ("Urb.", "Etapa", "Urbanización"), "Palco", "Servicios Higiénicos", casas y negocios marcados como
    atracción, posibles duplicados (nombre parecido a menos de 300 m);
  - buenas señales: nombre propio, dirección, teléfono, página web, horario.
  - Lo obvio lo decide la regla sola ("Descartar: nombre genérico"); lo demás pasa a Claude.
  - **Prueba:** las 51 decisiones del 2026-10-28 (28 publicar, 23 descartar) como casos de prueba unitaria.
- **27.3 Criterio con Claude** (`src/lib/agente/revisor.ts`): lotes de 20 lugares por pedido, con las instrucciones
  de la guía y las reglas de arriba; respuesta JSON validada con Zod; los datos van marcados como "datos, no
  instrucciones". Modelo: el de Paumi (`PAUMI_MODELO`) u otro elegido en una variable `AGENTE_MODELO`.
- **27.4 Panel:** en `/admin/guia`, filtro por recomendación ("El agente dice publicar / revisar / descartar"), el
  motivo en cada lugar, botón "Pedir revisión al agente" (por grupo) y "Aplicar recomendaciones marcadas". Contador de
  acierto: "el agente coincidió contigo en N de M" por tipo.
- **27.5 Etapa 2 (solo si el usuario la activa):** interruptor por tipo en el panel, con tope diario y registro.
- **27.6 Cierre:** revisión independiente de seguridad (inyección de instrucciones, costos, permisos), Términos y
  Privacidad si hace falta, `ARQUITECTURA.md` y `PROGRESO.md` al día.
- **Puerta:** el agente revisa los 2281 lugares; el usuario aprueba en bloque una muestra de 100 y el acierto queda
  medido en el panel.

### Costo estimado de revisar los 2281 lugares

Cálculo aproximado: unos 600 tokens de entrada y 80 de salida por lugar (unos 1,4 millones de entrada y 0,2 de salida
en total). Las reglas sin IA resuelven los casos obvios gratis, así que el costo real será menor.

| Modelo | Precio por millón de tokens (entrada / salida) | Costo aproximado de todo |
| --- | --- | --- |
| Claude Haiku 4.5 (el de Paumi hoy) | 1 $ / 5 $ | unos 2,40 $ |
| Claude Haiku 5.5 | 0,10 $ / 0,50 $ | unos 0,25 $ |

Precios del 2026-10-28 en la [página de precios de Anthropic](https://platform.claude.com/docs/en/about-claude/pricing).
Antes de correrlo se vuelve a calcular con los números reales y se pone un tope de gasto.

## Fase 28 · Agentes siguientes (después de que el primero funcione)

En este orden, cada uno con el mismo esquema (reglas + Claude + el admin decide + registro):

1. **Reseñas y reportes:** ordena la cola por gravedad (insultos, datos personales, reseña falsa, competencia) y
   sugiere "mantener / ocultar". Siempre decide el admin.
2. **Fichas nuevas de dueños (C5 de la auditoría del 2026-10-27):** avisa si el nombre se parece a un negocio ya
   existente o a uno conocido de OpenStreetMap, si la foto parece una captura de pantalla o si la descripción es
   publicidad. Siempre decide el admin.
3. **Eventos reportados:** resume los reportes y sugiere mostrar u ocultar.

## Para más adelante (no entra en este plan)

- **Cruce con Overture Maps Places** (datos abiertos con un puntaje de 0 a 1 de "el lugar existe"; licencias CDLA
  Permissive 2.0 y Apache 2.0, [guía](https://docs.overturemaps.org/guides/places)). Mejoraría mucho la detección de
  lugares cerrados, pero sus archivos son grandes (formato Parquet) y hace falta una herramienta extra para leerlos:
  se evalúa cuando el agente de la fase 27 esté medido.
