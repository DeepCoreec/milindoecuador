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

export const MOTIVOS_REPORTE = {
  falsa: "Es falsa o publicidad",
  ofensiva: "Tiene insultos u ofensas",
  "otro-lugar": "No habla de este lugar",
  privada: "Muestra datos personales",
  otro: "Otro motivo",
} as const;

/** Reporte de una reseña: un motivo de la lista y, si se quiere, un detalle corto. */
export const esquemaReporte = z
  .object({
    resena: z.uuid(),
    ruta: rutaFicha,
    motivo: z.enum(Object.keys(MOTIVOS_REPORTE) as [keyof typeof MOTIVOS_REPORTE, ...(keyof typeof MOTIVOS_REPORTE)[]], { error: "Elige un motivo" }),
    detalle: z.string().trim().max(400, "Máximo 400 caracteres").optional().default(""),
  })
  .refine((r) => r.motivo !== "otro" || r.detalle.length >= 3, { message: "Cuéntanos el motivo en pocas palabras", path: ["detalle"] });

/** Motivos para reportar un lugar (versión 2, paso 9.7). Con 3 reportes de personas distintas, se oculta solo. */
export const MOTIVOS_REPORTE_LUGAR = {
  falso: "No existe o es falso",
  fotos: "Fotos inapropiadas o que no son del lugar",
  estafa: "Estafa o publicidad engañosa",
  ofensivo: "Tiene insultos u ofensas",
  datos: "Datos equivocados (horario, dirección, WhatsApp)",
  otro: "Otro motivo",
} as const;

export const esquemaReporteLugar = z
  .object({
    lugar: z.uuid(),
    ruta: rutaFicha,
    motivo: z.enum(Object.keys(MOTIVOS_REPORTE_LUGAR) as [keyof typeof MOTIVOS_REPORTE_LUGAR, ...(keyof typeof MOTIVOS_REPORTE_LUGAR)[]], { error: "Elige un motivo" }),
    detalle: z.string().trim().max(400, "Máximo 400 caracteres").optional().default(""),
  })
  .refine((r) => r.motivo !== "otro" || r.detalle.length >= 3, { message: "Cuéntanos el motivo en pocas palabras", path: ["detalle"] });
