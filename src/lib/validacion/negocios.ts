import { z } from "zod";

/**
 * Celular de Ecuador al formato que guarda la base (593 + 9 dígitos, empieza en 9).
 * Acepta como lo escribe la gente: "099 123 4567", "99-123-4567", "+593 99 123 4567".
 */
export function normalizarCelular(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const d = valor.replace(/\D/g, "");
  const local = d.startsWith("593") ? d.slice(3) : d.startsWith("0") ? d.slice(1) : d;
  return /^9\d{8}$/.test(local) ? `593${local}` : null;
}

const sinInvisibles = (v: string) => !/[\p{Cc}\p{Cf}]/u.test(v.replace(/\r?\n/g, ""));

export const esquemaSolicitud = z.object({
  negocio: z.string().trim().min(2, "Escribe el nombre del negocio").max(120, "Máximo 120 caracteres").refine(sinInvisibles, "Usa solo letras, números y signos comunes"),
  categoria: z.string().regex(/^[a-z0-9-]{2,40}$/, "Elige una categoría"),
  sector: z.string().trim().max(80, "Máximo 80 caracteres").refine(sinInvisibles, "Usa solo letras, números y signos comunes").optional().default(""),
  contacto: z.string().trim().min(2, "Escribe tu nombre").max(80, "Máximo 80 caracteres").refine(sinInvisibles, "Usa solo letras, números y signos comunes"),
  whatsapp: z.string().transform((v, ctx) => {
    const n = normalizarCelular(v);
    if (!n) ctx.addIssue({ code: "custom", message: "Escribe un celular de Ecuador, por ejemplo 099 123 4567" });
    return n ?? "";
  }),
  descripcion: z.string().trim().max(1000, "Máximo 1000 caracteres").refine(sinInvisibles, "Usa solo letras, números y signos comunes").optional().default(""),
  terminos: z.literal("on", { error: "Debes aceptar los términos para enviar" }),
});

export type CampoSolicitud = keyof z.input<typeof esquemaSolicitud>;
