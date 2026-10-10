/*
 * Micrófono y voz de Paumi en el navegador (versión 3, paso 16.1). Sin librerías ni servicios de pago:
 *  - Escuchar: SpeechRecognition del navegador. En Chrome la voz la convierte en texto Google y en Safari, Apple;
 *    a nuestra página solo llega el texto (está en la Política de privacidad).
 *  - Hablar: speechSynthesis, con las voces que ya trae el teléfono.
 */
import { elegirVoz, idiomaMicrofono, textoParaVoz } from "@/lib/paumi/voz";

// Tipos mínimos (TypeScript todavía no trae los del reconocimiento de voz)
type ResultadoVoz = { isFinal: boolean; 0: { transcript: string } };
type EventoVoz = { resultIndex: number; results: ArrayLike<ResultadoVoz> };
type Reconocimiento = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: EventoVoz) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechend?: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type ConstructorReconocimiento = new () => Reconocimiento;

function constructor(): ConstructorReconocimiento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: ConstructorReconocimiento; webkitSpeechRecognition?: ConstructorReconocimiento };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** ¿Este navegador puede escuchar? (Chrome, Edge, Safari y Samsung sí; Firefox no). */
export const puedeEscuchar = () => !!constructor();
/** ¿Este navegador puede hablar? */
export const puedeHablar = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

/**
 * Une los pedazos que entendió el navegador sin repetir. Chrome en Android a veces manda cada pedazo con todo lo
 * anterior ("dónde" → "dónde como" → "dónde como encebollado"): sin esto la frase se duplica y se va de largo.
 */
export function unirPedazos(pedazos: string[]): string {
  let total = "";
  for (const crudo of pedazos) {
    const p = crudo.trim();
    if (!p) continue;
    const a = total.toLowerCase();
    const b = p.toLowerCase();
    if (b.startsWith(a)) total = p; // el pedazo nuevo ya trae todo lo anterior
    else if (a.endsWith(b) || a.includes(b)) continue; // repetido
    else total = `${total} ${p}`.trim();
  }
  return total;
}

/** Una frase se escucha como mucho este tiempo (si el teléfono no corta solo, se corta aquí). */
const MAXIMO_ESCUCHA = 12_000;

/** Mensajes claros para cuando el micrófono falla. */
export function mensajeErrorMicrofono(error: string): string {
  if (error === "not-allowed" || error === "service-not-allowed") return "Para hablarme, dale permiso al micrófono en tu navegador.";
  if (error === "no-speech") return "No te escuché. Toca el micrófono e intenta de nuevo.";
  if (error === "network") return "No pude escucharte: revisa tu internet.";
  if (error === "audio-capture") return "No encuentro un micrófono en tu teléfono.";
  return "No pude escucharte. Intenta de nuevo o escríbeme.";
}

/**
 * Escucha una frase. Va mostrando lo que entiende (`alParcial`) y al final avisa con la frase completa.
 * Devuelve una función para detener.
 */
export function escuchar({
  alParcial,
  alFinal,
  alError,
  alTerminar,
}: {
  alParcial: (texto: string) => void;
  alFinal: (texto: string) => void;
  alError: (error: string) => void;
  alTerminar: () => void;
}): () => void {
  const Rec = constructor();
  if (!Rec) {
    alError("not-supported");
    alTerminar();
    return () => {};
  }
  const rec = new Rec();
  rec.lang = idiomaMicrofono(navigator.language);
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let final = "";
  rec.onresult = (e) => {
    // Siempre se arma desde cero con todos los pedazos (así no se acumulan repetidos)
    const finales: string[] = [];
    const parciales: string[] = [];
    for (let i = 0; i < e.results.length; i++) (e.results[i].isFinal ? finales : parciales).push(e.results[i][0].transcript);
    final = unirPedazos(finales);
    alParcial(unirPedazos([...finales, ...parciales]));
  };
  // Al dejar de hablar se cierra el micrófono (y nunca queda abierto más de 12 segundos)
  rec.onspeechend = () => rec.stop();
  const corte = setTimeout(() => rec.stop(), MAXIMO_ESCUCHA);
  rec.onerror = (e) => {
    if (e.error !== "aborted") alError(e.error);
  };
  rec.onend = () => {
    clearTimeout(corte);
    if (final.trim()) alFinal(final.trim());
    alTerminar();
  };
  try {
    rec.start();
  } catch {
    alError("start");
    alTerminar();
  }
  return () => {
    clearTimeout(corte);
    rec.onresult = null;
    rec.abort();
  };
}

/**
 * ¿Manos libres funciona bien aquí? En celulares no: Android pita cada vez que el micrófono se vuelve a encender y
 * gasta batería, y iPhone lo corta. Se ofrece solo en computadoras (en el celular está el botón del micrófono).
 */
export const puedeManosLibres = () => puedeEscuchar() && !window.matchMedia("(pointer: coarse)").matches;

/**
 * Lee el texto en voz alta con la mejor voz en español del teléfono.
 * `alPalabra` se llama al empezar cada palabra (para mover el pico); no todas las voces lo avisan.
 */
export function hablar(texto: string, { alPalabra, alTerminar }: { alPalabra: () => void; alTerminar: () => void }) {
  if (!puedeHablar()) {
    alTerminar();
    return;
  }
  const s = window.speechSynthesis;
  s.cancel();
  const frase = new SpeechSynthesisUtterance(textoParaVoz(texto));
  const voz = elegirVoz(s.getVoices());
  frase.lang = voz?.lang ?? "es-EC";
  try {
    if (voz) frase.voice = voz;
  } catch {
    // Algunos navegadores no dejan elegir la voz: se usa la del idioma
  }
  frase.rate = 1.05;
  frase.onboundary = (e) => {
    if (e.name === "word" || e.name === undefined) alPalabra();
  };
  frase.onend = alTerminar;
  frase.onerror = alTerminar;
  s.speak(frase);
}

export function callar() {
  if (puedeHablar()) window.speechSynthesis.cancel();
}

/** En iPhone la voz solo funciona si arrancó con un toque: se "despierta" con una frase vacía al tocar el micrófono. */
export function prepararVoz() {
  if (!puedeHablar()) return;
  const vacia = new SpeechSynthesisUtterance("");
  vacia.volume = 0;
  window.speechSynthesis.speak(vacia);
  window.speechSynthesis.getVoices(); // Chrome carga las voces la primera vez que se piden
}

/**
 * Manos libres (16.2): escucha seguido (solo mientras la página está abierta y a la vista) y entrega cada frase
 * terminada. El navegador corta solo cada cierto tiempo: quien lo usa lo vuelve a encender en `alTerminar`.
 */
export function escucharSiempre({
  alOir,
  alError,
  alTerminar,
}: {
  alOir: (frase: string) => void;
  alError: (error: string) => void;
  alTerminar: () => void;
}): () => void {
  const Rec = constructor();
  if (!Rec) {
    alError("not-supported");
    return () => {};
  }
  const rec = new Rec();
  rec.lang = idiomaMicrofono(navigator.language);
  rec.interimResults = false;
  rec.continuous = true;
  rec.maxAlternatives = 1;
  let parado = false;
  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (parado) return; // ya se apagó (por ejemplo, la llamaron en la frase anterior)
      if (e.results[i].isFinal) alOir(e.results[i][0].transcript);
    }
  };
  rec.onerror = (e) => {
    if (e.error !== "aborted" && e.error !== "no-speech") alError(e.error);
  };
  rec.onend = () => {
    if (!parado) alTerminar();
  };
  try {
    rec.start();
  } catch {
    alError("start");
  }
  return () => {
    parado = true;
    rec.onresult = null;
    rec.abort();
  };
}
