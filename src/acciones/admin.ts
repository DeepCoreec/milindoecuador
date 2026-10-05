"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { aSlug, slugLibre } from "@/lib/slug";
import { crearClienteServidor } from "@/lib/supabase/server";
import { esquemaDecision } from "@/lib/validacion/admin";

/*
 * Acciones del panel. Cada una vuelve a verificar el rol en el servidor (requireAdmin),
 * aunque la página ya lo hizo: una acción se puede llamar directamente, sin pasar por la página.
 * Escriben con la sesión del admin: además, las reglas RLS de la base exigen el rol admin.
 */

export type EstadoAdmin = { estado: "inicio" | "ok" | "error"; mensaje?: string };

const DESCRIPCION_PENDIENTE = "Descripción pendiente: escríbela desde el panel antes de publicar.";

/** Aprueba una solicitud: crea la ficha como BORRADOR (no se ve en público) y marca la solicitud. */
export async function aprobarSolicitud(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaDecision.safeParse({ solicitud: datos.get("solicitud"), nota: datos.get("nota") ?? undefined });
  if (!r.success) return { estado: "error", mensaje: r.error.issues[0]?.message ?? "Datos inválidos" };
  await requireAdmin();
  const db = await crearClienteServidor();

  const { data: s } = await db
    .from("business_requests")
    .select("id, business_name, category_id, city_id, sector, whatsapp, description, status")
    .eq("id", r.data.solicitud)
    .maybeSingle();
  if (!s) return { estado: "error", mensaje: "La solicitud no existe" };
  if (s.status !== "pendiente") return { estado: "error", mensaje: "Esta solicitud ya fue revisada" };

  const base = aSlug(s.business_name) || "lugar";
  const { data: parecidos } = await db.from("places").select("slug").eq("city_id", s.city_id).like("slug", `${base}%`);
  const slug = slugLibre(base, new Set((parecidos ?? []).map((p) => p.slug)));
  const descripcion = s.description && s.description.trim().length >= 20 ? s.description.trim() : DESCRIPCION_PENDIENTE;

  const { error: errorLugar } = await db.from("places").insert({
    city_id: s.city_id,
    category_id: s.category_id,
    slug,
    name: s.business_name,
    sector: s.sector && s.sector.trim().length >= 2 ? s.sector.trim() : "Por definir",
    description: descripcion,
    whatsapp: s.whatsapp,
    status: "borrador",
  });
  if (errorLugar) return { estado: "error", mensaje: "No se pudo crear la ficha. Inténtalo de nuevo." };

  const { error } = await db.from("business_requests").update({ status: "aprobada", admin_notes: r.data.nota || null }).eq("id", s.id);
  if (error) return { estado: "error", mensaje: "La ficha se creó, pero no se pudo marcar la solicitud. Márcala de nuevo." };
  revalidatePath("/admin", "layout");
  return { estado: "ok", mensaje: `Aprobada: se creó la ficha "${s.business_name}" como borrador.` };
}

/** Rechaza una solicitud, con una nota opcional para recordar el motivo. */
export async function rechazarSolicitud(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaDecision.safeParse({ solicitud: datos.get("solicitud"), nota: datos.get("nota") ?? undefined });
  if (!r.success) return { estado: "error", mensaje: r.error.issues[0]?.message ?? "Datos inválidos" };
  await requireAdmin();
  const db = await crearClienteServidor();
  const { data, error } = await db
    .from("business_requests")
    .update({ status: "rechazada", admin_notes: r.data.nota || null })
    .eq("id", r.data.solicitud)
    .eq("status", "pendiente")
    .select("id");
  if (error) return { estado: "error", mensaje: "No se pudo rechazar. Inténtalo de nuevo." };
  if (!data?.length) return { estado: "error", mensaje: "Esta solicitud ya fue revisada" };
  revalidatePath("/admin", "layout");
  return { estado: "ok", mensaje: "Solicitud rechazada" };
}
