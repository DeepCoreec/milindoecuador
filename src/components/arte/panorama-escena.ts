// Escena del Panorama del Cerro Santa Ana en pixel art (240 x 100).
// Copia fiel de docs/arte/panorama-pixel.html, aprobada por el usuario. Siempre de noche (data-theme="dark").
type RGB = [number, number, number];
type Colores = Record<string, RGB>;

const W = 240;
const H = 100;
const RIO = 80;

function hex(v: string): RGB {
  v = (v || "").trim();
  if (v[0] === "#") {
    if (v.length === 4) v = "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
  }
  const m = v.match(/\d+(\.\d+)?/g) ?? ["0", "0", "0"];
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const sm = (t: number) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
function cerro(x: number) {
  if (x < 10) return RIO;
  if (x <= 150) return RIO - 54 * sm((x - 10) / 140);
  if (x <= 175) return 26;
  return 26 + 40 * sm((x - 175) / 65);
}

type Casa = { x: number; y: number; w: number; h: number; color: string; balcon: boolean; puerta: boolean; flor: boolean };
type Ventana = { x: number; y: number; w: number; on: boolean; fase: number };

export function crearEscena(cv: HTMLCanvasElement) {
  const cx = cv.getContext("2d");
  if (!cx) throw new Error("El navegador no permite dibujar en canvas");
  const C: Colores = {};
  let noche = false;

  function leerColores() {
    const s = getComputedStyle(cv);
    for (const k of ["papel", "papel-alto", "rio", "celeste", "celeste-suave", "mango", "mango-suave", "faro", "manglar", "buganvilla", "on-color", "linea"]) {
      C[k] = hex(s.getPropertyValue("--" + k));
    }
    const p = C.papel;
    noche = (p[0] + p[1] + p[2]) / 3 < 100;
    C.cal = noche ? mix(C.rio, C.papel, 0.12) : C["papel-alto"];
    C.tinta = C["on-color"];
    C.crema = noche ? mix(C.mango, C.papel, 0.55) : C["mango-suave"];
    C.cielo1 = noche ? mix(C.papel, [0, 0, 0], 0.35) : mix(C["celeste-suave"], C.celeste, 0.45);
    C.cielo2 = noche ? C.papel : mix(C["celeste-suave"], C.celeste, 0.2);
    C.cielo3 = noche ? mix(C.papel, C.celeste, 0.12) : C["celeste-suave"];
    C.agua = noche ? mix(C["celeste-suave"], C.papel, 0.25) : C.celeste;
    C.agua2 = noche ? mix(C["celeste-suave"], C.papel, 0.55) : mix(C.celeste, C.tinta, 0.18);
    C.ladera = noche ? mix(C.manglar, C.papel, 0.45) : C.manglar;
    C.lejos = mix(C.celeste, C.cielo2, noche ? 0.75 : 0.55);
  }

  // Azar con semilla (444 escalones): la escena sale siempre igual.
  let seed = 444;
  function rnd() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const pick = <T,>(a: T[]): T => a[(rnd() * a.length) | 0];

  // ---------- escena fija ----------
  let casas: Casa[] = [];
  const ventanas: Ventana[] = [];
  const estrellas: { x: number; y: number; fase: number; v: number }[] = [];
  const ciudad: [number, number, number, number][] = [];
  const nubes: { x: number; y: number; w: number; v: number }[] = [];
  {
    const filas: Casa[][] = [];
    let base = RIO - 2;
    let fila = 0;
    while (base > 32) {
      let x = -2 + ((rnd() * 4) | 0);
      const f: Casa[] = [];
      while (x < 238) {
        const w = pick([7, 8, 9, 10, 12]);
        const h = pick([6, 7, 8, 9, 10]);
        const mid = x + w / 2;
        if (cerro(mid) < base - 2 && !(mid > 136 && mid < 184 && base < 40)) {
          const c: Casa = { x, y: base - h, w, h, color: pick(["mango", "faro", "buganvilla", "celeste", "crema", "cal"]), balcon: h >= 8 && rnd() < 0.6, puerta: fila === 0, flor: rnd() < 0.35 };
          f.push(c);
          for (let wy = c.y + 2; wy + 3 < base - 1; wy += 5) {
            if (w < 10) ventanas.push({ x: c.x + 2, y: wy, w: w - 4, on: rnd() < 0.75, fase: rnd() * 100 });
            else for (let q = 0; q < 3; q++) ventanas.push({ x: c.x + ((w - 8) >> 1) + q * 3, y: wy, w: 2, on: rnd() < 0.75, fase: rnd() * 100 });
          }
          x += w + pick([0, 0, 1, 1, 2]);
        } else x += 3;
      }
      filas.push(f);
      base -= 8;
      fila++;
    }
    for (let i = filas.length - 1; i >= 0; i--) casas = casas.concat(filas[i]);
    for (let i = 0; i < 60; i++) estrellas.push({ x: (rnd() * W) | 0, y: (rnd() * 52) | 0, fase: rnd() * 6.28, v: 0.6 + rnd() * 1.6 });
    for (let cxp = 184; cxp < 240; ) {
      const cw = 4 + ((rnd() * 5) | 0);
      const ch = 10 + ((rnd() * 26) | 0);
      ciudad.push([cxp, RIO - ch, cw, ch]);
      cxp += cw + 1;
    }
    for (let i = 0; i < 3; i++) nubes.push({ x: rnd() * W, y: 8 + rnd() * 22, w: 14 + ((rnd() * 10) | 0), v: 0.6 + rnd() * 0.8 });
  }

  const ctx = cx;
  const px = (x: number, y: number, c: RGB, a?: number) => {
    ctx.fillStyle = css(c, a);
    ctx.fillRect(x | 0, y | 0, 1, 1);
  };
  const rect = (x: number, y: number, w: number, h: number, c: RGB, a?: number) => {
    ctx.fillStyle = css(c, a);
    ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  };
  const circulo = (x0: number, y0: number, r: number, c: RGB) => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(x0 + x, y0 + y, c);
  };

  // ---------- un cuadro de la animación ----------
  function pintar(t: number) {
    rect(0, 0, W, 18, C.cielo1);
    rect(0, 18, W, 20, C.cielo2);
    rect(0, 38, W, RIO - 38, C.cielo3);
    for (let x = 0; x < W; x += 2) {
      px(x + 1, 18, C.cielo1);
      px(x + 1, 38, C.cielo2);
    }

    if (noche) {
      for (const s of estrellas) {
        const a = 0.45 + 0.55 * Math.sin(t * s.v + s.fase);
        if (a > 0.15) px(s.x, s.y, C.cal, a);
      }
      circulo(40, 20, 7, C.cal);
      px(37, 18, C.cielo2, 0.35);
      px(42, 22, C.cielo2, 0.35);
      px(43, 17, C.cielo2, 0.3);
      px(38, 23, C.cielo2, 0.25);
    } else {
      circulo(40, 22, 8, C.mango);
      circulo(38, 20, 3, mix(C.mango, [255, 255, 255], 0.35));
      for (const n of nubes) {
        const nx = ((n.x + t * n.v) % (W + 40)) - 20;
        rect(nx, n.y, n.w, 2, C.cal);
        rect(nx + 3, n.y - 2, n.w - 7, 2, C.cal);
        rect(nx + 6, n.y - 3, 4, 1, C.cal);
      }
    }

    for (const b of ciudad) {
      rect(b[0], b[1], b[2], b[3], C.lejos);
      if (noche) for (let yy = b[1] + 2; yy < RIO - 2; yy += 3) if ((yy * 7 + b[0]) % 5 < 2) px(b[0] + 1, yy, C.mango, 0.7);
    }

    for (let x = 0; x < W; x++) {
      const y0 = Math.round(cerro(x));
      rect(x, y0, 1, RIO - y0, C.ladera);
      px(x, y0, mix(C.ladera, C.cal, 0.25));
    }

    // faro: haz que gira de noche
    const fx = 160;
    const ly = 10;
    const co = Math.cos(t * 0.9);
    if (noche) {
      const largo = Math.abs(co) * 95;
      const dir = co > 0 ? 1 : -1;
      const fuerza = 0.18 + 0.22 * Math.abs(co);
      for (let d = 2; d < largo; d++) {
        const abre = 1 + d * 0.09;
        for (let k = -abre; k <= abre; k++) {
          const borde = 1 - Math.abs(k) / (abre + 0.5);
          px(fx + dir * d, ly + k, C.mango, fuerza * (1 - d / (largo + 1)) * (0.35 + 0.65 * borde));
        }
      }
      if (Math.abs(co) < 0.25) circulo(fx, ly, 3, C.mango);
    }
    rect(fx - 3, 26, 7, 2, C.tinta);
    for (let ty = 12; ty < 26; ty++) {
      const tw = ty > 19 ? 5 : 4;
      rect(fx - ((tw / 2) | 0), ty, tw, 1, ty === 16 || ty === 17 || ty === 21 || ty === 22 ? C.celeste : C.cal);
    }
    rect(fx - 2, 9, 5, 3, C.tinta);
    px(fx, 10, noche || Math.sin(t * 3) > 0 ? C.mango : C.cal);
    px(fx - 1, 10, C.mango, noche ? 1 : 0.6);
    px(fx + 1, 10, C.mango, noche ? 1 : 0.6);
    rect(fx - 1, 7, 3, 1, C.tinta);
    px(fx, 6, C.tinta);
    rect(fx - 3, 8, 7, 1, C.tinta);
    // capilla
    rect(170, 19, 9, 7, C.cal);
    rect(171, 18, 7, 1, C.cal);
    rect(172, 17, 5, 1, C.cal);
    rect(173, 16, 3, 1, C.cal);
    rect(173, 22, 3, 4, C.tinta);
    rect(174, 11, 2, 5, C.cal);
    px(174, 9, C.tinta);
    px(175, 9, C.tinta);
    rect(174, 8, 1, 3, C.tinta);
    rect(173, 9, 3, 1, C.tinta);
    if (noche) px(174, 23, C.mango, 0.8);
    // bandera de Guayaquil
    rect(141, 11, 1, 16, C.tinta);
    for (let fxp = 0; fxp < 9; fxp++) {
      const off = Math.round(Math.sin(t * 4 - fxp * 0.7) * 0.8);
      for (let fy = 0; fy < 5; fy++) px(142 + fxp, 11 + fy + off, fy % 2 ? C.cal : C.celeste);
    }

    for (const c of casas) {
      const col = C[c.color] ?? C.cal;
      rect(c.x, c.y, c.w, c.h, col);
      rect(c.x + c.w - 1, c.y, 1, c.h, mix(col, C.tinta, 0.28));
      rect(c.x - 1, c.y - 1, c.w + 2, 1, C.tinta);
      if (c.balcon) {
        rect(c.x - 1, c.y + 5, c.w + 2, 1, C.tinta);
        rect(c.x - 1, c.y + 6, c.w + 2, 1, mix(C.tinta, col, 0.55));
      }
      if (c.flor && c.balcon) {
        px(c.x - 1, c.y + 6, C.buganvilla);
        px(c.x, c.y + 6, C.buganvilla);
        px(c.x - 1, c.y + 7, C.buganvilla);
        px(c.x, c.y + 7, mix(C.buganvilla, C.cal, 0.3));
        px(c.x - 1, c.y + 8, C.buganvilla);
      }
      if (c.puerta) rect(c.x + ((c.w / 2) | 0) - 1, c.y + c.h - 3, 2, 3, C.tinta);
    }
    for (const v of ventanas) {
      if (noche) {
        const on = v.on ? Math.sin(t * 0.15 + v.fase) > -0.85 : Math.sin(t * 0.2 + v.fase) > 0.92;
        const apagada = mix(C.tinta, C.papel, 0.3);
        rect(v.x, v.y, v.w, 1, on ? mix(C.mango, C.faro, 0.2) : apagada);
        rect(v.x, v.y + 1, v.w, 1, on ? C.mango : apagada);
      } else {
        rect(v.x, v.y, v.w, 1, mix(C.tinta, C.celeste, 0.15));
        rect(v.x, v.y + 1, v.w, 1, mix(C.tinta, C.celeste, 0.45));
      }
      rect(v.x, v.y + 2, v.w, 1, C.cal, noche ? 0.35 : 0.9);
    }

    // escalinata en zigzag hasta el faro
    const P: [number, number][] = [[74, 78], [92, 72], [84, 64], [104, 57], [96, 50], [118, 43], [110, 36], [136, 31], [156, 27]];
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i];
      const b = P[i + 1];
      const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
      for (let s = 0; s <= n; s++) {
        const sx = Math.round(a[0] + ((b[0] - a[0]) * s) / n);
        const sy = Math.round(a[1] + ((b[1] - a[1]) * s) / n);
        px(sx, sy, C.cal);
        px(sx, sy - 1, s % 2 ? C.cal : mix(C.cal, C.tinta, 0.35));
        if (noche && s % 7 === 0) px(sx, sy - 2, C.mango);
      }
    }

    // palmeras que se mecen
    const palmeras: [number, number][] = [[16, 70], [58, 76], [124, 74], [226, 74]];
    palmeras.forEach((p, j) => {
      const sw = Math.round(Math.sin(t * 1.3 + j) * 0.9);
      const top = p[1] - 12;
      const hoja = noche ? C.linea : C.tinta;
      for (let yy = top; yy < RIO - 1; yy++) px(p[0] + (yy < top + 4 ? 1 : 0), yy, hoja);
      const hojas: [number, number][] = [[-1, 0], [-2, 0], [-3, 1], [-4, 2], [1, 0], [2, 0], [3, 1], [4, 2], [0, -1], [-1, -1], [1, -1], [-2, -2], [2, -2], [-5, 3], [5, 3]];
      for (const o of hojas) px(p[0] + 1 + o[0] + (Math.abs(o[0]) > 2 ? sw : 0), top + o[1], hoja);
    });

    // malecón con baranda
    rect(0, RIO - 1, W, 2, noche ? C.linea : C.cal);
    for (let x = 1; x < W; x += 3) px(x, RIO - 3, C.tinta);
    rect(0, RIO - 4, W, 1, mix(C.tinta, C.cal, 0.4));

    // río
    rect(0, RIO + 1, W, H - RIO - 1, C.agua);
    rect(0, RIO + 1, W, 1, C.agua2);
    for (let i = 0; i < 18; i++) {
      const wy2 = RIO + 4 + ((i * 7) % 15);
      const wl = 3 + (i % 4);
      const wx2 = ((((i * 37 + t * (i % 2 ? 4 : -3)) % (W + 20)) + W + 20) % (W + 20)) - 10;
      rect(wx2, wy2, wl, 1, C.cal, noche ? 0.25 : 0.55);
    }
    if (noche) {
      for (let x = 2; x < W; x += 5) {
        if (Math.sin(t * 2 + x) > 0.2 && (x * 13) % 7 < 3) rect(x, RIO + 3 + (x % 4), 1, 2, C.mango, 0.45);
      }
    }

    // balandra que cruza el río
    const vx = ((t * 7) % (W + 50)) - 25;
    const vy = RIO + 10 + Math.round(Math.sin(t * 2.2) * 0.6);
    for (let i = 1; i < 8; i++) if (i % 2) px(vx - 4 - i * 2, vy + 2, C.cal, 0.6 - i * 0.07);
    rect(vx - 6, vy + 1, 14, 2, C.tinta);
    rect(vx - 5, vy + 3, 12, 1, C.tinta);
    rect(vx, vy - 9, 1, 10, C.tinta);
    for (let i = 0; i < 8; i++) rect(vx + 1, vy - 8 + i, Math.ceil(i * 0.75) + 1, 1, C.cal);
    for (let i = 0; i < 6; i++) rect(vx - 1 - Math.ceil(i * 0.6), vy - 6 + i, Math.ceil(i * 0.6) + 1, 1, C.mango);
    if (noche) px(vx, vy - 10, C.faro);
    rect(vx - 4, vy + 5, 10, 1, C.tinta, 0.25);
  }

  return { pintar, leerColores, ancho: W, alto: H };
}
