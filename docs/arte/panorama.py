"""Genera la ilustración del Cerro Santa Ana (panorama) como SVG con clases ligadas a tokens.
Uso: python3 panorama.py > panorama.svg   (determinista: misma salida siempre)"""
import random, math

W, H = 960, 400
RIO_Y = 330          # orilla
rnd = random.Random(444)  # semilla: los 444 escalones

def smooth(t):
    t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)

def cerro(x):
    """Altura (y) de la ladera en x."""
    if x < 40: return RIO_Y
    if x <= 600: return RIO_Y - (RIO_Y - 104) * smooth((x - 40) / 560)
    if x <= 700: return 104
    return 104 + (262 - 104) * smooth((x - 700) / 260)

out = []
add = out.append

# ---------- estilos: cada color es un token ----------
add('''<style>
.cielo{fill:var(--celeste-suave)} .astro{fill:var(--mango)} .lejos{fill:var(--celeste);opacity:.35}
.ladera{fill:var(--manglar)} .rio-agua{fill:var(--celeste)} .ola{stroke:var(--papel-alto);stroke-width:2;fill:none;stroke-linecap:round;opacity:.7}
.malecon{fill:var(--papel-alto)} .tinta{fill:var(--on-color)} .trazo{stroke:var(--on-color);fill:none;stroke-linecap:round;stroke-linejoin:round}
.blanco{fill:var(--papel-alto)} .cal{fill:var(--papel-alto)} .palma{fill:var(--on-color)} .palma-tronco{stroke:var(--on-color);fill:none;stroke-linecap:round} .flor{fill:var(--buganvilla)} .ventana{fill:var(--papel-alto)} .mango{fill:var(--mango)} .faro{fill:var(--faro)}
.buganvilla{fill:var(--buganvilla)} .celeste{fill:var(--celeste)} .crema{fill:var(--mango-suave)}
.escalon{stroke:var(--papel-alto);stroke-width:7;fill:none;stroke-linecap:round;stroke-linejoin:round}
.escalon-raya{stroke:var(--on-color);stroke-width:7;fill:none;stroke-dasharray:1.2 4.8;opacity:.55}
.noche{opacity:0} .haz{fill:var(--mango);opacity:0}
.grano{opacity:.16;mix-blend-mode:multiply}
[data-theme="dark"] .cielo{fill:var(--papel)} [data-theme="dark"] .cal{fill:var(--rio);opacity:.88} [data-theme="dark"] .ola{stroke:var(--rio);opacity:.35} [data-theme="dark"] .escalon{stroke:var(--rio);opacity:.8} [data-theme="dark"] .palma{fill:var(--linea)} [data-theme="dark"] .palma-tronco{stroke:var(--linea)} [data-theme="dark"] .malecon{fill:var(--linea)} [data-theme="dark"] .astro{fill:var(--rio)}
[data-theme="dark"] .ventana{fill:var(--mango)} [data-theme="dark"] .noche{opacity:1}
[data-theme="dark"] .haz{opacity:.13} [data-theme="dark"] .rio-agua{fill:var(--celeste-suave)}
[data-theme="dark"] .ladera{fill:var(--manglar);opacity:.7} [data-theme="dark"] .grano{mix-blend-mode:screen;opacity:.1}
</style>''')
add('''<defs>
<filter id="grano" x="0" y="0" width="100%" height="100%">
<feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch"/>
<feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 1.4 -.55"/>
</filter>
<clipPath id="marco"><rect width="960" height="400"/></clipPath>
</defs>''')
add('<g clip-path="url(#marco)">')

# ---------- cielo, astro, estrellas ----------
add(f'<rect class="cielo" width="{W}" height="{H}"/>')
add('<circle class="astro" cx="150" cy="96" r="44"/>')
for _ in range(40):
    x, y = rnd.uniform(10, 950), rnd.uniform(8, 200)
    if (x - 150) ** 2 + (y - 96) ** 2 < 56 ** 2: continue
    add(f'<circle class="noche cal" cx="{x:.0f}" cy="{y:.0f}" r="{rnd.choice([0.8,1,1.3]):.1f}"/>')

# ---------- ciudad lejana (derecha) ----------
x = 720
while x < 960:
    w, h = rnd.randint(18, 34), rnd.randint(40, 130)
    add(f'<rect class="lejos" x="{x}" y="{RIO_Y - h}" width="{w}" height="{h}"/>')
    x += w + rnd.randint(2, 8)

# ---------- ladera ----------
pts = " ".join(f"{x},{cerro(x):.1f}" for x in range(0, 961, 8))
add(f'<path class="ladera" d="M0,{RIO_Y} L{pts} L960,{RIO_Y} Z"/>')

# ---------- faro y capilla en la cima ----------
fx = 640
add(f'<polygon class="haz" points="{fx},36 {fx-230},20 {fx-230},50"/>')
add(f'<polygon class="haz" points="{fx},36 {fx+230},20 {fx+230},50"/>')
add(f'<rect class="tinta" x="{fx-16}" y="98" width="32" height="8" rx="2"/>')
add(f'<polygon class="cal" points="{fx-12},98 {fx+12},98 {fx+8},40 {fx-8},40"/>')
for yy in (56, 76):
    add(f'<polygon class="celeste" points="{fx-10.6+ (98-yy-6)*0.0},{yy} {fx+10.6},{yy} {fx+10.2},{yy+7} {fx-10.2},{yy+7}"/>')
add(f'<rect class="tinta" x="{fx-9}" y="30" width="18" height="11" rx="2"/>')
add(f'<rect class="ventana" x="{fx-5}" y="32.5" width="10" height="6" rx="1"/>')
add(f'<polygon class="tinta" points="{fx-11},30 {fx+11},30 {fx},20"/>')
add(f'<path class="trazo" stroke-width="1.5" d="M{fx-14},98 L{fx-14},92 M{fx+14},98 L{fx+14},92"/>')
cx = 690
add(f'<rect class="cal" x="{cx}" y="76" width="34" height="28"/>')
add(f'<polygon class="cal" points="{cx-2},77 {cx+36},77 {cx+17},62"/>')
add(f'<path class="tinta" d="M{cx+13},104 v-12 a4,4 0 0 1 8,0 v12 z"/>')
add(f'<rect class="cal" x="{cx+12}" y="46" width="10" height="18"/>')
add(f'<path class="trazo" stroke-width="1.6" d="M{cx+17},46 v-9 M{cx+13},40 h8"/>')
# bandera de Guayaquil
bx = 600
add(f'<path class="trazo" stroke-width="1.6" d="M{bx},104 V44"/>')
for i, cls in enumerate(["celeste", "cal", "celeste", "cal", "celeste"]):
    add(f'<rect class="{cls}" x="{bx+1}" y="{44 + i*4.4:.1f}" width="30" height="4.4"/>')
for sx in (bx + 8, bx + 16, bx + 24):
    add(f'<circle class="celeste" cx="{sx}" cy="54.8" r="1.4"/>')

# ---------- casas por filas (de atrás hacia adelante) ----------
COLORES = ["mango", "faro", "buganvilla", "celeste", "crema", "cal"]
def casa(x, base, w, h, color, frente):
    g = []
    g.append(f'<rect class="{color}" x="{x}" y="{base-h}" width="{w}" height="{h}"/>')
    # alero / techo de zinc
    g.append(f'<polygon class="tinta" points="{x-3},{base-h} {x+w+3},{base-h} {x+w-1},{base-h-5} {x+1},{base-h-5}"/>')
    pisos = 2 if h >= 38 else 1
    for p in range(pisos):
        wy = base - h + 8 + p * 18
        n = max(1, int((w - 6) // 14))
        gap = (w - n * 8) / (n + 1)
        for k in range(n):
            vx = x + gap + k * (8 + gap)
            g.append(f'<rect class="ventana" x="{vx:.1f}" y="{wy}" width="8" height="10" rx="1"/>')
            g.append(f'<path class="trazo" stroke-width=".8" d="M{vx+4:.1f},{wy} v10"/>')
        if p == 0 and pisos == 2 and rnd.random() < .7:
            # balcón de madera con balaustres
            by = wy + 12
            g.append(f'<rect class="tinta" x="{x-1}" y="{by}" width="{w+2}" height="2"/>')
            bal = " ".join(f"M{x+1+i*3.2:.1f},{by+2} v5" for i in range(int((w) // 3.2)))
            g.append(f'<path class="trazo" stroke-width=".9" d="{bal} M{x-1},{by+7} h{w+2}"/>')
            if rnd.random() < .45:
                fx0 = x + rnd.uniform(2, w - 10)
                for _ in range(9):
                    g.append(f'<circle class="flor" cx="{fx0 + rnd.uniform(0, 10):.1f}" cy="{by + rnd.uniform(-2, 9):.1f}" r="{rnd.uniform(1.6, 2.6):.1f}"/>')
    if frente:
        dx = x + w / 2 - 4
        g.append(f'<path class="tinta" d="M{dx:.1f},{base} v-11 a4,4 0 0 1 8,0 v11 z"/>')
    return "\n".join(g)

filas = []
base = RIO_Y - 8
fila = 0
while base > 130:
    x = rnd.randint(-10, 10)
    casas = []
    while x < 940:
        w = rnd.choice([30, 34, 38, 42, 46, 52])
        h = rnd.choice([30, 34, 40, 44, 48])
        mid = x + w / 2
        # solo donde hay ladera y lejos del faro
        if cerro(mid) < base - 6 and not (560 < mid < 735 and base < 150):
            casas.append(casa(x, base, w, h, rnd.choice(COLORES), fila == 0))
            x += w + rnd.choice([0, 2, 4, 6])
        else:
            x += 10
    filas.append(casas)
    base -= 34
    fila += 1
for casas in reversed(filas):
    out.extend(casas)

# ---------- escalinata (sube en zigzag hasta el faro) ----------
camino = []
N = 9
for k in range(N + 1):
    t = k / N
    x = 300 + (fx - 24 - 300) * t + (0 if k in (0, N) else (22 if k % 2 else -22))
    y = (RIO_Y - 6) + (104 - (RIO_Y - 6)) * t
    camino.append((x, y))
d = "M" + " L".join(f"{a:.0f},{b:.0f}" for a, b in camino)
add(f'<path class="escalon" d="{d}"/>')
add(f'<path class="escalon-raya" d="{d}"/>')

# ---------- palmeras ----------
def palmera(x, base, alto):
    top = base - alto
    g = [f'<path class="palma-tronco" stroke-width="3" d="M{x},{base} q-4,{-alto/2} 3,{-alto}"/>']
    for ang in (-150, -110, -60, -20, 200, 160):
        r = math.radians(ang)
        ex, ey = x + 3 + 22 * math.cos(r), top + 10 + 14 * math.sin(r) * -0.6 + 8
        g.append(f'<path class="palma" d="M{x+3},{top} q{(ex-x-3)/2:.1f},{-8} {ex-x-3:.1f},{ey-top:.1f} q{-(ex-x-3)/3:.1f},{-4} {-(ex-x-3):.1f},{-(ey-top):.1f} z"/>')
    return "\n".join(g)
for px, alto in ((60, 70), (250, 58), (470, 54), (880, 66)):
    add(palmera(px, RIO_Y - 4, alto))

# ---------- malecón y río ----------
add(f'<rect class="malecon" x="0" y="{RIO_Y-4}" width="{W}" height="10"/>')
add(f'<path class="trazo" stroke-width="1.2" d="M0,{RIO_Y-10} H{W} ' + " ".join(f"M{x},{RIO_Y-10} v6" for x in range(4, W, 12)) + '"/>')
add(f'<rect class="rio-agua" x="0" y="{RIO_Y+6}" width="{W}" height="{H-RIO_Y}"/>')
for i in range(14):
    x = rnd.randint(0, 900); y = rnd.randint(RIO_Y + 18, H - 10); w = rnd.randint(30, 70)
    add(f'<path class="ola" d="M{x},{y} q{w/4:.0f},-5 {w/2:.0f},0 t{w/2:.0f},0"/>')
# balandra
bx, by = 760, RIO_Y + 40
add(f'<path class="tinta" d="M{bx-26},{by} h52 l-8,9 h-36 z"/>')
add(f'<path class="trazo" stroke-width="1.6" d="M{bx},{by} V{by-40}"/>')
add(f'<polygon class="cal" points="{bx+2},{by-38} {bx+2},{by-4} {bx+26},{by-4}"/>')
add(f'<polygon class="mango" points="{bx-2},{by-34} {bx-2},{by-4} {bx-20},{by-4}"/>')

# ---------- grano de serigrafía ----------
add(f'<rect class="grano" width="{W}" height="{H}" filter="url(#grano)"/>')
add('</g>')

print(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Ilustración del Cerro Santa Ana: casas de colores, la escalinata y el faro sobre el río Guayas">')
print("\n".join(out))
print("</svg>")
