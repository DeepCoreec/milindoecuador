/*
 * Cómo "habla" Paumi en el cuadro de diálogo retro (versión 3, paso 15.2). Funciones puras (se prueban sin navegador).
 */

/** Letras por pantalla: unas 4 líneas en el cuadro del celular (si no caben, el cuadro crece; nunca corta). */
export const LETRAS_POR_PANTALLA = 150;

/** Parte la respuesta en pantallas sin cortar palabras (prefiere terminar en un punto). */
export function partirEnPantallas(texto: string, max = LETRAS_POR_PANTALLA): string[] {
  const palabras = texto.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const pantallas: string[] = [];
  let actual = "";
  for (let palabra of palabras) {
    while (palabra.length > max) {
      // Una "palabra" larguísima: se corta a la fuerza
      if (actual) pantallas.push(actual);
      pantallas.push(palabra.slice(0, max));
      palabra = palabra.slice(max);
      actual = "";
    }
    const junto = actual ? `${actual} ${palabra}` : palabra;
    if (junto.length <= max) {
      actual = junto;
      continue;
    }
    // No cabe: si la pantalla va por más de la mitad y hay un punto, se corta en el último punto
    const punto = Math.max(actual.lastIndexOf(". "), actual.lastIndexOf("? "), actual.lastIndexOf("! "));
    if (punto > max / 2) {
      pantallas.push(actual.slice(0, punto + 1));
      actual = `${actual.slice(punto + 2)} ${palabra}`;
    } else {
      pantallas.push(actual);
      actual = palabra;
    }
  }
  if (actual) pantallas.push(actual);
  return pantallas.length ? pantallas : [""];
}

const LETRA = /[\p{L}\p{N}]/u;

/** Milisegundos antes de escribir la siguiente letra (respira un poquito en los signos). */
export function pausaDespuesDe(letra: string): number {
  if (/[.!?…]/.test(letra)) return 220;
  if (/[,;:]/.test(letra)) return 120;
  return 28;
}

/** ¿El pico está abierto al escribir la letra número `i`? Se abre y se cierra dentro de cada palabra y se cierra en los espacios. */
export function picoAbiertoEn(texto: string, i: number): boolean {
  if (!LETRA.test(texto[i] ?? "")) return false;
  let inicio = i;
  while (inicio > 0 && LETRA.test(texto[inicio - 1])) inicio--;
  return (i - inicio) % 4 < 2;
}

/** ¿Suena el "blip" en la letra `i`? Una letra sí y otra no, solo en letras y números. */
export function suenaEn(texto: string, i: number): boolean {
  return LETRA.test(texto[i] ?? "") && i % 2 === 0;
}

/** Cuánto se queda el cuadro a la vista después de terminar (según lo largo): de 5 a 20 segundos. */
export function tiempoDeLectura(texto: string): number {
  const palabras = texto.split(/\s+/).filter(Boolean).length;
  return Math.min(20_000, Math.max(5_000, 2_500 + palabras * 330));
}
