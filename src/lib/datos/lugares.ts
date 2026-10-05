import type { CategoriaBarra } from "@/components/categorias/BarraCategorias";
import type { Filtros } from "@/lib/validacion/filtros";
import { filtrarLugares, sectoresDe } from "./filtrar";
import { CATEGORIAS, CIUDADES, ENCEBOLLADOS, LUGARES, resumen } from "./muestra";
import type { Categoria, Ciudad, LugarDetalle } from "./tipos";

/*
 * Funciones de lectura que usan las páginas.
 * Hoy leen los datos de muestra (muestra.ts). Cuando exista Supabase consultarán la base
 * (solo lugares publicados) y devolverán la misma forma, así las páginas no cambian.
 */

export function rutaLugar(ciudad: string, l: { categoria: string; slug: string }) {
  return `/${ciudad}/${l.categoria}/${l.slug}`;
}

const deCiudad = (ciudad: string) => (ciudad === "guayaquil" ? LUGARES : []);

export async function getCiudad(slug: string): Promise<Ciudad | null> {
  return CIUDADES.find((c) => c.slug === slug) ?? null;
}

export async function getCiudades(): Promise<Ciudad[]> {
  return CIUDADES;
}

export async function getCategoria(slug: string): Promise<Categoria | null> {
  return CATEGORIAS.find((c) => c.slug === slug) ?? null;
}

export async function getCategorias(): Promise<Categoria[]> {
  return CATEGORIAS;
}

export async function getCategoriasBarra(ciudad: string): Promise<CategoriaBarra[]> {
  return CATEGORIAS.map(({ slug, nombre, nombreCorto, principal }) => ({ slug, nombre, nombreCorto, principal, href: `/${ciudad}/${slug}` }));
}

/** Lugares de una categoría con los filtros aplicados, y los sectores disponibles para el filtro. */
export async function getLugaresDeCategoria(ciudad: string, categoria: string, filtros: Filtros) {
  const todos = deCiudad(ciudad).filter((l) => l.categoria === categoria).map(resumen);
  return { lugares: filtrarLugares(todos, filtros), sectores: sectoresDe(todos), total: todos.length };
}

/** Un lugar para su ficha. Debe ser de esa ciudad y de esa categoría; si no, no existe. */
export async function getLugar(ciudad: string, categoria: string, slug: string): Promise<LugarDetalle | null> {
  return deCiudad(ciudad).find((l) => l.categoria === categoria && l.slug === slug) ?? null;
}

/** Todos los lugares publicados de una ciudad (para el sitemap). */
export async function getLugaresDeCiudad(ciudad: string) {
  return deCiudad(ciudad).map(resumen);
}

export async function getSeccionesInicio() {
  return {
    encebollados: ENCEBOLLADOS.map((s) => resumen(LUGARES.find((l) => l.slug === s)!)),
    imperdibles: LUGARES.filter((l) => l.categoria === "turismo").map(resumen),
  };
}

/** Categorías de comida y compras usan el tono mango en las fotos vacías; el resto, celeste. */
const TONO_MANGO = new Set(["restaurantes", "cafes", "vida-nocturna", "compras"]);
export function tonoDeCategoria(categoria: string): "mango" | "celeste" {
  return TONO_MANGO.has(categoria) ? "mango" : "celeste";
}
