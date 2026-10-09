import { NextResponse } from "next/server";
import { configSupabase } from "@/lib/supabase/config";
import { crearClientePublico } from "@/lib/supabase/publico";

/*
 * "¿Está viva la página?" (versión 3, paso 13.5). Para un monitor gratis (por ejemplo UptimeRobot) que avise por
 * correo si la página o la base dejan de responder. Responde 200 si todo va bien y 503 si la base no contesta.
 * No muestra detalles internos.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!configSupabase()) return NextResponse.json({ ok: true, base: "sin-configurar" });
  const db = crearClientePublico();
  const inicio = Date.now();
  const { error } = db ? await db.from("cities").select("slug").limit(1) : { error: true };
  if (error) return NextResponse.json({ ok: false }, { status: 503, headers: { "cache-control": "no-store" } });
  return NextResponse.json({ ok: true, ms: Date.now() - inicio }, { headers: { "cache-control": "no-store" } });
}
