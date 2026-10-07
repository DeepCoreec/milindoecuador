"use server";

import { redirect } from "next/navigation";
import { configSupabase } from "@/lib/supabase/config";
import { crearClienteServidor } from "@/lib/supabase/server";
import { googleActivo, urlSitio } from "@/lib/sitio";
import { esquemaCorreo, rutaSegura } from "@/lib/validacion/sesion";

export type EstadoEntrar = { estado: "inicio" | "enviado" | "error"; mensaje?: string; correo?: string };

const SIN_SUPABASE = "El inicio de sesión todavía no está activo. Vuelve pronto.";

function vuelta(siguiente: string) {
  const u = new URL("/auth/callback", urlSitio());
  u.searchParams.set("siguiente", siguiente);
  return u.toString();
}

/** Envía el enlace mágico al correo. Supabase limita cuántos correos se pueden pedir seguidos. */
export async function entrarConCorreo(_previo: EstadoEntrar, datos: FormData): Promise<EstadoEntrar> {
  const r = esquemaCorreo.safeParse({ correo: datos.get("correo") });
  if (!r.success) return { estado: "error", mensaje: r.error.issues[0]?.message ?? "Revisa el correo" };
  if (!configSupabase()) return { estado: "error", mensaje: SIN_SUPABASE, correo: r.data.correo };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithOtp({
    email: r.data.correo,
    options: {
      emailRedirectTo: vuelta(rutaSegura(datos.get("siguiente"))),
      shouldCreateUser: true,
      // Lo verifica Supabase Auth (Authentication → Attack Protection → captcha con Turnstile). Así también se protege
      // a quien llame directo a /auth/v1/otp. No lo verificamos aquí: cada respuesta del captcha sirve una sola vez.
      captchaToken: typeof datos.get("cf-turnstile-response") === "string" ? (datos.get("cf-turnstile-response") as string) : undefined,
    },
  });
  if (error) {
    const espera = error.status === 429 || /rate|seconds/i.test(error.message);
    if (/captcha/i.test(error.message)) return { estado: "error", correo: r.data.correo, mensaje: "Confirma que no eres un robot y vuelve a enviar." };
    return {
      estado: "error",
      correo: r.data.correo,
      mensaje: espera ? "Ya te enviamos un enlace hace poco. Espera un minuto y vuelve a intentarlo." : "No pudimos enviar el correo. Inténtalo de nuevo en un momento.",
    };
  }
  return { estado: "enviado", correo: r.data.correo };
}

/** Entrar con Google: Supabase arma la dirección de Google y volvemos a /auth/callback. */
export async function entrarConGoogle(datos: FormData): Promise<void> {
  if (!configSupabase()) redirect("/entrar?error=sin-servicio");
  if (!googleActivo()) redirect("/entrar?error=google");
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: vuelta(rutaSegura(datos.get("siguiente"))) },
  });
  if (error || !data.url) redirect("/entrar?error=google");
  redirect(data.url);
}

export async function salir(): Promise<void> {
  if (configSupabase()) {
    const supabase = await crearClienteServidor();
    await supabase.auth.signOut();
  }
  redirect("/");
}
