/*
 * Motivos para reportar reseñas, lugares, videos y eventos. Van en un archivo aparte, sin Zod, porque los usan las
 * ventanas de reporte en el navegador: así la ficha no descarga la librería de validación (versión 10, 36.1).
 * La validación en el servidor (`src/lib/validacion/resenas.ts`) usa estas mismas listas.
 */

export const MOTIVOS_REPORTE = {
  falsa: "Es falsa o publicidad",
  ofensiva: "Tiene insultos u ofensas",
  "otro-lugar": "No habla de este lugar",
  privada: "Muestra datos personales",
  otro: "Otro motivo",
} as const;

/** Motivos para reportar un lugar (versión 2, paso 9.7). Con 3 reportes de personas distintas, se oculta solo. */
export const MOTIVOS_REPORTE_LUGAR = {
  falso: "No existe o es falso",
  fotos: "Fotos inapropiadas o que no son del lugar",
  estafa: "Estafa o publicidad engañosa",
  ofensivo: "Tiene insultos u ofensas",
  datos: "Datos equivocados (horario, dirección, WhatsApp)",
  otro: "Otro motivo",
} as const;

/** Motivos para reportar el video de un negocio (versión 3, paso 11.5). Con 3 reportes se oculta solo el video. */
export const MOTIVOS_REPORTE_VIDEO = {
  sexual: "Contenido sexual o desnudos",
  violento: "Violencia o maltrato",
  estafa: "Estafa o publicidad engañosa",
  ajeno: "No es de este negocio",
  ofensivo: "Insultos u odio",
  otro: "Otro motivo",
} as const;

/** Motivos para reportar un evento (versión 5, fase 22). Con 3 reportes el evento se oculta solo. */
export const MOTIVOS_REPORTE_EVENTO = {
  falso: "No existe o es falso",
  estafa: "Estafa o publicidad engañosa",
  ofensivo: "Tiene insultos u ofensas",
  sexual: "Contenido sexual o violento",
  datos: "La fecha o los datos están mal",
  otro: "Otro motivo",
} as const;

export const MOTIVOS_POR_OBJETIVO = { lugar: MOTIVOS_REPORTE_LUGAR, video: MOTIVOS_REPORTE_VIDEO, evento: MOTIVOS_REPORTE_EVENTO } as const;
export function motivosDe(objetivo: keyof typeof MOTIVOS_POR_OBJETIVO): Record<string, string> {
  return MOTIVOS_POR_OBJETIVO[objetivo];
}

