import { z } from "zod";

/*
 * Recorridos de los guías (versión 13, 42.2). Mismas reglas que la base (migración 0024); la base las vuelve a exigir.
 */

const sinInvisibles = (v: string) => !/[\p{Cc}\p{Cf}]/u.test(v.replace(/\r?\n/g, ""));

/** Duraciones que se ofrecen en la lista (en minutos). */
export const DURACIONES = [30, 60, 90, 120, 150, 180, 240, 300, 360, 480, 600, 720] as const;

export function textoDuracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} minutos`;
  const horas = h === 1 ? "1 hora" : `${h} horas`;
  return m ? `${horas} y ${m} minutos` : horas;
}

export const esquemaRecorrido = z.object({
  lugar: z.uuid(),
  recorrido: z.union([z.literal(""), z.uuid()]).transform((v) => v || null),
  nombre: z.string().trim().min(3, "El nombre: al menos 3 letras").max(80, "El nombre: máximo 80 caracteres").refine(sinInvisibles, "El nombre: usa solo letras, números y signos comunes"),
  descripcion: z
    .string()
    .trim()
    .min(40, "Cuenta qué se hace en el recorrido en al menos 40 letras")
    .max(800, "La descripción: máximo 800 caracteres")
    .refine(sinInvisibles, "La descripción: usa solo letras, números y signos comunes"),
  duracion: z.coerce.number().refine((n) => (DURACIONES as readonly number[]).includes(n), "Elige la duración de la lista"),
  precio: z
    .string()
    .trim()
    .transform((v) => v.replace(",", "."))
    .refine((v) => v === "" || /^\d{1,4}(\.\d{1,2})?$/.test(v), "El precio: solo el número en dólares, por ejemplo 15 o 12.50")
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || v <= 1000, "El precio: máximo 1000 dólares por persona"),
  encuentro: z.string().trim().min(3, "Escribe el punto de encuentro").max(160, "El punto de encuentro: máximo 160 caracteres").refine(sinInvisibles, "El punto de encuentro: usa solo letras, números y signos comunes"),
  paradas: z
    .array(z.union([z.literal(""), z.uuid("Elige las paradas de la lista")]))
    .max(8, "Máximo 8 paradas")
    .transform((v) => v.filter((x): x is string => x !== ""))
    .refine((v) => v.length >= 2, "Elige al menos 2 paradas")
    .refine((v) => new Set(v).size === v.length, "Una parada está repetida"),
  estado: z.enum(["borrador", "publicado"], "Elige si se publica o queda en borrador"),
});

export const esquemaBorrarRecorrido = z.object({ lugar: z.uuid(), recorrido: z.uuid() });
