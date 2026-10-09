/**
 * Cómo se guardan las cookies de sesión de Supabase (versión 3, paso 13.3):
 * - `httpOnly`: ningún script de la página las puede leer (si alguien lograra meter un script, no se lleva la sesión);
 * - `sameSite: lax` y, en producción, `secure` (solo por HTTPS).
 * La página ya no necesita la sesión en el navegador: todo lo que la usa pasa por el servidor.
 */
export const opcionesCookieSesion = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** Cookie SIN secreto que solo dice "hay sesión", para cambiar "Entrar" por "Mi cuenta" en los menús. */
export const COOKIE_CON_SESION = "mle-con-sesion";
