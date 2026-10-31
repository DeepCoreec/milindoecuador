"""Ilustración de Guayaquil para el fondo de la portada (diseño de prueba 2, 2026-10-31).

Mismo estilo de los afiches (formas planas, colores de la guía, grano), de noche como el Panorama: la noria La Perla,
las torres del centro, el Malecón con sus palmeras, el río Guayas con una balandra y el Cerro Santa Ana con sus casas
de colores, la escalinata, el faro y la capilla. Los colores son tokens (cambian solos entre modo claro y oscuro).

Uso: python3 docs/arte/ciudad.py  → escribe src/components/arte/ciudades.tsx y docs/arte/ciudad-guayaquil.svg
"""

import math
import random
from pathlib import Path

random.seed(7)
W, H = 1600, 800
RAIZ = Path(__file__).resolve().parents[2]

el = []


def a(s):
    el.append(s)


def r(x, y, w, h, cls=None, fill=None, extra=""):
    pint = f'className="{cls}"' if cls else f'fill="{fill}"'
    a(f'<rect {pint} x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}"{extra}/>')


# Cielo de noche, estrellas y luna
r(0, 0, W, H, fill="var(--papel)")
for i in range(70):
    x, y = random.uniform(0, W), random.uniform(10, 330)
    titila = f" mle-titila-{i % 3 + 1}" if i % 2 == 0 else ""  # la mitad de las estrellas titila (animación en globals.css)
    a(f'<circle className="cal{titila}" cx="{x:.0f}" cy="{y:.0f}" r="{random.choice([1.2, 1.6, 2.2]):.1f}" opacity="{random.uniform(.35, .85):.2f}"/>')
a('<circle className="cal" cx="1250" cy="120" r="44"/>')
a('<circle fill="var(--papel)" cx="1272" cy="104" r="40"/>')

BASE = 600  # nivel del Malecón

# Torres del centro (al fondo): bajas a los lados del título para que se lea
torres = []
x = 380
while x < 1180:
    w = random.choice([46, 58, 70, 84])
    centro = abs((x + w / 2) - 800) / 420  # 0 en el centro, 1 en los lados
    h = random.uniform(120, 230) * (0.8 + 0.4 * centro)
    torres.append((x, w, h))
    x += w + random.choice([4, 8, 12])
luces = 0
for (x, w, h) in torres:
    r(x, BASE - h, w, h, fill="var(--linea)")
    for fy in range(int(BASE - h + 14), BASE - 14, 18):
        for fx in range(int(x + 8), int(x + w - 10), 14):
            if random.random() < 0.28:
                luces += 1
                prende = f" mle-luz-{(luces // 9) % 3 + 1}" if luces % 9 == 0 else ""  # algunas ventanas se prenden y se apagan
                a(f'<rect className="ventana{prende}" x="{fx}" y="{fy}" width="6" height="8" opacity="{random.uniform(.55, 1):.2f}"/>')
# "The Point": la torre alta y torcida a orillas del río
a('<polygon fill="var(--linea)" points="1120,600 1172,600 1166,300 1150,268 1128,300"/>')
for i, fy in enumerate(range(316, 590, 22)):
    a(f'<rect className="ventana" x="{1134 + (i % 3) * 8}" y="{fy}" width="14" height="5" opacity=".8"/>')

# Cerro Santa Ana con sus casas de colores, la escalinata, el faro y la capilla
a('<path fill="var(--celeste-suave)" d="M1180,600 Q1260,430 1390,372 Q1470,340 1540,380 Q1600,410 1600,440 V600 Z"/>')
colores = ["mango", "faro", "buganvilla", "celeste", "cal", "mango", "celeste"]
for fila in range(9):
    yb = 590 - fila * 24
    for col in range(14):
        cx = 1200 + col * 30 + (fila % 2) * 14 + random.uniform(-4, 4)
        # solo dentro del cerro (aprox.)
        borde = 600 - (cx - 1180) * 0.9 if cx < 1390 else 372 + (cx - 1390) * 0.05
        if yb - 20 < borde + 10 or cx > 1590:
            continue
        if random.random() < 0.82:
            c = random.choice(colores)
            r(cx, yb - 20, 24, 20, cls=c)
            r(cx - 2, yb - 23, 28, 4, fill="var(--papel)")
            if random.random() < 0.6:
                ventana = 'className="ventana"' if c not in ("mango",) else 'fill="var(--papel)"'
                a(f'<rect {ventana} x="{cx + 8:.0f}" y="{yb - 14:.0f}" width="7" height="7"/>')
a('<path className="cal-trazo" strokeWidth="5" d="M1230,600 L1290,560 L1262,530 L1330,480 L1304,452 L1380,398"/>')
a('<path className="trazo" strokeWidth="5" strokeDasharray="2 7" d="M1230,600 L1290,560 L1262,530 L1330,480 L1304,452 L1380,398" opacity=".55"/>')
# faro
a('<polygon className="cal" points="1392,372 1420,372 1414,292 1398,292"/>')
a('<polygon className="celeste" points="1396.5,316 1415.5,316 1416.2,328 1395.8,328"/>')
a('<polygon className="celeste" points="1395,344 1417,344 1417.8,356 1394.2,356"/>')
r(1394, 270, 24, 22, fill="var(--linea)")
r(1399, 275, 14, 12, cls="ventana")
a('<polygon fill="var(--linea)" points="1390,270 1422,270 1406,256"/>')
a('<polygon className="mango mle-haz" points="1413,281 1600,236 1600,300" opacity=".14"/>')  # haz de luz (se mueve)
# capilla
r(1450, 356, 40, 30, cls="cal")
a('<polygon className="cal" points="1446,358 1494,358 1470,338"/>')
a('<path className="cal-trazo" strokeWidth="3" d="M1470,338 v-16 M1464,328 h12"/>')
a('<path fill="var(--papel)" d="M1464,386 v-12 a6,6 0 0 1 12,0 v12 z"/>')

# La Perla: la noria del Malecón
cx, cy, rad = 250, 420, 150
a(f'<path className="cal-trazo" strokeWidth="7" d="M{cx},{cy} L{cx - 70},{BASE} M{cx},{cy} L{cx + 70},{BASE}"/>')
a('<g className="mle-noria">')  # gira despacio (globals.css)
a(f'<circle className="cal-trazo" strokeWidth="5" cx="{cx}" cy="{cy}" r="{rad}"/>')
a(f'<circle className="cal-trazo" strokeWidth="2" cx="{cx}" cy="{cy}" r="{rad - 22}"/>')
rayos = " ".join(f"M{cx},{cy} L{cx + rad * math.cos(t):.1f},{cy + rad * math.sin(t):.1f}" for t in [i * math.pi / 12 for i in range(24)])
a(f'<path className="cal-trazo" strokeWidth="1.6" d="{rayos}"/>')
for i in range(16):
    t = i * 2 * math.pi / 16
    c = ["buganvilla", "mango", "celeste", "faro"][i % 4]
    a(f'<rect className="{c}" x="{cx + rad * math.cos(t) - 9:.1f}" y="{cy + rad * math.sin(t) - 4:.1f}" width="18" height="16" rx="4"/>')
a('</g>')
a(f'<circle className="mango" cx="{cx}" cy="{cy}" r="10"/>')

# Malecón: paseo, baranda y palmeras
r(0, BASE, W, 18, fill="var(--linea)")
a('<path className="cal-trazo" strokeWidth="2.5" d="M0,592 H1600"/>')
a('<path className="cal-trazo" strokeWidth="1.6" d="' + " ".join(f"M{x},592 v8" for x in range(10, 1600, 24)) + '"/>')


def palmera(x, h):
    a(f'<path className="manglar" d="M{x},{BASE} q-4,{-h * .5} 6,{-h} h6 q-8,{h * .5} -4,{h} z"/>')
    tx, ty = x + 9, BASE - h
    for ang, ln in [(-160, 46), (-130, 40), (-95, 30), (-50, 40), (-20, 46), (180, 36), (0, 36)]:
        t = math.radians(ang)
        ex, ey = tx + ln * math.cos(t), ty + ln * math.sin(t) + 16
        mx, my = tx + ln * .5 * math.cos(t), ty + ln * .5 * math.sin(t) - 10
        a(f'<path className="manglar" d="M{tx:.0f},{ty:.0f} Q{mx:.0f},{my:.0f} {ex:.0f},{ey:.0f} Q{mx:.0f},{my + 8:.0f} {tx:.0f},{ty + 6:.0f} z"/>')


for x, h in [(470, 110), (560, 90), (980, 120), (1080, 96), (40, 100)]:
    palmera(x, h)

# El río Guayas, con el reflejo de las luces y una balandra
r(0, BASE + 18, W, H - BASE - 18, fill="var(--celeste-suave)")
for _ in range(60):
    x = random.uniform(0, W)
    y = random.uniform(640, 790)
    a(f'<rect className="ventana" x="{x:.0f}" y="{y:.0f}" width="{random.choice([10, 18, 26])}" height="3" opacity="{random.uniform(.15, .45):.2f}"/>')
olas = " ".join(f"M{x},{y} q12,-7 24,0 t24,0" for x, y in [(random.randint(0, 1560), random.randint(650, 780)) for _ in range(26)])
a(f'<path className="cal-trazo" strokeWidth="2.5" opacity=".6" d="{olas}"/>')
# balandra (cruza el río)
a('<g className="mle-balandra">')
a('<path className="cal" d="M720,705 h120 l-16,22 h-88 z"/>')
a('<path className="cal-trazo" strokeWidth="3" d="M782,705 V600"/>')
a('<polygon className="mango" points="778,606 778,698 726,698"/>')
a('<polygon className="cal" points="786,612 786,698 834,698"/>')
a('</g>')

# Grano de serigrafía
a('<rect className="grano" width="1600" height="800" filter="url(#g-ciudad)"/>')

defs = ('<defs><filter id="g-ciudad" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" '
        'numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 1.4 -.55"/></filter></defs>')
cuerpo = "".join(el)
svg_jsx = (f'<svg aria-hidden="true" focusable="false" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMax slice">{defs}{cuerpo}</svg>')

tsx = f'''// GENERADO por docs/arte/ciudad.py. No editar a mano.
// Ilustraciones de cada ciudad para el fondo de la portada (diseño de prueba 2). Estilos: "Afiches" en globals.css.
import type {{ ReactElement }} from "react";

export const ILUSTRACIONES_CIUDAD: Record<string, () => ReactElement> = {{
  guayaquil: () => (
    {svg_jsx}
  ),
}};
'''
(RAIZ / "src/components/arte/ciudades.tsx").write_text(tsx)
# Copia en SVG plano (para verla fuera de la página): clases JSX → atributos SVG
svg = svg_jsx.replace("className=", "class=").replace("strokeWidth=", "stroke-width=").replace("strokeDasharray=", "stroke-dasharray=")
(RAIZ / "docs/arte/ciudad-guayaquil.svg").write_text(svg)
print(len(tsx), "bytes")
