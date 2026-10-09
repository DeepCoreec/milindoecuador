import { createHmac } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { urlSitio } from "@/lib/sitio";
import { configSupabase } from "@/lib/supabase/config";

/*
 * Estadísticas para el dueño (versión 2, paso 10.2): el navegador avisa una vista de la ficha o un toque
 * a WhatsApp o "Cómo llegar". Solo suma 1 al contador del día (función contar_evento, migración 0007),
 * que ignora lugares no publicados. No guarda nada de la persona (ni IP, ni cuenta).
 * Son números orientativos: alguien con intención podría inflarlos; no deciden nada importante.
 * Versión 3 (paso 13.4): con límite. Se calcula una "huella" cifrada de la conexión y el día (HMAC con una clave
 * del servidor) y la base cuenta como máximo 20 veces por día el mismo evento de un lugar por huella (migración 0011).
 * La IP no se guarda ni se puede recuperar de la huella, y la huella cambia cada día.
 */
function huella(request: NextRequest): string {
  const crudo = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "sin-ip";
  // IPv6: se usa el bloque /64 (una misma conexión puede cambiar las últimas partes cuando quiera)
  const ip = crudo.includes(":") ? crudo.split(":").slice(0, 4).join(":") : crudo;
  const dia = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10); // día en Ecuador
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHmac("sha256", clave).update(`evento:${dia}:${ip}`).digest("hex");
}
const esquema = z.object({ lugar: z.uuid(), tipo: z.enum(["views", "whatsapp", "route", "video"]) });

/** Lee el cuerpo, como máximo `limite` bytes (aunque no venga content-length). */
async function leerCorto(request: NextRequest, limite: number): Promise<string | null> {
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

export async function POST(request: NextRequest) {
  // Solo desde nuestras páginas (el navegador siempre manda Origin en un POST de otro sitio)
  const origen = request.headers.get("origin");
  if (origen && origen !== urlSitio().origin && origen !== request.nextUrl.origin) return new NextResponse(null, { status: 403 });
  const texto = await leerCorto(request, 200);
  if (texto === null) return new NextResponse(null, { status: 413 });
  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const r = esquema.safeParse(cuerpo);
  if (!r.success) return new NextResponse(null, { status: 400 });
  if (configSupabase()) await crearClienteAdmin().rpc("registrar_evento", { huella: huella(request), lugar: r.data.lugar, tipo: r.data.tipo });
  return new NextResponse(null, { status: 204 });
}
