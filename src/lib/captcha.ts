import "server-only";

/*
 * Verificación del captcha (Cloudflare Turnstile) en el servidor.
 * La respuesta del navegador no vale nada sola: hay que preguntarle a Cloudflare con la clave secreta.
 * Sin TURNSTILE_SECRET_KEY: en desarrollo se deja pasar con un aviso; en producción se rechaza siempre.
 */

const URL_VERIFICAR = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verificarCaptcha(respuesta: unknown, ip?: string | null): Promise<boolean> {
  const secreto = process.env.TURNSTILE_SECRET_KEY;
  if (!secreto) {
    if (process.env.NODE_ENV === "production") return false;
    console.warn("[captcha] Falta TURNSTILE_SECRET_KEY: en desarrollo se omite la verificación.");
    return true;
  }
  if (typeof respuesta !== "string" || respuesta.length === 0 || respuesta.length > 2048) return false;

  const cuerpo = new URLSearchParams({ secret: secreto, response: respuesta });
  if (ip) cuerpo.set("remoteip", ip);
  try {
    const r = await fetch(URL_VERIFICAR, { method: "POST", body: cuerpo, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return false;
    const datos = (await r.json()) as { success?: unknown };
    return datos.success === true;
  } catch {
    return false; // si Cloudflare no responde, no se deja pasar
  }
}
