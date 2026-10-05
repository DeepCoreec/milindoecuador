import { cache } from "react";
import type { CategoriaBarra } from "@/components/categorias/BarraCategorias";
import { configSupabase } from "@/lib/supabase/config";
import { crearClientePublico } from "@/lib/supabase/publico";
import type { Filtros } from "@/lib/validacion/filtros";
import { leerCategorias, leerCiudades, leerLugar, leerLugaresDeCiudad } from "./base";
import { buscarEn } from "./buscar";
import { filtrarLugares, sectoresDe } from "./filtrar";
import * as muestra from "./muestra";
import type { Categoria, Ciudad, LugarDetalle, LugarResumen } from "./tipos";

/*
 * Funciones de lectura que usan las páginas.
 * - Con las claves de Supabase en el entorno, leen la base (solo lo publicado, por las reglas RLS).
 * - Sin claves (desarrollo antes del paso 1.3), leen los datos de muestra de muestra.ts.
 * Las dos fuentes devuelven la misma forma, así las páginas no cambian.
 * `cache` evita repetir la misma consulta dentro de una visita (metadatos + página).
 */

const db = () => crearClientePublico();

export function rutaLugar(ciudad: string, l: { categoria: string; slug: string }) {
  return `/${ciudad}/${l.categoria}/${l.slug}`;
}

export const getCiudades = cache(async (): Promise<Ciudad[]> => {
  const c = db();
  return c ? leerCiudades(c) : muestra.CIUDADES;
});

export async function getCiudad(slug: string): Promise<Ciudad | null> {
  return (await getCiudades()).find((c) => c.slug === slug) ?? null;
}

export const getCategorias = cache(async (): Promise<Categoria[]> => {
  const c = db();
  return c ? leerCategorias(c) : muestra.CATEGORIAS;
});

export async function getCategoria(slug: string): Promise<Categoria | null> {
  return (await getCategorias()).find((c) => c.slug === slug) ?? null;
}

export async function getCategoriasBarra(ciudad: string): Promise<CategoriaBarra[]> {
  return (await getCategorias()).map(({ slug, nombre, nombreCorto, principal }) => ({ slug, nombre, nombreCorto, principal, href: `/${ciudad}/${slug}` }));
}

/** Todos los lugares publicados de una ciudad. */
export const getLugaresDeCiudad = cache(async (ciudad: string): Promise<LugarResumen[]> => {
  const c = db();
  if (c) return leerLugaresDeCiudad(c, ciudad);
  return ciudad === "guayaquil" ? muestra.LUGARES.map(muestra.resumen) : [];
});

/** Lugares de una categoría con los filtros aplicados, y los sectores disponibles para el filtro. */
export async function getLugaresDeCategoria(ciudad: string, categoria: string, filtros: Filtros) {
  const todos = (await getLugaresDeCiudad(ciudad)).filter((l) => l.categoria === categoria);
  return { lugares: filtrarLugares(todos, filtros), sectores: sectoresDe(todos), total: todos.length };
}

/** Un lugar para su ficha. Debe ser de esa ciudad y de esa categoría; si no, no existe. */
export const getLugar = cache(async (ciudad: string, categoria: string, slug: string): Promise<LugarDetalle | null> => {
  const c = db();
  if (c) return leerLugar(c, configSupabase()!.url, ciudad, categoria, slug);
  if (ciudad !== "guayaquil") return null;
  return muestra.LUGARES.find((l) => l.categoria === categoria && l.slug === slug) ?? null;
});

/** Búsqueda de lugares de una ciudad por texto libre (ya validado). */
export async function buscarLugares(ciudad: string, q: string) {
  const [lugares, categorias] = await Promise.all([getLugaresDeCiudad(ciudad), getCategorias()]);
  const nombres = new Map(categorias.map((c) => [c.slug, c.nombre]));
  return buscarEn(
    lugares.map((l) => ({ ...l, textoCategoria: nombres.get(l.categoria) ?? "" })),
    q,
  );
}

/**
 * Secciones del inicio. Con la base: los restaurantes mejor ubicados (destacados primero) y los
 * lugares turísticos. Con la muestra: la selección fija de la maqueta.
 */
export async function getSeccionesInicio(ciudad = "guayaquil") {
  const lugares = await getLugaresDeCiudad(ciudad);
  const orden = { sector: null, precios: [], orden: "destacados" as const };
  const encebollados = configSupabase()
    ? filtrarLugares(lugares.filter((l) => l.categoria === "restaurantes"), orden).slice(0, 4)
    : muestra.ENCEBOLLADOS.map((s) => lugares.find((l) => l.slug === s)!);
  const imperdibles = filtrarLugares(lugares.filter((l) => l.categoria === "turismo"), orden).slice(0, 4);
  const tituloComer = configSupabase() ? "Dónde comer" : "Dónde comer encebollado";
  return { encebollados, imperdibles, tituloComer };
}

/** Categorías de comida y compras usan el tono mango en las fotos vacías; el resto, celeste. */
const TONO_MANGO = new Set(["restaurantes", "cafes", "vida-nocturna", "compras"]);
export function tonoDeCategoria(categoria: string): "mango" | "celeste" {
  return TONO_MANGO.has(categoria) ? "mango" : "celeste";
}
