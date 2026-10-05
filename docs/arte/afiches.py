"""Cinco mini afiches ilustrados, uno por categoría. Salida: SVGs 112x112 con clases ligadas a tokens."""
import math, random

ESTILO = '''<style>
.tinta{fill:var(--on-color)} .trazo{stroke:var(--on-color);fill:none;stroke-linecap:round;stroke-linejoin:round}
.cal{fill:var(--papel-alto)} .cal-trazo{stroke:var(--papel-alto);fill:none;stroke-linecap:round;stroke-linejoin:round}
.mango{fill:var(--mango)} .faro{fill:var(--faro)} .celeste{fill:var(--celeste)} .manglar{fill:var(--manglar)}
.buganvilla{fill:var(--buganvilla)} .ventana{fill:var(--mango)} .grano{opacity:.18;mix-blend-mode:multiply}
[data-theme="dark"] .cal{fill:var(--rio)} [data-theme="dark"] .cal-trazo{stroke:var(--rio)}
[data-theme="dark"] .grano{mix-blend-mode:screen;opacity:.08}
</style>'''
GRANO = '''<filter id="g-{id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 1.4 -.55"/></filter>'''

def afiche(id, fondo, dibujo, etiqueta):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 112" role="img" aria-label="{etiqueta}">'
            f'{ESTILO}<defs>{GRANO.format(id=id)}<clipPath id="c-{id}"><rect width="112" height="112" rx="12"/></clipPath></defs>'
            f'<g clip-path="url(#c-{id})"><rect class="{fondo}" width="112" height="112"/>{dibujo}'
            f'<rect class="grano" width="112" height="112" filter="url(#g-{id})"/></g></svg>')

# ---------- Restaurantes: un encebollado humeante ----------
r = []
r.append('<path class="cal-trazo" stroke-width="3" d="M40,38 q-6,-8 0,-14 t0,-14 M56,36 q-6,-8 0,-14 t0,-14 M72,38 q-6,-8 0,-14 t0,-14"/>')
r.append('<ellipse class="tinta" cx="56" cy="92" rx="34" ry="5"/>')                     # sombra / plato
r.append('<path class="cal" d="M20,52 h72 a36,34 0 0 1 -72,0 z"/>')                         # tazón
r.append('<ellipse class="tinta" cx="56" cy="52" rx="36" ry="7"/>')                         # borde
r.append('<ellipse class="mango" cx="56" cy="52.5" rx="32" ry="5"/>')                       # caldo
for x, y in ((44, 52), (58, 51), (68, 53)):                                                   # cebolla
    r.append(f'<path class="trazo" stroke-width="1.6" d="M{x-4},{y} q4,-3 8,0"/>')
r.append('<path class="faro" d="M68,49 a6,6 0 0 1 12,0 z"/>')                                # rodaja de limón (rojo cebolla)
r.append('<path class="tinta" d="M84,40 l18,-24 l3,2 l-17,25 z"/>')                          # cuchara
restaurantes = afiche("res", "mango", "".join(r), "Restaurantes")

# ---------- Hoteles: balcón de madera con persianas abiertas, de noche ----------
h = []
h.append('<circle class="cal" cx="88" cy="20" r="9"/><circle class="celeste" cx="92" cy="17" r="8"/>')  # luna
h.append('<rect class="cal" x="18" y="22" width="60" height="96"/>')                         # fachada
h.append('<polygon class="tinta" points="14,22 82,22 78,15 18,15"/>')                       # alero
h.append('<rect class="ventana" x="34" y="34" width="28" height="36" rx="2"/>')              # ventana encendida
h.append('<path class="trazo" stroke-width="2" d="M48,34 v36 M34,52 h28"/>')
h.append('<rect class="celeste" x="22" y="34" width="11" height="36"/><rect class="celeste" x="63" y="34" width="11" height="36"/>')  # persianas
h.append('<path class="trazo" stroke-width="1.2" d="' + " ".join(f"M23,{y} h9 M64,{y} h9" for y in range(38, 70, 4)) + '"/>')
h.append('<rect class="tinta" x="14" y="74" width="68" height="4"/>')                        # balcón
h.append('<path class="trazo" stroke-width="2" d="' + " ".join(f"M{x},78 v14" for x in range(18, 82, 6)) + ' M14,92 h68"/>')
rnd = random.Random(7)
for _ in range(16):
    h.append(f'<circle class="buganvilla" cx="{rnd.uniform(14, 40):.1f}" cy="{rnd.uniform(72, 98):.1f}" r="{rnd.uniform(2.2, 3.6):.1f}"/>')
h.append('<path class="trazo" stroke-width="1.6" d="M20,96 q8,10 4,18 M30,94 q2,10 -2,18"/>')
hoteles = afiche("hot", "celeste", "".join(h), "Hoteles")

# ---------- Turismo: el faro y la capilla en lo alto del cerro ----------
t = []
t.append('<circle class="mango" cx="26" cy="30" r="12"/>')
t.append('<path class="tinta" d="M0,112 V84 Q30,62 56,60 Q84,58 112,80 V112 Z"/>')          # cerro
t.append('<polygon class="cal" points="44,62 60,62 57,22 47,22"/>')                          # torre
t.append('<polygon class="celeste" points="45.4,36 58.6,36 58.9,42 45.1,42"/><polygon class="celeste" points="44.6,50 59.4,50 59.7,56 44.3,56"/>')
t.append('<rect class="tinta" x="45" y="12" width="14" height="11" rx="2"/><rect class="ventana" x="48" y="14.5" width="8" height="6" rx="1"/>')
t.append('<polygon class="tinta" points="43,12 61,12 52,4"/>')
t.append('<rect class="cal" x="70" y="48" width="22" height="16"/><polygon class="cal" points="68,49 94,49 81,39"/>')
t.append('<path class="tinta" d="M78,64 v-8 a3,3 0 0 1 6,0 v8 z"/><path class="cal-trazo" stroke-width="1.6" d="M81,39 v-8 M78,34 h6"/>')
# escalinata hacia el faro
t.append('<path class="cal-trazo" stroke-width="4" d="M14,112 L30,98 L22,90 L40,78 L34,72 L48,64"/>')
t.append('<path class="trazo" stroke-width="4" stroke-dasharray="1 3.5" d="M14,112 L30,98 L22,90 L40,78 L34,72 L48,64" opacity=".6"/>')
for x, y, c in ((70, 82, "mango"), (84, 80, "celeste"), (96, 86, "buganvilla"), (60, 92, "cal"), (78, 96, "mango"), (94, 100, "cal")):
    t.append(f'<rect class="{c}" x="{x}" y="{y}" width="12" height="12"/><rect class="tinta" x="{x-1}" y="{y-2}" width="14" height="2"/>')
turismo = afiche("tur", "faro", "".join(t), "Lugares turísticos")

# ---------- Ejercicio: un samán y una bicicleta en el parque ----------
e = []
e.append('<path class="tinta" d="M0,96 H112 V112 H0 Z"/>')                                   # sendero
e.append('<path class="cal-trazo" stroke-width="2" stroke-dasharray="6 6" d="M0,104 H112"/>')
e.append('<path class="tinta" d="M28,96 q2,-26 -4,-40 h8 q2,14 6,40 z"/>')                     # tronco
for cx, cy, rr in ((14, 42, 14), (30, 30, 18), (50, 36, 16), (40, 48, 12), (20, 54, 10)):     # copa del samán
    e.append(f'<circle class="mango" cx="{cx}" cy="{cy}" r="{rr}"/>')
# bicicleta
e.append('<circle class="cal-trazo" stroke-width="4" cx="64" cy="82" r="11"/><circle class="cal-trazo" stroke-width="4" cx="96" cy="82" r="11"/>')
e.append('<path class="trazo" stroke-width="3" d="M64,82 L74,66 L90,66 L96,82 M74,66 L80,82 L90,66 M80,82 L64,82 M71,61 h8 M90,66 l-2,-8 h6"/>')
e.append('<circle class="tinta" cx="80" cy="82" r="2.5"/>')
ejercicio = afiche("eje", "manglar", "".join(e), "Dónde hacer ejercicio")

# ---------- Paseos: la noria del malecón sobre el río ----------
p = []
p.append('<circle class="mango" cx="88" cy="22" r="10"/>')
cx, cy, R = 50, 50, 32
p.append(f'<circle class="cal-trazo" stroke-width="3" cx="{cx}" cy="{cy}" r="{R}"/>')
p.append('<path class="cal-trazo" stroke-width="1.5" d="' + " ".join(f"M{cx},{cy} L{cx + R*math.cos(math.radians(a)):.1f},{cy + R*math.sin(math.radians(a)):.1f}" for a in range(0, 360, 30)) + '"/>')
for a in range(0, 360, 45):
    x, y = cx + R * math.cos(math.radians(a)), cy + R * math.sin(math.radians(a))
    p.append(f'<rect class="tinta" x="{x-4:.1f}" y="{y-1:.1f}" width="8" height="8" rx="2"/>')
p.append(f'<circle class="tinta" cx="{cx}" cy="{cy}" r="4"/>')
p.append(f'<path class="tinta" d="M{cx-4},{cy} L{cx-18},96 h6 L{cx},{cy+8} L{cx+12},96 h6 L{cx+4},{cy} z"/>')   # patas
p.append('<rect class="tinta" x="0" y="94" width="112" height="4"/>')                       # malecón
p.append('<path class="trazo" stroke-width="1.5" d="M0,90 H112 ' + " ".join(f"M{x},90 v4" for x in range(4, 112, 8)) + '"/>')
p.append('<rect class="celeste" x="0" y="98" width="112" height="14"/>')
p.append('<path class="cal-trazo" stroke-width="1.8" d="M8,105 q5,-3 10,0 t10,0 M58,106 q5,-3 10,0 t10,0 M86,103 q5,-3 10,0 t10,0"/>')
p.append('<path class="tinta" d="M96,94 q-2,-20 2,-34 h3 q-2,16 0,34 z"/>')                     # palmera
for a in (-160, -120, -60, -20):
    x, y = 99 + 16 * math.cos(math.radians(a)), 58 + 10 * math.sin(math.radians(a)) + 6
    p.append(f'<path class="tinta" d="M99,58 Q{(99+x)/2:.1f},{min(58,y)-6:.1f} {x:.1f},{y:.1f} Q{(99+x)/2:.1f},{min(58,y)-1:.1f} 99,60 z"/>')
paseos = afiche("pas", "buganvilla", "".join(p), "Dónde pasear")

import json, sys
json.dump({"restaurantes": restaurantes, "hoteles": hoteles, "turismo": turismo, "ejercicio": ejercicio, "paseos": paseos},
          open(sys.argv[1] if len(sys.argv) > 1 else "afiches.json", "w"), ensure_ascii=False)
