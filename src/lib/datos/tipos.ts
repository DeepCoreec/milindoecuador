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
