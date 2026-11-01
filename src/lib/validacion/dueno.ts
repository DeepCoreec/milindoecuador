import { z } from "zod";
import { CODIGOS_ESPECIALIDAD, CODIGOS_IDIOMA } from "@/lib/guias";
import { esquemaFoto, esquemaLugar, esquemaRespuesta } from "./admin";

/** Las fichas recién aprobadas empiezan con este texto: hay que cambiarlo antes de publicar. */
export const DESCRIPCION_PENDIENTE = "Descripción pendiente";

/**
 * Lo que el dueño puede cambiar de su ficha (versión 2, paso 9.2). Las mismas reglas que el panel;
 * la categoría, el estado, los planes y el dueño no los toca desde aquí.
 */
export const esquemaNegocio = esquemaLugar
  .pick({ nombre: true, sector: true, descripcion: true, dato: true, horario: true, direccion: true, ubicacion: true, horarioDias: true, precio: true, whatsapp: true, web: true, facebook: true, instagram: true, tiktok: true, youtube: true })
  .extend({ lugar: z.uuid() });

export const esquemaEstadoDueno = z.object({ lugar: z.uuid(), estado: z.enum(["borrador", "publicado"]) });
export const esquemaSubidaDueno = z.object({ lugar: z.uuid(), formato: z.enum(["webp", "jpg"]) });
export const esquemaFotoDueno = esquemaFoto;
export const esquemaRespuestaDueno = esquemaRespuesta;

// Perfil del guía turístico (versión 13, 41.2). La base vuelve a exigir las listas fijas (migración 0023).
const sinInvisibles = (v: string) => !/[\p{Cc}\p{Cf}]/u.test(v);
export const esquemaPerfilGuia = z.object({
  lugar: z.uuid(),
  idiomas: z
    .array(z.enum(CODIGOS_IDIOMA, "Elige idiomas de la lista"))
    .max(20)
    .transform((v) => [...new Set(v)])
    .refine((v) => v.length >= 1, "Elige al menos un idioma")
    .refine((v) => v.length <= 8, "Máximo 8 idiomas"),
  especialidades: z
    .array(z.enum(CODIGOS_ESPECIALIDAD, "Elige especialidades de la lista"))
    .max(20)
    .transform((v) => [...new Set(v)])
    .refine((v) => v.length <= 6, "Máximo 6 especialidades"),
  zonas: z
    .string()
    .trim()
    .max(160, "Las zonas: máximo 160 caracteres")
    .refine(sinInvisibles, "Las zonas: usa solo letras, números y signos comunes")
    .transform((v) => v || null)
    .refine((v) => v === null || v.length >= 2, "Las zonas: escribe al menos 2 letras"),
  credencial: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase() || null)
    .refine((v) => v === null || /^[A-Z0-9][A-Z0-9 ./-]{2,39}$/.test(v), "El número de credencial: solo letras, números, puntos y guiones (3 a 40)"),
});

/** El mismo perfil, pero al registrarse (todavía no hay ficha). */
export const esquemaPerfilGuiaRegistro = esquemaPerfilGuia.omit({ lugar: true });
