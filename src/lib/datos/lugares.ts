import type { CategoriaBarra } from "@/components/categorias/BarraCategorias";
import type { Filtros } from "@/lib/validacion/filtros";
import { filtrarLugares, sectoresDe } from "./filtrar";
import type { Categoria, Ciudad, LugarResumen } from "./tipos";

/*
 * Funciones de lectura de lugares.
 * MIENTRAS NO HAYA SUPABASE (paso 1.3) leen esta lista de muestra.
 * Los negocios son inventados y llevan la insignia "Ejemplo"; los lugares turísticos son reales.
 * Cuando exista la base, estas funciones consultarán Supabase y devolverán la misma forma,
 * así las páginas no cambian.
 */

const CIUDADES: Ciudad[] = [{ slug: "guayaquil", nombre: "Guayaquil" }];

const CATEGORIAS: Categoria[] = [
  { slug: "restaurantes", nombre: "Restaurantes", principal: true, bajada: "Encebollado, cangrejo, ceviche y mucho más. Ordenados con los destacados primero." },
  { slug: "hoteles", nombre: "Hoteles", principal: true, bajada: "Hostales, hoteles y casas para quedarte, cerca de lo que quieres ver." },
  { slug: "turismo", nombre: "Lugares turísticos", nombreCorto: "Turismo", principal: true, bajada: "Lo que no te puedes perder en Guayaquil, del Malecón al Cerro Santa Ana." },
  { slug: "ejercicio", nombre: "Dónde hacer ejercicio", nombreCorto: "Ejercicio", principal: true, bajada: "Parques para correr, ciclovías, canchas y gimnasios." },
  { slug: "paseos", nombre: "Dónde pasear", nombreCorto: "Paseos", principal: true, bajada: "Malecones, parques y miradores para caminar sin apuro." },
  { slug: "cafes", nombre: "Cafés y heladerías", principal: false, bajada: "Un café, un bolón o un helado para la tarde." },
  { slug: "vida-nocturna", nombre: "Vida nocturna", principal: false, bajada: "Bares, música en vivo y dónde salir de noche." },
  { slug: "museos", nombre: "Museos y cultura", principal: false, bajada: "Museos, galerías y la historia de la ciudad." },
  { slug: "compras", nombre: "Compras y mercados", principal: false, bajada: "Mercados, artesanías y centros comerciales." },
  { slug: "ninos", nombre: "Para niños", principal: false, bajada: "Planes para ir con los más pequeños." },
  { slug: "naturaleza", nombre: "Naturaleza y aventura", principal: false, bajada: "Manglares, bosques secos y aire libre cerca de la ciudad." },
];

/** Cómo se dice "en …" para cada sector: "en el centro", "en la Alborada". */
const EN_SECTOR: Record<string, string> = { Centro: "el centro", Alborada: "la Alborada", Sur: "el sur" };

const resto = (slug: string, nombre: string, sector: string, promedio: number | null, cantidad: number, precio: 1 | 2 | 3, plan: LugarResumen["plan"] = "gratis"): LugarResumen => ({
  slug, categoria: "restaurantes", nombre, sector, datos: `Restaurante en ${EN_SECTOR[sector] ?? sector}`, promedio, cantidad, precio, plan, ejemplo: true,
});

const turismo = (slug: string, nombre: string, sector: string, datos: string, extra: string): LugarResumen => ({
  slug, categoria: "turismo", nombre, sector, datos, promedio: null, cantidad: 0, precio: null, plan: "gratis", extra, ejemplo: false,
});

const LUGARES: LugarResumen[] = [
  resto("la-sazon-del-estero", "La Sazón del Estero", "Centro", 4.8, 32, 1, "destacado"),
  resto("el-rincon-de-dona-rosa", "El Rincón de Doña Rosa", "Urdesa", 4.6, 18, 1, "verificado"),
  resto("encebollados-el-puerto", "Encebollados El Puerto", "Alborada", 4.5, 41, 1),
  resto("picanteria-la-ria", "Picantería La Ría", "Sur", null, 0, 1),
  resto("cangrejal-dona-tere", "Cangrejal Doña Tere", "Urdesa", 4.8, 32, 2, "destacado"),
  resto("sabor-a-manglar", "Sabor a Manglar", "Samborondón", 4.4, 12, 2),
  resto("cafe-mirador-444", "Café Mirador 444", "Las Peñas", 4.7, 9, 1),
  resto("parrilla-del-salado", "Parrilla del Salado", "Centro", 4.2, 27, 3),
  resto("bolones-de-la-garzota", "Bolones de la Garzota", "La Garzota", null, 0, 1),
  turismo("malecon-2000", "Malecón 2000", "Centro", "Paseo a orillas del río Guayas", "Entrada libre"),
  turismo("cerro-santa-ana", "Cerro Santa Ana", "Las Peñas", "Las Peñas y la escalinata hasta el faro", "444 escalones"),
  turismo("parque-seminario", "Parque Seminario", "Centro", "El parque de las iguanas, en el centro", "Entrada libre"),
  turismo("isla-santay", "Isla Santay", "Durán", "Manglares, a pie o en bici por el puente", "Naturaleza"),
];

const ENCEBOLLADOS = ["la-sazon-del-estero", "el-rincon-de-dona-rosa", "encebollados-el-puerto", "picanteria-la-ria"];

export function rutaLugar(ciudad: string, l: Pick<LugarResumen, "categoria" | "slug">) {
  return `/${ciudad}/${l.categoria}/${l.slug}`;
}

export async function getCiudad(slug: string): Promise<Ciudad | null> {
  return CIUDADES.find((c) => c.slug === slug) ?? null;
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
  const todos = ciudad === "guayaquil" ? LUGARES.filter((l) => l.categoria === categoria) : [];
  return { lugares: filtrarLugares(todos, filtros), sectores: sectoresDe(todos), total: todos.length };
}

export async function getSeccionesInicio() {
  return {
    encebollados: ENCEBOLLADOS.map((s) => LUGARES.find((l) => l.slug === s)!),
    imperdibles: LUGARES.filter((l) => l.categoria === "turismo"),
  };
}
