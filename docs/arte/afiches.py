"""Cinco mini afiches ilustrados, uno por categoría. Salida: SVGs 112x112 con clases ligadas a tokens."""
import math, random

ESTILO = '''<style>
.tinta{fill:var(--on-color)} .trazo{stroke:var(--on-color);fill:none;stroke-linecap:round;stroke-linejoin:round}
.cal{fill:var(--papel-alto)} .cal-trazo{stroke:var(--papel-alto);fill:none;stroke-linecap:round;stroke-linejoin:round}
.mango{fill:var(--mango)} .faro{fill:var(--faro)} .celeste{fill:var(--celeste)} .manglar{fill:var(--manglar)}
.buganvilla{fill:var(--buganvilla)} .celeste-tinta{fill:var(--celeste-tinta)} .ventana{fill:var(--mango)} .grano{opacity:.18;mix-blend-mode:multiply}
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

# ======================= categorías nuevas =======================

# ---------- Cafés y heladerías: café humeante y un helado de paila ----------
c = []
c.append('<path class="cal-trazo" stroke-width="2.5" d="M30,30 q-5,-6 0,-11 t0,-11 M42,30 q-5,-6 0,-11 t0,-11"/>')
c.append('<ellipse class="tinta" cx="38" cy="86" rx="28" ry="5"/>')                          # plato
c.append('<path class="cal" d="M16,40 h44 l-4,34 a8,8 0 0 1 -8,7 h-20 a8,8 0 0 1 -8,-7 z"/>')  # taza
c.append('<path class="cal-trazo" stroke-width="5" d="M59,48 q12,2 8,14 q-3,7 -10,6"/>')       # asa
c.append('<ellipse class="tinta" cx="38" cy="41" rx="22" ry="4"/>')                            # café
c.append('<path class="trazo" stroke-width="2" d="M22,58 h32"/>')
c.append('<polygon class="mango" points="78,64 98,64 88,104"/>')                                 # cono
c.append('<path class="trazo" stroke-width="1.5" d="M81,70 l11,16 M85,64 l10,14 M95,70 l-11,16 M91,64 l-10,14"/>')
c.append('<circle class="buganvilla" cx="88" cy="56" r="11"/><circle class="cal" cx="82" cy="48" r="9"/><circle class="faro" cx="88" cy="36" r="4"/>')
c.append('<path class="trazo" stroke-width="1.5" d="M88,32 q2,-5 6,-6"/>')
cafes = afiche("caf", "celeste-tinta", "".join(c), "Cafés y heladerías")

# ---------- Vida nocturna: luces colgantes, un cóctel y música ----------
n = []
n.append('<path class="cal-trazo" stroke-width="1.5" d="M-2,14 Q28,34 56,16 Q84,34 114,14"/>')
for x, y in ((10, 21), (24, 26), (38, 25), (50, 19), (64, 21), (78, 26), (92, 25), (104, 19)):
    n.append(f'<circle class="mango" cx="{x}" cy="{y+5}" r="3.4"/>')
n.append('<path class="cal" d="M30,48 h40 l-20,24 z"/>')                                        # copa
n.append('<path class="buganvilla" d="M36,52 h28 l-14,16.8 z"/>')                               # bebida
n.append('<rect class="cal" x="48.6" y="70" width="2.8" height="20"/><rect class="cal" x="38" y="89" width="24" height="3" rx="1.5"/>')
n.append('<circle class="mango" cx="66" cy="49" r="6"/><path class="trazo" stroke-width="1.2" d="M66,43 v12 M60,49 h12" opacity=".6"/>')  # limón
n.append('<path class="cal-trazo" stroke-width="2" d="M56,40 l10,-10"/>')                        # sorbete
n.append('<path class="cal" d="M84,82 a5,4 0 1 1 0.1,0 z M94,78 a5,4 0 1 1 0.1,0 z"/>')
n.append('<path class="cal-trazo" stroke-width="2.4" d="M88,82 V58 L98,55 V78"/>')               # nota musical
n.append('<rect x=".75" y=".75" width="110.5" height="110.5" rx="11.5" fill="none" stroke="var(--linea)" stroke-width="1.5"/>')
nocturna = afiche("noc", "tinta", "".join(n), "Vida nocturna")

# ---------- Museos y cultura: máscaras de teatro y un cuadro ----------
m = []
m.append('<rect class="tinta" x="62" y="14" width="38" height="30" rx="2"/><rect class="celeste" x="66" y="18" width="30" height="22"/>')
m.append('<circle class="mango" cx="88" cy="25" r="4"/><path class="manglar" d="M66,40 l10,-10 l8,6 l6,-4 l6,8 z"/>')  # paisaje del cuadro
m.append('<path class="trazo" stroke-width="1.5" d="M81,14 l0,-6"/>')
# máscara alegre
m.append('<path class="cal" d="M14,42 h38 v20 a19,22 0 0 1 -38,0 z"/>')
m.append('<path class="tinta" d="M21,52 q5,-5 10,0 q-5,3 -10,0 z M35,52 q5,-5 10,0 q-5,3 -10,0 z"/>')
m.append('<path class="tinta" d="M22,66 q11,12 22,0 q-11,5 -22,0 z"/>')
# máscara triste, superpuesta
m.append('<path class="tinta" d="M44,62 h38 v18 a19,22 0 0 1 -38,0 z"/>')
m.append('<path class="cal" d="M51,72 q5,4 10,0 q-5,-3 -10,0 z M65,72 q5,4 10,0 q-5,-3 -10,0 z"/>')
m.append('<path class="cal" d="M53,94 q10,-10 20,0 q-10,-5 -20,0 z"/>')
m.append('<path class="cal-trazo" stroke-width="2" d="M44,64 q-8,6 -10,16 M82,64 q8,4 12,14"/>')  # cintas
museos = afiche("mus", "faro", "".join(m), "Museos y cultura")

# ---------- Compras y mercados: un puesto con toldo y frutas ----------
k = []
for i in range(6):
    k.append(f'<path class="{"faro" if i % 2 == 0 else "cal"}" d="M{4+i*17.3:.1f},18 h17.3 v18 a8.65,7 0 0 1 -17.3,0 z"/>')
k.append('<rect class="tinta" x="2" y="14" width="108" height="5" rx="2"/>')
k.append('<rect class="tinta" x="10" y="36" width="4" height="70"/><rect class="tinta" x="98" y="36" width="4" height="70"/>')
k.append('<rect class="tinta" x="6" y="80" width="100" height="8" rx="2"/>')                    # mostrador
# racimo de guineos: medias lunas amarillas unidas por el tallo
k.append('<path class="trazo" stroke-width="3" d="M36,46 v8"/>')
for dx in (-10, -3, 4, 11):
    k.append(f'<path class="mango" stroke="var(--on-color)" stroke-width="1.2" d="M{36+dx*0.3:.1f},54 q{dx-6},10 {dx},26 q2,2 4,0 q{-dx*0.4-4},-12 {-dx*0.7+2:.1f},-26 z"/>')
# canasta con naranjas
k.append('<path class="tinta" d="M58,70 h40 l-4,10 h-32 z"/>')
for x, y, cl in ((65, 64, "faro"), (78, 64, "mango"), (91, 64, "faro"), (71.5, 54, "mango"), (84.5, 54, "faro")):
    k.append(f'<circle class="{cl}" stroke="var(--on-color)" stroke-width="1" cx="{x}" cy="{y}" r="6.2"/>')
compras = afiche("com", "manglar", "".join(k), "Compras y mercados")

# ---------- Para niños: una cometa sobre el parque ----------
nk = []
nk.append('<circle class="mango" cx="22" cy="22" r="10"/>')
nk.append('<path class="manglar" d="M0,112 V92 Q40,78 112,96 V112 Z"/>')
nk.append('<polygon class="celeste" points="70,10 92,34 70,64 48,34"/>')
nk.append('<polygon class="mango" points="70,10 92,34 70,34"/><polygon class="mango" points="70,34 70,64 48,34"/>')
nk.append('<path class="trazo" stroke-width="2" d="M70,10 V64 M48,34 H92"/>')
nk.append('<path class="cal-trazo" stroke-width="2" d="M70,64 q-8,10 -2,18 t-6,18 q-4,6 -14,8"/>')  # cola
for x, y in ((66, 72), (68, 86), (58, 100)):
    nk.append(f'<path class="faro" d="M{x-5},{y-3} l5,3 l-5,3 z M{x+5},{y-3} l-5,3 l5,3 z"/>')   # lacitos
nk.append('<path class="tinta" d="M30,96 a6,6 0 1 1 0.1,0 z"/><path class="trazo" stroke-width="3" d="M30,96 v-2"/>')
nk.append('<path class="trazo" stroke-width="1.2" d="M70,64 L34,92"/>')                           # hilo hasta el niño
nk.append('<rect class="tinta" x="27" y="96" width="7" height="12" rx="3"/>')
ninos = afiche("nin", "buganvilla", "".join(nk), "Para niños")

# ---------- Naturaleza y aventura: una iguana sobre una rama del manglar ----------
v = []
v.append('<rect class="manglar" x="0" y="0" width="112" height="10"/>' + "".join(f'<circle class="manglar" cx="{x}" cy="{y}" r="{r}"/>' for x, y, r in ((4, 10, 14), (22, 14, 12), (40, 10, 13), (58, 14, 12), (76, 10, 13), (94, 14, 12), (110, 10, 14))))  # copa arriba
v.append('<rect class="celeste" x="0" y="88" width="112" height="24"/>')
v.append('<path class="cal-trazo" stroke-width="1.8" d="M6,100 q5,-3 10,0 t10,0 M70,104 q5,-3 10,0 t10,0"/>')
v.append('<path class="trazo" stroke-width="3" d="M16,88 q4,-12 10,-20 M30,90 q-2,-12 -6,-22 M86,90 q-2,-12 6,-22 M100,88 q-4,-12 -10,-20"/>')  # raíces
v.append('<path class="tinta" d="M6,64 q50,-8 100,0 v5 q-50,-7 -100,0 z"/>')                     # rama
# iguana grande, verde con contorno de tinta
v.append('<path class="manglar" stroke="var(--on-color)" stroke-width="1.6" stroke-linejoin="round" d="M24,63 q12,-18 36,-16 q14,1 22,-6 l12,-3 q6,1 6,6 q-2,6 -10,7 q-10,2 -14,9 q-20,6 -52,3 z"/>')
v.append('<path class="trazo" stroke-width="2.4" d="M24,63 q-12,4 -16,16 q-2,8 6,10"/>')          # cola
v.append('<path class="tinta" d="M40,48 l3,-7 l3,6 l3,-7 l3,6 l3,-7 l3,6 l3,-7 l3,6 l3,-6 l2,5 z"/>')  # cresta
v.append('<circle class="cal" cx="94" cy="42" r="2.2"/><circle class="tinta" cx="94.6" cy="42" r="1"/>')
v.append('<path class="trazo" stroke-width="2.4" d="M44,62 l-3,8 M70,58 l3,9"/>')                  # patas
v.append('<path class="mango" d="M84,52 q4,6 0,10 q-4,-4 0,-10 z" opacity=".9"/>')                 # papada
naturaleza = afiche("nat", "mango", "".join(v), "Naturaleza y aventura")

# ---------- "Todas las categorías": mosaico con los colores de la guía ----------
t2 = []
cols = ["mango", "celeste", "faro", "manglar", "buganvilla", "celeste-tinta", "tinta", "mango", "faro"]
for i, cl in enumerate(cols):
    x, y = 20 + (i % 3) * 26, 20 + (i // 3) * 26
    t2.append(f'<rect class="{cl}" x="{x}" y="{y}" width="20" height="20" rx="4"/>')
todas = afiche("tod", "cal", "".join(t2), "Todas las categorías")

import json, sys
json.dump({"todas": todas, "restaurantes": restaurantes, "hoteles": hoteles, "turismo": turismo, "ejercicio": ejercicio, "paseos": paseos,
           "cafes": cafes, "nocturna": nocturna, "museos": museos, "compras": compras, "ninos": ninos, "naturaleza": naturaleza},
          open(sys.argv[1] if len(sys.argv) > 1 else "afiches.json", "w"), ensure_ascii=False)
