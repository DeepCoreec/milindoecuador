import { z } from "zod";

/** Ruta de una ficha: /ciudad/categoria/lugar, solo letras minúsculas, números y guiones. */
const rutaFicha = z.string().regex(/^\/[a-z0-9-]{1,60}\/[a-z0-9-]{1,60}\/[a-z0-9-]{1,120}$/, "Ruta inválida");

/** Mismas reglas que la base: 1 a 5 estrellas y 10 a 1000 caracteres de texto. */
export const esquemaResena = z.object({
  lugar: z.uuid(),
  ruta: rutaFicha,
  estrellas: z.coerce.number({ error: "Elige de 1 a 5 estrellas" }).int().min(1, "Elige de 1 a 5 estrellas").max(5, "Elige de 1 a 5 estrellas"),
  texto: z.string({ error: "Escribe tu reseña" }).trim().min(10, "Cuéntanos un poco más: al menos 10 caracteres").max(1000, "Máximo 1000 caracteres"),
});

export const esquemaBorrarResena = z.object({ lugar: z.uuid(), ruta: rutaFicha });
