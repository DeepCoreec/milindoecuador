"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireUsuario } from "@/lib/auth";
import { verificarCaptcha } from "@/lib/captcha";
import { crearClienteServidor } from "@/lib/supabase/server";
import { esquemaBorrarResena, esquemaResena } from "@/lib/validacion/resenas";

export type EstadoResena = { estado: "inicio" | "ok" | "error"; mensaje?: string; campo?: "estrellas" | "texto" | "captcha" };

async function ipDeLaVisita() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
}

/**
 * Publica o edita la reseña de la persona en un lugar. Orden de la arquitectura:
 * 1. Zod  2. captcha  3. sesión  4. escribir con el cliente del usuario (RLS)  5. revalidar la ficha.
 */
export async function guardarResena(_previo: EstadoResena, datos: FormData): Promise<EstadoResena> {
  const r = esquemaResena.safeParse({
    lugar: datos.get("lugar"),
    ruta: datos.get("ruta"),
    estrellas: datos.get("estrellas") ?? undefined,
    texto: datos.get("texto"),
  });
  if (!r.success) {
    const problema = r.error.issues[0];
    const campo = problema?.path[0] === "estrellas" ? "estrellas" : problema?.path[0] === "texto" ? "texto" : undefined;
    return { estado: "error", campo, mensaje: campo ? problema?.message : "No se pudo enviar. Recarga la página e inténtalo de nuevo." };
  }
  if (!(await verificarCaptcha(datos.get("cf-turnstile-response"), await ipDeLaVisita()))) {
    return { estado: "error", campo: "captcha", mensaje: "Confirma que no eres un robot y vuelve a enviar." };
  }
  const usuario = await requireUsuario(r.data.ruta);
  const supabase = await crearClienteServidor();

  const { data: existente } = await supabase.from("reviews").select("id").eq("place_id", r.data.lugar).eq("user_id", usuario.id).maybeSingle();
  const { error } = existente
    ? await supabase.from("reviews").update({ stars: r.data.estrellas, text: r.data.texto }).eq("id", existente.id)
    : await supabase.from("reviews").insert({ place_id: r.data.lugar, stars: r.data.estrellas, text: r.data.texto });

  if (error) {
    const limite = /límite de 5 reseñas/.test(error.message);
    return { estado: "error", mensaje: limite ? "Llegaste al límite de 5 reseñas por día. Vuelve mañana." : "No se pudo guardar tu reseña. Inténtalo de nuevo." };
  }
  revalidatePath(r.data.ruta);
  revalidatePath("/cuenta");
  return { estado: "ok", mensaje: existente ? "Reseña actualizada" : "¡Gracias! Tu reseña ya está publicada" };
}

/** Borra la reseña propia en un lugar. La base solo deja borrar las suyas. */
export async function borrarResena(_previo: EstadoResena, datos: FormData): Promise<EstadoResena> {
  const r = esquemaBorrarResena.safeParse({ lugar: datos.get("lugar"), ruta: datos.get("ruta") });
  if (!r.success) return { estado: "error", mensaje: "No se pudo borrar. Recarga la página." };
  const usuario = await requireUsuario(r.data.ruta);
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("reviews").delete().eq("place_id", r.data.lugar).eq("user_id", usuario.id);
  if (error) return { estado: "error", mensaje: "No se pudo borrar tu reseña. Inténtalo de nuevo." };
  revalidatePath(r.data.ruta);
  revalidatePath("/cuenta");
  return { estado: "ok", mensaje: "Tu reseña se borró" };
}
