/*
 * Paumi en pixel art (versión 3, paso 15.1): una guacamaya verde de Guayaquil (Ara ambiguus guayaquilensis) de 32 x 32,
 * dibujada a mano letra por letra (cada letra es un color, "." es transparente). Mismo estilo que el Panorama.
 * Se arma por capas: ala levantada (solo al aletear) → cuerpo → cabeza (se puede mover 1 cuadrito) → ojos → pico.
 * Los colores son variables del sistema de diseño (y mezclas de ellas): cambian solos entre modo claro y oscuro.
 */

export type EstadoPaumi = "esperando" | "escuchando" | "pensando" | "hablando" | "contento";

export type Pose = {
  ojos: "abiertos" | "cerrados" | "arriba" | "felices";
  picoAbierto: boolean;
  alaArriba: boolean;
  /** Movimiento de la cabeza en cuadritos (x, y) */
  cabeza: readonly [number, number];
  /** Puntos suspensivos sobre la cabeza (0 a 3) */
  puntos: number;
};

export const LADO = 32;

const mezcla = (a: string, b: string, p: number) => `color-mix(in srgb, var(--${a}) ${p}%, var(--${b}))`;

/** Letra → color. "cal" es el blanco de las ilustraciones (papel-alto de día, rio de noche; ver globals.css). */
export const PALETA: Record<string, string> = {
  k: "var(--on-color)", // tinta del contorno (igual en los dos modos, como en las ilustraciones)
  g: "var(--manglar)", // plumas verdes
  h: mezcla("manglar", "on-color", 65), // sombra verde
  l: mezcla("manglar", "cal", 65), // pecho con luz
  r: "var(--faro)", // frente roja y líneas de la cara
  R: mezcla("faro", "on-color", 70), // cola rojiza
  w: "var(--cal)", // cara blanca
  y: "var(--mango)", // ojo amarillo
  e: "var(--on-color)", // pupila
  n: "var(--linea-fuerte)", // pico y patas
  q: mezcla("linea-fuerte", "cal", 50), // brillo del pico
  N: mezcla("linea-fuerte", "on-color", 55), // pico de abajo
  b: "var(--celeste)", // plumas azules de las alas y la cola
  c: mezcla("celeste", "on-color", 70), // sombra azul
  o: mezcla("mango", "on-color", 45), // rama
  O: mezcla("mango", "on-color", 25), // sombra de la rama
};

// Filas 0 a 14
const CABEZA = [
  "................................",
  "................................",
  "...........kkkkkkk..............",
  ".........kkgggrrrkk.............",
  "........kgggggrrrrrk............",
  ".......kggggggrrrrrrk...........",
  ".......kgggggwwwrrrrkkk.........",
  "......kggggggwwwwwwkqqqnk.......",
  "......kgggggwwkkwwwkqnnnnk......",
  "......kgggggwkyekwwknnnnnnk.....",
  "......kgggggwkeekwrknnnnnnnk....",
  "......kggggggwkkwrwkkkknnnnk....",
  "......kgggggggwrwwwkNNNknnnk....",
  "......kggggggggwwwwkNNNkknk.....",
  "......kgggggggggwwwkkkk..kk.....",
];

// Filas 15 a 31: con el ala doblada (azul abajo) y la cola rojiza con punta azul, sobre la rama
const CUERPO = [
  ".....kgggggggggggkk.............",
  ".....kgggggggggggggk............",
  "....khhhgggggggggllk............",
  "....khhhhhgggggggglk............",
  "....khhbhhhggggggglk............",
  "....khbbhhhhggggggk.............",
  "....kbbcbhhhhggggk..............",
  "....kbcbbbhhhhgggk..............",
  "....kcbcbcbhhhkngnk.............",
  ".oooookRrRkooonnonnoooooooooooo.",
  ".OOOOOkRrRkOOOOOOOOOOOOOOOOOOO..",
  "....kRrRk.......................",
  "....kRrRk.......................",
  "...kbRbk........................",
  "...kbcbk........................",
  "..kbbck.........................",
  "..kkkk..........................",
];

// Filas 17 a 23 del cuerpo cuando el ala está levantada (sin el ala doblada)
const CUERPO_SIN_ALA = [
  "....khgggggggggggllk............",
  "....khgggggggggggglk............",
  "....khgggggggggggglk............",
  "....khggggggggggggk.............",
  "....khgggggggggggk..............",
  "....khhhgggggggggk..............",
  "....khhhhhhhhhkngnk.............",
];

// Ala levantada (filas 3 a 16), detrás de la cabeza: plumas azules en la punta y verdes junto al cuerpo
const ALA = ["kk", "kbk", "kbbk", "kcbbk", "kbcbbk", "kcbcbgk", ".kbcggk", ".kcbggk", "..kbggk", "..kcggk", "..khggk", "...khgk", "...khhk", "....khh"];

// Ojo: 4 x 4 desde la columna 13, fila 8
const OJOS: Record<Pose["ojos"], string[]> = {
  abiertos: ["wkkw", "kyek", "keek", "wkkw"],
  cerrados: ["wwww", "wwww", "kkkk", "wwww"],
  arriba: ["wkkw", "keek", "kyyk", "wkkw"],
  felices: ["wwww", "wkkw", "kwwk", "wwww"],
};

// Pico abierto: desde la columna 19, fila 11 (la lengua roja se ve)
const PICO_ABIERTO = ["kkkknnnnk", "kRRRknnnk", "kkRRkknk.", "kNNkk.kk.", "kkk......"];

function pintar(lienzo: string[][], dibujo: readonly string[], x0: number, y0: number) {
  dibujo.forEach((fila, y) => {
    for (let x = 0; x < fila.length; x++) {
      const c = fila[x];
      const yy = y0 + y;
      const xx = x0 + x;
      if (c !== "." && yy >= 0 && yy < LADO && xx >= 0 && xx < LADO) lienzo[yy][xx] = c;
    }
  });
}

/** Arma el dibujo de una pose: 32 filas de 32 letras. */
export function componer(p: Pose): string[] {
  const lienzo = Array.from({ length: LADO }, () => Array<string>(LADO).fill("."));
  const [dx, dy] = p.cabeza;
  if (p.alaArriba) pintar(lienzo, ALA, 0, 3);
  pintar(lienzo, CUERPO, 0, 15);
  if (p.alaArriba) pintar(lienzo, CUERPO_SIN_ALA, 0, 17);
  pintar(lienzo, CABEZA, dx, dy);
  pintar(lienzo, OJOS[p.ojos], 13 + dx, 8 + dy);
  if (p.picoAbierto) pintar(lienzo, PICO_ABIERTO, 19 + dx, 11 + dy);
  for (let i = 0; i < p.puntos; i++) pintar(lienzo, ["nn"], 22 + i * 3, 1 + dy);
  return lienzo.map((f) => f.join(""));
}

/** Convierte el dibujo en un camino SVG por color (tramos horizontales unidos: pocos nodos; letras del mismo color, juntas). */
export function caminos(dibujo: string[]): { color: string; d: string }[] {
  const porColor = new Map<string, string>();
  dibujo.forEach((fila, y) => {
    let x = 0;
    while (x < fila.length) {
      const c = fila[x];
      let fin = x + 1;
      while (fin < fila.length && fila[fin] === c) fin++;
      const color = PALETA[c];
      if (c !== "." && color) porColor.set(color, (porColor.get(color) ?? "") + `M${x} ${y}h${fin - x}v1h${x - fin}z`);
      x = fin;
    }
  });
  return [...porColor].map(([color, d]) => ({ color, d }));
}

/**
 * La pose de cada estado en el cuadro número `t` (8 cuadros por segundo).
 * `pico` (solo al hablar) lo maneja el cuadro de diálogo: se abre y se cierra con cada palabra.
 */
export function poseDe(estado: EstadoPaumi, t: number, pico = false): Pose {
  const parpadea = t % 28 === 0 || t % 28 === 1;
  const respira: readonly [number, number] = t % 16 >= 12 ? [0, 1] : [0, 0];
  switch (estado) {
    case "escuchando": // se inclina hacia ti
      return {
        ojos: t % 40 === 0 ? "cerrados" : "abiertos",
        picoAbierto: false,
        alaArriba: false,
        cabeza: [1, 1],
        puntos: 0,
      };
    case "pensando": // mira arriba con puntos suspensivos
      return {
        ojos: "arriba",
        picoAbierto: false,
        alaArriba: false,
        cabeza: [0, 0],
        puntos: Math.floor(t / 3) % 4,
      };
    case "hablando":
      return {
        ojos: parpadea ? "cerrados" : "abiertos",
        picoAbierto: pico,
        alaArriba: false,
        cabeza: pico ? [0, 1] : [0, 0],
        puntos: 0,
      };
    case "contento": // aletea feliz
      return {
        ojos: "felices",
        picoAbierto: t % 4 < 2,
        alaArriba: t % 2 === 0,
        cabeza: t % 2 === 0 ? [0, 0] : [0, 1],
        puntos: 0,
      };
    default:
      return {
        ojos: parpadea ? "cerrados" : "abiertos",
        picoAbierto: false,
        alaArriba: false,
        cabeza: respira,
        puntos: 0,
      };
  }
}

/** Pose quieta (con "reducir movimiento" o en la imagen fija). */
export const POSE_QUIETA: Pose = {
  ojos: "abiertos",
  picoAbierto: false,
  alaArriba: false,
  cabeza: [0, 0],
  puntos: 0,
};
