# Skills del proyecto

Guías de trabajo que Claude carga en cada sesión de este proyecto (versión 3, paso 13.1).

Las 5 carpetas vienen de **Agent Skills** de Addy Osmani (https://github.com/addyosmani/agent-skills),
licencia MIT (ver `LICENCIA-agent-skills.txt`), copiadas sin cambios del commit `1401c8b8030e023baeebb31781a6653fe8e93026` (2026-10-03),
después de leerlas completas el 2026-10-09:

| Skill | Para qué |
| --- | --- |
| `security-and-hardening` | Revisión de seguridad (OWASP, sesiones, subidas, SSRF, IA) |
| `code-review-and-quality` | Revisión del código en 5 ejes antes de unir a `main` |
| `shipping-and-launch` | Lista antes de publicar y plan para volver atrás |
| `observability-and-instrumentation` | Registros, métricas y avisos cuando la página falla |
| `frontend-ui-engineering` | Interfaces de calidad profesional: accesibles, responsivas y sin "estética de IA" (agregada el 2026-10-10 para la versión 4, mismo commit y licencia; leída completa) |

- Algunas mencionan archivos de `references/` del repositorio original que no se copiaron (listas extra):
  se pueden leer allá si hace falta.
- **Las reglas de `CLAUDE.md` mandan.** Si una skill sugiere una librería nueva (por ejemplo helmet, prom-client,
  OpenTelemetry o Upstash), igual hay que pedir permiso al usuario primero.
- Para actualizarlas: volver a leerlas completas antes de copiar la versión nueva.

- `frontend-ui-engineering` habla de React Query, Zustand y Storybook como ejemplos: aquí no se usan (no se agregan librerías sin permiso).
