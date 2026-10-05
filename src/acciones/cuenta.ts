"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUsuario } from "@/lib/auth";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/server";
import { esquemaBorrar, esquemaNombre } from "@/lib/validacion/cuenta";

export type EstadoFormulario = { estado: "inicio" | "ok" | "error"; mensaje?: string; valor?: string };

/** Cambia el nombre visible. Se escribe con la sesión de la persona: la base solo deja tocar su propio nombre. */
export async function cambiarNombre(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const r = esquemaNombre.safeParse({ nombre: datos.get("nombre") });
  if (!r.success) return { estado: "error", mensaje: r.error.issues[0]?.message, valor: String(datos.get("nombre") ?? "").slice(0, 60) };
  const usuario = await requireUsuario("/cuenta");

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("profiles").update({ display_name: r.data.nombre }).eq("id", usuario.id);
  if (error) return { estado: "error", mensaje: "No se pudo guardar. Inténtalo de nuevo." };
  revalidatePath("/cuenta");
  return { estado: "ok", mensaje: "Nombre guardado" };
}

/**
 * Borra la cuenta y, en cascada, el perfil, las reseñas y los reportes de la persona.
 * Borrar un usuario de Supabase Auth solo se puede con la clave de servicio, por eso usa admin.ts,
 * y solo después de comprobar en el servidor quién es la persona con sesión.
 */
export async function borrarCuenta(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const r = esquemaBorrar.safeParse({ confirmacion: datos.get("confirmacion") });
  if (!r.success) return { estado: "error", mensaje: r.error.issues[0]?.message };
  const usuario = await requireUsuario("/cuenta");

  const { error } = await crearClienteAdmin().auth.admin.deleteUser(usuario.id);
  if (error) return { estado: "error", mensaje: "No se pudo borrar la cuenta. Inténtalo de nuevo o escríbenos." };

  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
