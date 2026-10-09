/*
 * Errores del servidor en producción (versión 3, paso 13.5). Los recibe `src/instrumentation.ts`
 * (onRequestError de Next.js) y se anotan en la base para verlos en el panel ("Errores").
 * Antes de guardar se quita todo lo que pueda ser de la persona: solo la ruta sin "?…", y en el mensaje
 * se tapan correos, tokens largos y números de teléfono.
 */

export type ErrorAnotado = { ruta: string; tipo: string; mensaje: string; codigo: string | null };

export function limpiarError(error: unknown, ruta: string, tipo: string): ErrorAnotado {
  const crudo = error instanceof Error ? error.message : typeof error === "string" ? error : "Error sin mensaje";
  const codigo = typeof error === "object" && error !== null && "digest" in error ? String((error as { digest: unknown }).digest).slice(0, 64) : null;
  const mensaje = crudo
    .replace(/"[^"]{0,200}"|'[^']{0,200}'|«[^»]{0,200}»/g, '"…"') // lo que va entre comillas suele ser lo que escribió alguien
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[correo]")
    .replace(/\b(?:eyJ[\w-]{10,}\.[\w-]+\.[\w-]+|[A-Za-z0-9_-]{32,})\b/g, "[token]")
    .replace(/(?:\+?593|0)9\d{8}\b/g, "[teléfono]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
  return {
    ruta: (ruta.split("?")[0] ?? "").slice(0, 200) || "/",
    tipo: tipo.slice(0, 40),
    mensaje: mensaje || "Error sin mensaje",
    codigo,
  };
}
