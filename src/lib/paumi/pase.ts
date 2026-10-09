import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { claveDerivada } from "@/lib/supabase/admin";

/*
 * "Pase" de Paumi: después de pasar el captcha UNA vez, el servidor deja una cookie firmada (httpOnly) que vale 2 horas,
 * así la conversación sigue sin pedir el captcha en cada mensaje. Va atada a la huella de la conexión (sin la IP):
 * copiada a otra conexión no sirve (revisión de seguridad de Paumi, 2026-10-09). No lleva datos de la persona.
 *
 * Además, cada respuesta de Paumi viaja con una firma: así nadie puede inventar mensajes "de Paumi" en el historial
 * para manipular a la IA.
 */

export const COOKIE_PASE = "mle-paumi";
export const DURACION_PASE = 2 * 60 * 60; // segundos

const hmac = (uso: string, texto: string) => createHmac("sha256", claveDerivada(uso)).update(texto).digest("hex");
const iguales = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function crearPase(huella: string, ahora = Date.now()): string {
  const vence = Math.floor(ahora / 1000) + DURACION_PASE;
  const parte = huella.slice(0, 16);
  return `${vence}.${parte}.${hmac("paumi-pase", `${vence}.${parte}`)}`;
}

export function paseValido(valor: string | undefined, huella: string, ahora = Date.now()): boolean {
  const m = /^(\d{10})\.([0-9a-f]{16})\.([0-9a-f]{64})$/.exec(valor ?? "");
  if (!m) return false;
  const vence = Number(m[1]);
  const seg = Math.floor(ahora / 1000);
  if (vence < seg || vence > seg + DURACION_PASE) return false;
  if (m[2] !== huella.slice(0, 16)) return false;
  return iguales(m[3]!, hmac("paumi-pase", `${vence}.${m[2]}`));
}

export function firmarRespuesta(texto: string): string {
  return hmac("paumi-respuesta", texto).slice(0, 32);
}

export function respuestaValida(texto: string, firma: string | undefined): boolean {
  return typeof firma === "string" && /^[0-9a-f]{32}$/.test(firma) && iguales(firma, firmarRespuesta(texto));
}
