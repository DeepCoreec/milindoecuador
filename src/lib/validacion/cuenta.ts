import { z } from "zod";

/** Nombre que se ve junto a las reseñas: de 2 a 40 caracteres, sin saltos de línea ni caracteres invisibles. */
export const esquemaNombre = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "Escribe al menos 2 letras")
    .max(40, "Máximo 40 caracteres")
    .refine((v) => !/[\p{Cc}\p{Cf}]/u.test(v), "Usa solo letras, números y signos comunes"),
});

/** Para borrar la cuenta hay que escribir BORRAR: evita borrarla por un toque sin querer. */
export const esquemaBorrar = z.object({ confirmacion: z.literal("BORRAR", { error: "Escribe BORRAR en mayúsculas para confirmar" }) });
