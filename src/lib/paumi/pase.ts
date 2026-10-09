import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { claveDerivada } from "@/lib/supabase/admin";

/*
 * "Pase" de Paumi: después de pasar el captcha UNA vez, el servidor deja una cookie firmada (httpOnly) que vale 2 horas,
 * así la conversación sigue sin pedir el captcha en cada mensaje. No lleva datos de la persona: solo hasta cuándo vale.
 */

export const COOKIE_PASE = "mle-paumi";
export const DURACION_PASE = 2 * 60 * 60; // segundos

const firma = (vence: number) => createHmac("sha256", claveDerivada("paumi-pase")).update(String(vence)).digest("hex");

export function crearPase(ahora = Date.now()): string {
  const vence = Math.floor(ahora / 1000) + DURACION_PASE;
  return `${vence}.${firma(vence)}`;
}

export function paseValido(valor: string | undefined, ahora = Date.now()): boolean {
  const m = /^(\d{10})\.([0-9a-f]{64})$/.exec(valor ?? "");
  if (!m) return false;
  const vence = Number(m[1]);
  if (vence < Math.floor(ahora / 1000) || vence > Math.floor(ahora / 1000) + DURACION_PASE) return false;
  const a = Buffer.from(m[2]!, "hex");
  const b = Buffer.from(firma(vence), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
