import { notFound, redirect } from "next/navigation";
import { configSupabase } from "@/lib/supabase/config";
import { crearClienteServidor } from "@/lib/supabase/server";

export type Usuario = { id: string; correo: string | null };

/**
 * La persona con sesión, o null. Lee la sesión de las cookies y la verifica con Supabase
 * (getClaims comprueba la firma; nunca se confía en lo que diga el navegador).
 */
export async function obtenerUsuario(): Promise<Usuario | null> {
  if (!configSupabase()) return null;
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (!c?.sub) return null;
  return { id: c.sub, correo: typeof c.email === "string" ? c.email : null };
}

/** Exige sesión: si no hay, manda a /entrar y luego vuelve a `siguiente`. */
export async function requireUsuario(siguiente = "/cuenta"): Promise<Usuario> {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect(`/entrar?siguiente=${encodeURIComponent(siguiente)}`);
  return usuario;
}

/**
 * Exige ser admin. Sin sesión manda a entrar; con sesión pero sin rol de admin responde
 * "no existe" (no se revela que hay un panel). Se llama en el layout del panel Y en cada acción.
 */
export async function requireAdmin(siguiente = "/admin"): Promise<Usuario> {
  const usuario = await requireUsuario(siguiente);
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("profiles").select("role").eq("id", usuario.id).maybeSingle();
  if (data?.role !== "admin") notFound();
  return usuario;
}
