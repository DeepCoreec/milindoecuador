import { z } from "zod";
import { esquemaFoto, esquemaLugar, esquemaRespuesta } from "./admin";

/** Las fichas recién aprobadas empiezan con este texto: hay que cambiarlo antes de publicar. */
export const DESCRIPCION_PENDIENTE = "Descripción pendiente";

/**
 * Lo que el dueño puede cambiar de su ficha (versión 2, paso 9.2). Las mismas reglas que el panel;
 * la categoría, el estado, los planes y el dueño no los toca desde aquí.
 */
export const esquemaNegocio = esquemaLugar
  .pick({ nombre: true, sector: true, descripcion: true, dato: true, horario: true, direccion: true, ubicacion: true, precio: true, whatsapp: true })
  .extend({ lugar: z.uuid() });

export const esquemaEstadoDueno = z.object({ lugar: z.uuid(), estado: z.enum(["borrador", "publicado"]) });
export const esquemaSubidaDueno = z.object({ lugar: z.uuid() });
export const esquemaFotoDueno = esquemaFoto;
export const esquemaRespuestaDueno = esquemaRespuesta;
