# Arte de Mi Lindo Ecuador

Ilustraciones propias en estilo serigrafía. Sus colores son variables del sistema de diseño
(`var(--mango)`, `var(--on-color)`…), así que cambian solas entre modo claro (día) y oscuro (noche).

| Archivo | Qué es | Dónde se usa |
| --- | --- | --- |
| `panorama-pixel.html` | **El Cerro Santa Ana en pixel art animado** (canvas 240 x 100): siempre de noche: el faro gira y la balandra cruza el río | **Portada del sitio** |
| `panorama.svg` | Versión anterior en serigrafía, quieta | Respaldo; por ejemplo, imagen para compartir en redes |
| `categoria-restaurantes.svg` | Encebollado humeante sobre fondo `mango` | Selector de categoría |
| `categoria-hoteles.svg` | Balcón de madera con buganvillas sobre `celeste` | Selector de categoría |
| `categoria-turismo.svg` | Faro y capilla del cerro sobre `faro` | Selector de categoría |
| `categoria-ejercicio.svg` | Samán y bicicleta sobre `manglar` | Selector de categoría |
| `categoria-paseos.svg` | Noria y malecón sobre `buganvilla` | Selector de categoría |

## Cómo se editan

El pixel art se edita directo en `panorama-pixel.html` (todo el dibujo está en la función `pintar`).
Agrega `data-quieto` al canvas para una imagen fija. El canvas lleva `data-theme="dark"` para ser siempre de noche; con `data-theme="light"` se vería de día. Las demás piezas no se editan a mano: se cambia el generador y se vuelven a crear.

```bash
python3 panorama.py > panorama.svg     # siempre sale igual (semilla 444)
python3 afiches.py afiches.json        # luego cada afiche se guarda como categoria-<nombre>.svg
```

En la fase 2 se convierten en componentes React dentro de `src/components/arte/`.
Reglas de uso: sección "Ilustración" del sistema de diseño y `docs/DISENO.md`.
