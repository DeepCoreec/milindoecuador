import { z } from "zod";

/*
 * Filtros de la página de categoría, leídos de la dirección (?sector=…&precio=1&orden=…).
 * Cualquiera puede escribir lo que quiera en la dirección, así que se valida aquí:
 * lo que no sirve se ignora en vez de romper la página.
 */

export const ORDENES = ["destacados", "calificacion", "resenas"] as const;
export type Orden = (typeof ORDENES)[number];

const unoOVarios = z.union([z.string(), z.array(z.string())]).optional();

const esquema = z.object({
  sector: z.string().trim().max(80).optional().catch(undefined),
  precio: unoOVarios.catch(undefined),
  orden: z.enum(ORDENES).optional().catch(undefined),
});

export type Filtros = { sector: string | null; precios: (1 | 2 | 3)[]; orden: Orden };

export function leerFiltros(entrada: Record<string, string | string[] | undefined>): Filtros {
  const r = esquema.parse(entrada);
  const lista = r.precio === undefined ? [] : Array.isArray(r.precio) ? r.precio : [r.precio];
  const precios = [...new Set(lista.map(Number))].filter((n): n is 1 | 2 | 3 => n === 1 || n === 2 || n === 3).sort();
  return { sector: r.sector || null, precios, orden: r.orden ?? "destacados" };
}
