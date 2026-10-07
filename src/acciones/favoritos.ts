"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUsuario } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";

export type EstadoFavorito = { estado: "inicio" | "ok" | "error"; guardado?: boolean; mensaje?: string };

const esquema = z.object({
  lugar: z.uuid(),
  ruta: z.string().regex(/^\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/),
  guardar: z.enum(["si", "no"]),
});

/**
 * Guardar o quitar un lugar de favoritos (versión 2, paso 10.3). Se escribe con la sesión:
 * la base solo deja tocar los favoritos propios y de lugares publicados (migración 0007).
 */
export async function alternarFavorito(_previo: EstadoFavorito, datos: FormData): Promise<EstadoFavorito> {
  const r = esquema.safeParse({ lugar: datos.get("lugar"), ruta: datos.get("ruta"), guardar: datos.get("guardar") });
  if (!r.success) return { estado: "error", mensaje: "No se pudo guardar" };
  await requireUsuario(r.data.ruta);
  const supabase = await crearClienteServidor();
  if (r.data.guardar === "si") {
    const { error } = await supabase.from("favorites").insert({ place_id: r.data.lugar });
    if (error && error.code !== "23505") {
      return { estado: "error", mensaje: /limite_favoritos/.test(error.message) ? "Ya tienes 500 guardados. Quita alguno." : "No se pudo guardar" };
    }
  } else {
    const { error } = await supabase.from("favorites").delete().eq("place_id", r.data.lugar);
    if (error) return { estado: "error", mensaje: "No se pudo quitar" };
  }
  revalidatePath("/cuenta");
  return { estado: "ok", guardado: r.data.guardar === "si" };
}
