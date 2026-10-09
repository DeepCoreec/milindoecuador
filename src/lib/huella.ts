import "server-only";
import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import { claveDerivada } from "@/lib/supabase/admin";

/**
 * Huella de una conexión para los límites diarios (contador de visitas 13.4 y Paumi 14): HMAC de la IP + el día con
 * una clave derivada del servidor. La IP no se guarda ni se puede sacar de la huella, y la huella cambia cada día.
 * En Vercel, x-real-ip la pone la plataforma (no se puede falsificar). En IPv6 se usa el bloque /64.
 */
export function huellaDelDia(request: NextRequest, uso: string): string {
  const crudo = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "sin-ip";
  const ip = crudo.includes(":") ? crudo.split(":").slice(0, 4).join(":") : crudo;
  const dia = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10); // día en Ecuador
  return createHmac("sha256", claveDerivada(`huella-${uso}`)).update(`${uso}:${dia}:${ip}`).digest("hex");
}

/** Lee el cuerpo de una petición, como máximo `limite` bytes (aunque no venga content-length). */
export async function leerCuerpoCorto(request: NextRequest, limite: number): Promise<string | null> {
  const lector = request.body?.getReader();
  if (!lector) return null;
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > limite) {
      await lector.cancel();
      return null;
    }
    partes.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(partes));
}
