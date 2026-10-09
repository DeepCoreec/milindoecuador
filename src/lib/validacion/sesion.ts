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
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return porDefecto;
  // Solo caracteres normales de una ruta (auditoría 2026-10-09: un carácter raro rompía la redirección con error 500)
  if (!/^\/[A-Za-z0-9\-._~/?=&%#+]*$/.test(valor) || /(^|\/)\.\.?(\/|$)/.test(valor)) return porDefecto;
  return valor;
}

/*
 * Contraseñas (versión 2, paso 6.2). Mínimo 8 caracteres; máximo 72 porque Supabase guarda la contraseña con bcrypt,
 * que ignora lo que pasa de 72 bytes. No se recortan espacios: son parte de la contraseña.
 */
const contrasenaNueva = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña es demasiado larga (máximo 72 caracteres)")
  .refine((c) => new TextEncoder().encode(c).length <= 72, "La contraseña es demasiado larga (máximo 72 caracteres)");

const repetida = <T extends { contrasena: string; repetir: string }>(d: T) => d.contrasena === d.repetir;
const avisoRepetida = { message: "Las dos contraseñas no son iguales", path: ["repetir"] };

/** Entrar: aquí no se exige el mínimo, para no dar pistas de cómo son las contraseñas guardadas. */
export const esquemaEntrar = esquemaCorreo.extend({
  contrasena: z.string().min(1, "Escribe tu contraseña").max(200, "La contraseña es demasiado larga"),
});

export const esquemaCrearCuenta = esquemaCorreo
  .extend({ contrasena: contrasenaNueva, repetir: z.string().max(200) })
  .refine(repetida, avisoRepetida);

export const esquemaNuevaContrasena = z
  .object({ contrasena: contrasenaNueva, repetir: z.string().max(200) })
  .refine(repetida, avisoRepetida);
