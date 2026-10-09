import { z } from "zod";

/*
 * Reglas del video del negocio (versión 3, fase 11). Las mismas que la base (migración 0009):
 * 1 video por negocio, MP4, MOV o WebM, hasta 50 MB (máximo por archivo del plan gratis de Supabase) y 90 segundos.
 */

export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const VIDEO_MAX_SEGUNDOS = 90;
export const TIPOS_VIDEO = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" } as const;
export type TipoVideo = keyof typeof TIPOS_VIDEO;

/** Cuántos permisos de subida puede pedir un dueño al día (cada uno cuenta, aunque no termine de subir). */
export const VIDEOS_POR_DIA = 5;

/** Carpeta de un lugar dentro del bucket `videos-lugares`. */
export const carpetaVideo = (lugar: string) => `lugares/${lugar}`;

const modo = z.enum(["dueno", "admin"]);
const lugar = z.uuid();

export const esquemaPedirVideo = z.object({
  lugar,
  modo,
  /** Safari no sabe guardar WebP: allí la portada va en JPG. */
  portada: z.enum(["webp", "jpg"]),
  tipo: z.enum(Object.keys(TIPOS_VIDEO) as [TipoVideo, ...TipoVideo[]], { error: "Usa un video MP4, MOV o WebM" }),
  tamano: z
    .number()
    .int()
    .positive()
    .max(VIDEO_MAX_BYTES, "El video pesa más de 50 MB. Recórtalo o grábalo en menor calidad (1080p o 720p)."),
});

export const esquemaRegistrarVideo = z
  .object({
    lugar,
    modo,
    video: z.string().regex(/^lugares\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp4|mov|webm)$/, "Video inválido"),
    portada: z.string().regex(/^lugares\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg)$/, "Portada inválida"),
    duracion: z.coerce
      .number()
      .positive("No pudimos leer la duración del video")
      .max(VIDEO_MAX_SEGUNDOS + 0.5, `El video dura más de ${VIDEO_MAX_SEGUNDOS} segundos. Recórtalo y vuelve a intentarlo.`),
  })
  .refine((v) => v.video.startsWith(`${carpetaVideo(v.lugar)}/`) && v.portada.startsWith(`${carpetaVideo(v.lugar)}/`), {
    message: "El video no es de este negocio",
  });

export const esquemaBorrarVideo = z.object({ lugar, modo });
