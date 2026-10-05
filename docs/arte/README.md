# Arte de Mi Lindo Ecuador

Ilustraciones propias en estilo serigrafía. Sus colores son variables del sistema de diseño
(`var(--mango)`, `var(--on-color)`…), así que cambian solas entre modo claro (día) y oscuro (noche).

| Archivo | Qué es | Dónde se usa |
| --- | --- | --- |
| `panorama.svg` | El Cerro Santa Ana: casas, escalinata, faro, capilla, bandera y río | Portada del sitio |
| `categoria-restaurantes.svg` | Encebollado humeante sobre fondo `mango` | Selector de categoría |
| `categoria-hoteles.svg` | Balcón de madera con buganvillas sobre `celeste` | Selector de categoría |
| `categoria-turismo.svg` | Faro y capilla del cerro sobre `faro` | Selector de categoría |
| `categoria-ejercicio.svg` | Samán y bicicleta sobre `manglar` | Selector de categoría |
| `categoria-paseos.svg` | Noria y malecón sobre `buganvilla` | Selector de categoría |

## Cómo se editan

No se editan a mano: se cambia el generador y se vuelven a crear.

```bash
python3 panorama.py > panorama.svg     # siempre sale igual (semilla 444)
python3 afiches.py afiches.json        # luego cada afiche se guarda como categoria-<nombre>.svg
```

En la fase 2 se convierten en componentes React dentro de `src/components/arte/`.
Reglas de uso: sección "Ilustración" del sistema de diseño y `docs/DISENO.md`.
