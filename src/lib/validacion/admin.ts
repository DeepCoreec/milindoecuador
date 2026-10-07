import { z } from "zod";
import { enEcuador, leerUbicacion, type Ubicacion } from "@/lib/ubicacion";

export const esquemaDecision = z.object({
  solicitud: z.uuid(),
  nota: z.string().trim().max(1000, "Máximo 1000 caracteres").optional().default(""),
});

const sinInvisibles = (v: string) => !/[\p{Cc}\p{Cf}]/u.test(v.replace(/\r?\n/g, ""));
const texto = (min: number, max: number, nombre: string) =>
  z
    .string()
    .trim()
    .min(min, min > 0 ? `${nombre}: escribe al menos ${min} caracteres` : undefined)
    .max(max, `${nombre}: máximo ${max} caracteres`)
    .refine(sinInvisibles, `${nombre}: usa solo letras, números y signos comunes`);
const opcional = (max: number, nombre: string) => texto(0, max, nombre).transform((v) => v || null);

/** Datos de una ficha, con las mismas reglas que la tabla `places`. */
export const esquemaLugar = z.object({
  id: z.union([z.literal("nuevo"), z.uuid()]),
  nombre: texto(2, 120, "Nombre"),
  categoria: z.string().regex(/^[a-z0-9-]{2,40}$/, "Elige una categoría"),
  sector: texto(2, 80, "Sector"),
  descripcion: texto(20, 2000, "Historia"),
  dato: opcional(80, "Dato corto"),
  horario: opcional(120, "Horario"),
  direccion: opcional(200, "Dirección"),
  ubicacion: z
    .string()
    .max(2000, "Ubicación: pega solo las coordenadas")
    .optional()
    .transform((v, ctx): Ubicacion | null => {
      const u = leerUbicacion(v ?? "");
      if (u === "invalida") {
        ctx.addIssue({ code: "custom", message: "Ubicación: pega las coordenadas que da Google Maps, por ejemplo -2.189400, -79.880800" });
        return null;
      }
      if (u && !enEcuador(u)) {
        ctx.addIssue({ code: "custom", message: "Ubicación: ese punto queda fuera de Ecuador. Revisa que no falte el signo menos (-)" });
        return null;
      }
      return u;
    }),
  precio: z.enum(["", "1", "2", "3"]).transform((v) => (v ? Number(v) : null)),
  whatsapp: z.string().transform((v, ctx) => {
    if (!v.trim()) return null;
    const d = v.replace(/\D/g, "");
    const local = d.startsWith("593") ? d.slice(3) : d.startsWith("0") ? d.slice(1) : d;
    if (!/^9\d{8}$/.test(local)) ctx.addIssue({ code: "custom", message: "WhatsApp: escribe un celular de Ecuador, por ejemplo 099 123 4567" });
    return `593${local}`;
  }),
  estado: z.enum(["borrador", "publicado", "oculto"]),
});

export const esquemaFoto = z.object({
  lugar: z.uuid(),
  camino: z.string().regex(/^lugares\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/, "Camino de foto inválido"),
  alt: texto(3, 160, "Descripción de la foto"),
});
export const esquemaIdFoto = z.object({ foto: z.uuid() });
export const esquemaMoverFoto = z.object({ foto: z.uuid(), direccion: z.enum(["antes", "despues"]) });

export const esquemaModerar = z.object({ resena: z.uuid(), decision: z.enum(["ocultar", "mantener", "mostrar"]) });
export const esquemaRespuesta = z.object({ resena: z.uuid(), respuesta: opcional(1000, "Respuesta") });

export const esquemaPlan = z.object({
  lugar: z.uuid(),
  accion: z.enum(["destacar-semana", "destacar-seis-semanas", "quitar-destacado", "verificar", "quitar-verificado"]),
});

/** Palabra o frase para la lista de prohibidas (versión 2, paso 9.1). La base la guarda normalizada. */
export const esquemaPalabra = z.object({
  palabra: z
    .string()
    .trim()
    .min(2, "Escribe al menos 2 letras")
    .max(60, "Máximo 60 caracteres")
    .regex(/^[\p{L} ]+$/u, "Solo letras y espacios"),
});

/** Cambios recientes y lugares reportados (versión 2, pasos 9.6 y 9.7). */
export const esquemaRevisado = z.object({ cambio: z.union([z.literal("todos"), z.coerce.number().int().positive()]) });
export const esquemaLugarAdmin = z.object({ lugar: z.uuid() });
export const esquemaDecisionLugar = z.object({ lugar: z.uuid(), decision: z.enum(["mostrar", "ocultar"]) });
