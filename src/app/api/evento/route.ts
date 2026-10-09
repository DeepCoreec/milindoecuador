import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { huellaDelDia, leerCuerpoCorto } from "@/lib/huella";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { urlSitio } from "@/lib/sitio";
import { configSupabase } from "@/lib/supabase/config";

/*
 * Estadísticas para el dueño (versión 2, paso 10.2): el navegador avisa una vista de la ficha o un toque
 * a WhatsApp o "Cómo llegar". Solo suma 1 al contador del día (función contar_evento, migración 0007),
 * que ignora lugares no publicados. No guarda nada de la persona (ni IP, ni cuenta).
 * Son números orientativos: alguien con intención podría inflarlos; no deciden nada importante.
 * Versión 3 (paso 13.4): con límite. Se calcula una "huella" cifrada de la conexión y el día (HMAC con una clave
 * del servidor, src/lib/huella.ts) y la base cuenta como máximo 20 veces por día el mismo evento de un lugar por huella (migración 0011).
 * La IP no se guarda ni se puede recuperar de la huella, y la huella cambia cada día.
 */
const esquema = z.object({ lugar: z.uuid(), tipo: z.enum(["views", "whatsapp", "route", "video"]) });

export async function POST(request: NextRequest) {
  // Solo desde nuestras páginas (el navegador siempre manda Origin en un POST de otro sitio)
  const origen = request.headers.get("origin");
  if (origen && origen !== urlSitio().origin && origen !== request.nextUrl.origin) return new NextResponse(null, { status: 403 });
  const texto = await leerCuerpoCorto(request, 200);
  if (texto === null) return new NextResponse(null, { status: 413 });
  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const r = esquema.safeParse(cuerpo);
  if (!r.success) return new NextResponse(null, { status: 400 });
  if (configSupabase()) await crearClienteAdmin().rpc("registrar_evento", { huella: huellaDelDia(request, "eventos"), lugar: r.data.lugar, tipo: r.data.tipo });
  return new NextResponse(null, { status: 204 });
}
