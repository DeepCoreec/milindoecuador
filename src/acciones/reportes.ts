"use server";

import { requireUsuario } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { esquemaReporte, esquemaReporteLugar, MOTIVOS_REPORTE, MOTIVOS_REPORTE_LUGAR } from "@/lib/validacion/resenas";

export type EstadoReporte = {
  estado: "inicio" | "ok" | "error";
  mensaje?: string;
  motivo?: string;
  detalle?: string;
};

/** Reporta una reseña para que el admin la revise. La base no deja reportar dos veces la misma. */
export async function reportarResena(_previo: EstadoReporte, datos: FormData): Promise<EstadoReporte> {
  const r = esquemaReporte.safeParse({
    resena: datos.get("resena"),
    ruta: datos.get("ruta"),
    motivo: datos.get("motivo") ?? undefined,
    detalle: datos.get("detalle") ?? undefined,
  });
  // Se devuelve lo escrito para que el formulario no se borre al mostrar el error
  const escrito = {
    motivo: String(datos.get("motivo") ?? ""),
    detalle: String(datos.get("detalle") ?? "").slice(0, 400),
  };
  if (!r.success)
    return {
      estado: "error",
      mensaje: r.error.issues[0]?.message ?? "Revisa el formulario",
      ...escrito,
    };
  await requireUsuario(r.data.ruta);

  const motivo = MOTIVOS_REPORTE[r.data.motivo];
  const razon = r.data.detalle ? `${motivo}: ${r.data.detalle}` : motivo;
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("review_reports").insert({ review_id: r.data.resena, reason: razon.slice(0, 500) });
  if (error) {
    if (error.code === "23505")
      return {
        estado: "ok",
        mensaje: "Ya habías reportado esta reseña. La revisaremos pronto.",
      };
    if (/límite de reportes/.test(error.message))
      return {
        estado: "error",
        mensaje: "Llegaste al límite de reportes por hoy. Gracias por ayudar; vuelve mañana.",
        ...escrito,
      };
    return {
      estado: "error",
      mensaje: "No se pudo enviar el reporte. Inténtalo de nuevo.",
      ...escrito,
    };
  }
  return { estado: "ok", mensaje: "Gracias. La revisaremos pronto." };
}

/**
 * Reporta un lugar (versión 2, paso 9.7). Con 3 reportes sin resolver de personas distintas, la base lo oculta sola
 * hasta que el admin lo revise (migración 0006). Se escribe con la sesión: la base exige que sea un lugar publicado,
 * una vez por persona y máximo 10 reportes al día.
 */
export async function reportarLugar(_previo: EstadoReporte, datos: FormData): Promise<EstadoReporte> {
  const r = esquemaReporteLugar.safeParse({
    lugar: datos.get("lugar"),
    ruta: datos.get("ruta"),
    motivo: datos.get("motivo") ?? undefined,
    detalle: datos.get("detalle") ?? undefined,
  });
  const escrito = {
    motivo: String(datos.get("motivo") ?? ""),
    detalle: String(datos.get("detalle") ?? "").slice(0, 400),
  };
  if (!r.success)
    return {
      estado: "error",
      mensaje: r.error.issues[0]?.message ?? "Revisa el formulario",
      ...escrito,
    };
  await requireUsuario(r.data.ruta);

  const motivo = MOTIVOS_REPORTE_LUGAR[r.data.motivo];
  const razon = r.data.detalle ? `${motivo}: ${r.data.detalle}` : motivo;
  const supabase = await crearClienteServidor();
  // Sin .select(): quien reporta no puede leer los reportes (ni el suyo)
  const { error } = await supabase.from("place_reports").insert({ place_id: r.data.lugar, reason: razon.slice(0, 500) });
  if (error) {
    if (error.code === "23505")
      return {
        estado: "ok",
        mensaje: "Ya habías reportado este lugar. Lo revisaremos pronto.",
      };
    if (/límite de reportes/.test(error.message))
      return {
        estado: "error",
        mensaje: "Llegaste al límite de reportes por hoy. Gracias por ayudar; vuelve mañana.",
        ...escrito,
      };
    return {
      estado: "error",
      mensaje: "No se pudo enviar el reporte. Inténtalo de nuevo.",
      ...escrito,
    };
  }
  // Sin revalidatePath: si con este reporte la ficha se ocultó, la página de quien reporta pasaría a "no existe"
  // en vez de mostrarle el agradecimiento. La ficha y las listas se leen en cada visita; el inicio, en ≤5 minutos.
  return { estado: "ok", mensaje: "Gracias. Lo revisaremos pronto." };
}
