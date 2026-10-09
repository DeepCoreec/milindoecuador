import type { Horario } from "@/lib/horario";
import type { Enlaces } from "@/lib/redes";

/** Formas de los datos que usan las páginas. Iguales con datos de muestra o con Supabase. */

export type Ciudad = { slug: string; nombre: string };

export type Categoria = {
  slug: string;
  nombre: string;
  nombreCorto?: string;
  principal: boolean;
  /** Frase debajo del título en la página de la categoría. */
  bajada: string;
};

export type LugarResumen = {
  slug: string;
  categoria: string;
  nombre: string;
  sector: string;
  /** Qué es y dónde, en una frase: "Restaurante en Urdesa". */
  datos: string;
  promedio: number | null;
  cantidad: number;
  precio: 1 | 2 | 3 | null;
  /** Plan "Destacado" vigente: sale primero. */
  destacado: boolean;
  /** Plan "Verificado": el negocio confirmó sus datos. */
  verificado: boolean;
  /** Dato corto para lugares sin precio, por ejemplo "Entrada libre". */
  extra?: string;
  /** Negocio inventado para mostrar el diseño: lleva la insignia "Ejemplo". */
  ejemplo: boolean;
};

export type Foto = { src: string; alt: string };

export type Resena = {
  id: string;
  /** Quién la escribió (para no ofrecerle reportar su propia reseña). */
  autorId?: string;
  autor: string;
  /** Fecha en formato ISO (UTC). Se muestra en hora de Ecuador. */
  fecha: string;
  estrellas: 1 | 2 | 3 | 4 | 5;
  texto: string;
  respuesta?: string;
};

/** Todo lo que muestra la ficha de un lugar. */
export type LugarDetalle = LugarResumen & {
  /** Identificador en la base (no existe en los datos de muestra). */
  id?: string;
  /** La historia del lugar (columna `description`). */
  descripcion: string;
  horario: string | null;
  direccion: string | null;
  /** Ubicación exacta (columnas `latitude` y `longitude`, versión 2). Sin ella, "Cómo llegar" busca por nombre. */
  ubicacion?: { lat: number; lng: number } | null;
  /** Horario por día (columna `opening_hours`, versión 2): para "Abierto ahora". */
  horarioDias?: Horario | null;
  /** Solo números, con 593 delante (columna `whatsapp`). */
  whatsapp: string | null;
  /** Redes y página web del negocio (versión 3). */
  enlaces?: Enlaces;
  fotos: Foto[];
  resenas: Resena[];
};
