/*
 * La voz de Paumi (versión 3, fase 16): funciones puras para elegir la voz del teléfono y preparar el texto.
 * El micrófono y la voz son del navegador (gratis, sin librerías): ver src/components/paumi/voz.ts.
 */

import { LLAMADAS } from "./personaje";

type VozSimple = { lang: string; name: string; localService?: boolean };

/** Orden de preferencia: español de Ecuador primero, luego de América y al final de España. */
const PREFERENCIA = ["es-ec", "es-us", "es-mx", "es-419", "es-co", "es-pe"];

function rango(lang: string): number {
  const l = lang.toLowerCase().replace("_", "-");
  const i = PREFERENCIA.indexOf(l);
  if (i >= 0) return i;
  if (l === "es-es") return PREFERENCIA.length + 1;
  return l.startsWith("es") ? PREFERENCIA.length : 99;
}

/** La mejor voz en español del teléfono (las del propio teléfono primero), o null si no hay. */
export function elegirVoz<T extends VozSimple>(voces: readonly T[]): T | null {
  const enEspanol = voces.filter((v) => rango(v.lang) < 99);
  enEspanol.sort((a, b) => rango(a.lang) - rango(b.lang) || Number(!!b.localService) - Number(!!a.localService));
  return enEspanol[0] ?? null;
}

/** Idioma para el micrófono: el del teléfono si es español; si no, español de Ecuador. */
export function idiomaMicrofono(idiomaNavegador: string | undefined): string {
  return idiomaNavegador?.toLowerCase().startsWith("es") ? idiomaNavegador : "es-EC";
}

/** El texto tal como se lee en voz alta (sin paréntesis ni signos que la voz deletrea). */
export function textoParaVoz(texto: string): string {
  return texto
    .replace(/[()[\]{}*_#<>|~^`"]/g, " ")
    .replace(/\$/g, " dólares ")
    .replace(/\s+/g, " ")
    .trim();
}

const normal = (palabra: string) =>
  palabra
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ]/g, "");

/** Palabras con las que se puede empezar a llamarla ("Oye, Paumi…"). */
const SALUDOS = ["oye", "hola", "ey", "hey", "ok", "okey", "okay", "buenas", "ya", "a", "ah", "eh"];

/**
 * Manos libres (16.2): ¿llamaron a Paumi? Solo si la frase EMPIEZA con su nombre ("Paumi, …" u "Oye, Paumi, …"):
 * así una conversación cerca del teléfono que la nombra de pasada ("le dije a Paumi que…") no se envía.
 * Devuelve lo que dijeron después del nombre ("Paumi, ¿dónde como encebollado?" → "¿dónde como encebollado?"),
 * o null si no la llamaron (y entonces lo que se oyó se descarta).
 */
export function despuesDelNombre(oido: string): string | null {
  const palabras = oido.trim().split(/\s+/).filter(Boolean);
  const inicio = palabras.length > 1 && SALUDOS.includes(normal(palabras[0])) ? 1 : 0;
  for (let i = 0; i <= inicio && i < palabras.length; i++) {
    const una = normal(palabras[i]);
    const dos = i + 1 < palabras.length ? una + normal(palabras[i + 1]) : "";
    let desde = -1;
    if (LLAMADAS.includes(una)) desde = i + 1;
    // En dos palabras solo si la primera es "pau"/"pao" (así "pa mi" no la despierta)
    else if (una.length >= 3 && LLAMADAS.includes(dos)) desde = i + 2;
    if (desde >= 0)
      return palabras
        .slice(desde)
        .join(" ")
        .replace(/^[\s,.;:!¡-]+/, "")
        .trim();
  }
  return null;
}
