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

export type Plan = "gratis" | "destacado" | "verificado";

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
  plan: Plan;
  /** Dato corto para lugares sin precio, por ejemplo "Entrada libre". */
  extra?: string;
  /** Negocio inventado para mostrar el diseño: lleva la insignia "Ejemplo". */
  ejemplo: boolean;
};

export type Foto = { src: string; alt: string };

export type Resena = {
  id: string;
  autor: string;
  /** Fecha en formato ISO (UTC). Se muestra en hora de Ecuador. */
  fecha: string;
  estrellas: 1 | 2 | 3 | 4 | 5;
  texto: string;
  respuesta?: string;
};

/** Todo lo que muestra la ficha de un lugar. */
export type LugarDetalle = LugarResumen & {
  /** La historia del lugar (columna `description`). */
  descripcion: string;
  horario: string | null;
  direccion: string | null;
  /** Solo números, con 593 delante (columna `whatsapp`). */
  whatsapp: string | null;
  fotos: Foto[];
  resenas: Resena[];
};
