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
 */
const esquema = z.object({ lugar: z.uuid(), tipo: z.enum(["views", "whatsapp", "route"]) });

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
  if (configSupabase()) await crearClienteAdmin().rpc("contar_evento", { lugar: r.data.lugar, tipo: r.data.tipo });
  return new NextResponse(null, { status: 204 });
}
