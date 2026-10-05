"use server";

import { requireUsuario } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { esquemaReporte, MOTIVOS_REPORTE } from "@/lib/validacion/resenas";

export type EstadoReporte = { estado: "inicio" | "ok" | "error"; mensaje?: string; motivo?: string; detalle?: string };

/** Reporta una reseña para que el admin la revise. La base no deja reportar dos veces la misma. */
export async function reportarResena(_previo: EstadoReporte, datos: FormData): Promise<EstadoReporte> {
  const r = esquemaReporte.safeParse({
    resena: datos.get("resena"),
    ruta: datos.get("ruta"),
    motivo: datos.get("motivo") ?? undefined,
    detalle: datos.get("detalle") ?? undefined,
  });
  // Se devuelve lo escrito para que el formulario no se borre al mostrar el error
  const escrito = { motivo: String(datos.get("motivo") ?? ""), detalle: String(datos.get("detalle") ?? "").slice(0, 400) };
  if (!r.success) return { estado: "error", mensaje: r.error.issues[0]?.message ?? "Revisa el formulario", ...escrito };
  await requireUsuario(r.data.ruta);

  const motivo = MOTIVOS_REPORTE[r.data.motivo];
  const razon = r.data.detalle ? `${motivo}: ${r.data.detalle}` : motivo;
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("review_reports").insert({ review_id: r.data.resena, reason: razon.slice(0, 500) });
  if (error) {
    if (error.code === "23505") return { estado: "ok", mensaje: "Ya habías reportado esta reseña. La revisaremos pronto." };
    return { estado: "error", mensaje: "No se pudo enviar el reporte. Inténtalo de nuevo.", ...escrito };
  }
  return { estado: "ok", mensaje: "Gracias. La revisaremos pronto." };
}
