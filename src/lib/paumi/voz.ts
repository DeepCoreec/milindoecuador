/*
 * La voz de Paumi (versión 3, fase 16): funciones puras para elegir la voz del teléfono y preparar el texto.
 * El micrófono y la voz son del navegador (gratis, sin librerías): ver src/components/paumi/voz.ts.
 */

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
