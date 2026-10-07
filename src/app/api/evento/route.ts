import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { configSupabase } from "@/lib/supabase/config";

/*
 * Estadísticas para el dueño (versión 2, paso 10.2): el navegador avisa una vista de la ficha o un toque
 * a WhatsApp o "Cómo llegar". Solo suma 1 al contador del día (función contar_evento, migración 0007),
 * que ignora lugares no publicados. No guarda nada de la persona (ni IP, ni cuenta).
 * Son números orientativos: alguien con intención podría inflarlos; no deciden nada importante.
 */
const esquema = z.object({ lugar: z.uuid(), tipo: z.enum(["views", "whatsapp", "route"]) });

export async function POST(request: NextRequest) {
  const largo = Number(request.headers.get("content-length") ?? "0");
  if (largo > 200) return new NextResponse(null, { status: 413 });
  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(await request.text());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const r = esquema.safeParse(cuerpo);
  if (!r.success) return new NextResponse(null, { status: 400 });
  if (configSupabase()) await crearClienteAdmin().rpc("contar_evento", { lugar: r.data.lugar, tipo: r.data.tipo });
  return new NextResponse(null, { status: 204 });
}
