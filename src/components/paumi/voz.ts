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
    let parcial = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) final += r[0].transcript;
      else parcial += r[0].transcript;
    }
    alParcial((final + parcial).trim());
  };
  rec.onerror = (e) => {
    if (e.error !== "aborted") alError(e.error);
  };
  rec.onend = () => {
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
    rec.onresult = null;
    rec.abort();
  };
}

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
