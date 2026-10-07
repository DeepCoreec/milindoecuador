"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { requireUsuario } from "@/lib/auth";
import { googleActivo, urlSitio } from "@/lib/sitio";
import { configSupabase } from "@/lib/supabase/config";
import { crearClienteServidor } from "@/lib/supabase/server";
import { esquemaCorreo, esquemaCrearCuenta, esquemaEntrar, esquemaNuevaContrasena, rutaSegura } from "@/lib/validacion/sesion";

/*
 * Cómo se entra (versión 2, paso 6.2): Google o correo y contraseña.
 * El correo solo se usa para confirmar la cuenta nueva y para recuperar la contraseña.
 * El captcha lo verifica Supabase Auth (Authentication → Attack Protection → Turnstile), así también se protege a quien
 * llame directo a /auth/v1. No lo verificamos aquí: cada respuesta del captcha sirve una sola vez.
 */

export type Campo = "correo" | "contrasena" | "repetir";
export type EstadoSesion = { estado: "inicio" | "enviado" | "ok" | "error"; mensaje?: string; correo?: string; campo?: Campo };

const SIN_SUPABASE = "El inicio de sesión todavía no está activo. Vuelve pronto.";
const CAPTCHA = "Confirma que no eres un robot y vuelve a intentarlo.";
const ESPERA = "Hiciste muchos intentos seguidos. Espera unos minutos y vuelve a intentarlo.";

/** Ruta a la que vuelve el enlace del correo (confirmar cuenta, recuperar contraseña) o Google. */
function vuelta(siguiente: string) {
  const u = new URL("/auth/callback", urlSitio());
  u.searchParams.set("siguiente", siguiente);
  return u.toString();
}

function tokenCaptcha(datos: FormData): string | undefined {
  const t = datos.get("cf-turnstile-response");
  return typeof t === "string" && t ? t : undefined;
}

/** Los errores de Supabase que comparten todos los formularios. */
function errorComun(e: AuthError): string | undefined {
  if (e.code === "captcha_failed" || /captcha/i.test(e.message)) return CAPTCHA;
  if (e.status === 429 || e.code?.startsWith("over_")) return ESPERA;
  if (e.code === "weak_password") return "Esa contraseña es muy fácil de adivinar. Usa una más larga o con más variedad.";
  return undefined;
}

function primerError(issues: { message: string; path: PropertyKey[] }[]): { mensaje: string; campo?: Campo } {
  const i = issues[0];
  const campo = i?.path[0];
  return { mensaje: i?.message ?? "Revisa los datos", campo: campo === "correo" || campo === "contrasena" || campo === "repetir" ? campo : undefined };
}

/** Entrar con correo y contraseña. Si sale bien, lleva a donde iba la persona. */
export async function entrarConContrasena(_previo: EstadoSesion, datos: FormData): Promise<EstadoSesion> {
  const r = esquemaEntrar.safeParse({ correo: datos.get("correo"), contrasena: datos.get("contrasena") });
  const correo = String(datos.get("correo") ?? "").slice(0, 254);
  if (!r.success) return { estado: "error", correo, ...primerError(r.error.issues) };
  if (!configSupabase()) return { estado: "error", correo, mensaje: SIN_SUPABASE };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: r.data.correo,
    password: r.data.contrasena,
    options: { captchaToken: tokenCaptcha(datos) },
  });
  if (error) {
    const comun = errorComun(error);
    if (comun) return { estado: "error", correo, mensaje: comun };
    if (error.code === "email_not_confirmed")
      return { estado: "error", correo, mensaje: "Primero confirma tu cuenta con el enlace que te enviamos al correo. Mira también en Spam." };
    // Mismo mensaje si el correo no existe o la contraseña está mal: no revelamos qué correos tienen cuenta
    return { estado: "error", correo, campo: "contrasena", mensaje: "El correo o la contraseña no son correctos." };
  }
  redirect(rutaSegura(datos.get("siguiente")));
}

/**
 * Crear cuenta. Supabase manda un correo para confirmarla. Si el correo ya tenía cuenta, Supabase responde igual
 * (sin crear nada ni avisar), para no revelar quién está registrado; por eso siempre decimos "revisa tu correo".
 */
export async function crearCuenta(_previo: EstadoSesion, datos: FormData): Promise<EstadoSesion> {
  const r = esquemaCrearCuenta.safeParse({ correo: datos.get("correo"), contrasena: datos.get("contrasena"), repetir: datos.get("repetir") });
  const correo = String(datos.get("correo") ?? "").slice(0, 254);
  if (!r.success) return { estado: "error", correo, ...primerError(r.error.issues) };
  if (!configSupabase()) return { estado: "error", correo, mensaje: SIN_SUPABASE };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signUp({
    email: r.data.correo,
    password: r.data.contrasena,
    options: { emailRedirectTo: vuelta(rutaSegura(datos.get("siguiente"))), captchaToken: tokenCaptcha(datos) },
  });
  if (error) {
    const comun = errorComun(error);
    if (comun) return { estado: "error", correo, mensaje: comun, campo: error.code === "weak_password" ? "contrasena" : undefined };
    if (error.code === "user_already_exists") return { estado: "enviado", correo: r.data.correo };
    return { estado: "error", correo, mensaje: "No pudimos crear la cuenta. Inténtalo de nuevo en un momento." };
  }
  return { estado: "enviado", correo: r.data.correo };
}

/** "Olvidé mi contraseña": manda un enlace que abre "Mi cuenta" para escribir una nueva. Siempre responde igual. */
export async function pedirRecuperacion(_previo: EstadoSesion, datos: FormData): Promise<EstadoSesion> {
  const r = esquemaCorreo.safeParse({ correo: datos.get("correo") });
  const correo = String(datos.get("correo") ?? "").slice(0, 254);
  if (!r.success) return { estado: "error", correo, ...primerError(r.error.issues) };
  if (!configSupabase()) return { estado: "error", correo, mensaje: SIN_SUPABASE };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(r.data.correo, {
    redirectTo: vuelta("/cuenta?contrasena=nueva#contrasena"),
    captchaToken: tokenCaptcha(datos),
  });
  if (error) {
    const comun = errorComun(error);
    if (comun) return { estado: "error", correo, mensaje: comun };
  }
  return { estado: "enviado", correo: r.data.correo };
}

/** Cambiar la contraseña desde "Mi cuenta" (también al volver del enlace de recuperación). */
export async function cambiarContrasena(_previo: EstadoSesion, datos: FormData): Promise<EstadoSesion> {
  const r = esquemaNuevaContrasena.safeParse({ contrasena: datos.get("contrasena"), repetir: datos.get("repetir") });
  if (!r.success) return { estado: "error", ...primerError(r.error.issues) };
  await requireUsuario("/cuenta");

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: r.data.contrasena });
  if (error) {
    if (error.code === "same_password") return { estado: "error", campo: "contrasena", mensaje: "La nueva contraseña debe ser distinta de la anterior." };
    const comun = errorComun(error);
    return { estado: "error", campo: error.code === "weak_password" ? "contrasena" : undefined, mensaje: comun ?? "No se pudo guardar. Inténtalo de nuevo." };
  }
  return { estado: "ok", mensaje: "Contraseña guardada. La próxima vez entra con ella." };
}

/** Entrar con Google: Supabase arma la dirección de Google y volvemos a /auth/callback. Solo si está activo (6.1). */
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
