import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { configSupabase } from "@/lib/supabase/config";

/*
 * Borrado diario de eventos vencidos (versión 5, fase 22). Lo llama Vercel Cron a las 00:05 de Guayaquil
 * (vercel.json) con la clave CRON_SECRET; sin esa clave no hace nada. Borra los eventos cuya fecha de fin ya pasó
 * y después sus afiches del bucket (Supabase no deja borrar archivos desde SQL), y los afiches que nadie usa.
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
  const sueltos = await borrarAfichesSueltos(db);
  revalidatePath("/", "layout");
  return Response.json({ borrados: (data ?? []).length, afiches: afiches.length, sueltos });
}

/**
 * Afiches que ningún evento usa (se subieron pero no se publicó el evento, o se borró la cuenta): se borran si tienen
 * más de 3 horas, para no dejar archivos sin dueño en el bucket.
 */
async function borrarAfichesSueltos(db: ReturnType<typeof crearClienteAdmin>): Promise<number> {
  const limite = Date.now() - 3 * 3600_000;
  const { data: carpetas } = await db.storage.from("afiches-eventos").list("eventos", { limit: 500 });
  let borrados = 0;
  for (const c of carpetas ?? []) {
    if (!/^[0-9a-f-]{36}$/.test(c.name)) continue;
    const { data: archivos } = await db.storage.from("afiches-eventos").list(`eventos/${c.name}`, { limit: 100 });
    const viejos = (archivos ?? []).filter((a) => a.created_at && Date.parse(a.created_at) < limite).map((a) => `eventos/${c.name}/${a.name}`);
    if (!viejos.length) continue;
    const { data: usados } = await db.from("city_events").select("poster_path").in("poster_path", viejos);
    const enUso = new Set((usados ?? []).map((u) => u.poster_path));
    const borrar = viejos.filter((v) => !enUso.has(v));
    if (borrar.length) {
      await db.storage.from("afiches-eventos").remove(borrar);
      borrados += borrar.length;
    }
  }
  return borrados;
}
