import { z } from "zod";

export const esquemaCorreo = z.object({
  correo: z.string().trim().toLowerCase().max(254, "El correo es demasiado largo").pipe(z.email("Escribe un correo válido, por ejemplo nombre@gmail.com")),
});

/**
 * A dónde volver después de entrar. Solo rutas internas ("/algo"): nunca "//otro-sitio" ni
 * "https://…", para que nadie use nuestro enlace para mandar a la gente a una página falsa.
 */
export function rutaSegura(valor: unknown, porDefecto = "/cuenta"): string {
  if (typeof valor !== "string" || valor.length > 200) return porDefecto;
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\") || /[\r\n\t]/.test(valor)) return porDefecto;
  return valor;
}
