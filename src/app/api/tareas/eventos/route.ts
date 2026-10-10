import { createHash, timingSafeEqual } from "node:crypto";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { configSupabase } from "@/lib/supabase/config";

/*
 * Borrado diario de eventos vencidos (versión 5, fase 22). Lo llama Vercel Cron a las 00:05 de Guayaquil
 * (vercel.json) con la clave CRON_SECRET; sin esa clave no hace nada. Borra los eventos cuya fecha de fin ya pasó
 * y después sus afiches del bucket (Supabase no deja borrar archivos desde SQL).
 * Aunque esta tarea se atrase, las páginas nunca muestran un evento vencido (lo filtra la base).
 */

export const dynamic = "force-dynamic";

function autorizado(cabecera: string | null): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || secreto.length < 16 || !cabecera) return false;
  // Se comparan las huellas: mismo largo siempre y sin pistas por el tiempo de respuesta
  const a = createHash("sha256").update(cabecera).digest();
  const b = createHash("sha256").update(`Bearer ${secreto}`).digest();
  return timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!autorizado(req.headers.get("authorization"))) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (!configSupabase()) return Response.json({ error: "Sin base" }, { status: 503 });
  const db = crearClienteAdmin();
  const { data, error } = await db.rpc("borrar_eventos_vencidos");
  if (error) return Response.json({ error: "No se pudo borrar" }, { status: 500 });
  const afiches = ((data ?? []) as { poster_path: string | null }[]).map((f) => f.poster_path).filter((p): p is string => !!p);
  for (let i = 0; i < afiches.length; i += 100) await db.storage.from("afiches-eventos").remove(afiches.slice(i, i + 100));
  return Response.json({ borrados: (data ?? []).length, afiches: afiches.length });
}
