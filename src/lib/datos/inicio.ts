import type { CategoriaBarra } from "@/components/categorias/BarraCategorias";

/*
 * Datos de la página de inicio.
 * MIENTRAS NO HAYA SUPABASE (paso 1.3) salen de esta lista de muestra.
 * Los negocios son inventados y llevan la insignia "Ejemplo"; los lugares turísticos son reales.
 * Cuando exista la base, estas funciones consultarán Supabase y devolverán la misma forma,
 * así la página no cambia.
 */

export type LugarResumen = {
  slug: string;
  categoria: string;
  nombre: string;
  datos: string;
  promedio: number | null;
  cantidad: number;
  precio: 1 | 2 | 3 | null;
  plan: "gratis" | "destacado" | "verificado";
  /** Dato corto para lugares sin precio, por ejemplo "Entrada libre". */
  extra?: string;
  ejemplo: boolean;
};

const CATEGORIAS = [
  { slug: "restaurantes", nombre: "Restaurantes", principal: true },
  { slug: "hoteles", nombre: "Hoteles", principal: true },
  { slug: "turismo", nombre: "Lugares turísticos", nombreCorto: "Turismo", principal: true },
  { slug: "ejercicio", nombre: "Dónde hacer ejercicio", nombreCorto: "Ejercicio", principal: true },
  { slug: "paseos", nombre: "Dónde pasear", nombreCorto: "Paseos", principal: true },
  { slug: "cafes", nombre: "Cafés y heladerías", principal: false },
  { slug: "vida-nocturna", nombre: "Vida nocturna", principal: false },
  { slug: "museos", nombre: "Museos y cultura", principal: false },
  { slug: "compras", nombre: "Compras y mercados", principal: false },
  { slug: "ninos", nombre: "Para niños", principal: false },
  { slug: "naturaleza", nombre: "Naturaleza y aventura", principal: false },
];

const ENCEBOLLADOS: LugarResumen[] = [
  { slug: "la-sazon-del-estero", categoria: "restaurantes", nombre: "La Sazón del Estero", datos: "Restaurante en el centro", promedio: 4.8, cantidad: 32, precio: 1, plan: "destacado", ejemplo: true },
  { slug: "el-rincon-de-dona-rosa", categoria: "restaurantes", nombre: "El Rincón de Doña Rosa", datos: "Restaurante en Urdesa", promedio: 4.6, cantidad: 18, precio: 1, plan: "verificado", ejemplo: true },
  { slug: "encebollados-el-puerto", categoria: "restaurantes", nombre: "Encebollados El Puerto", datos: "Restaurante en la Alborada", promedio: 4.5, cantidad: 41, precio: 1, plan: "gratis", ejemplo: true },
  { slug: "picanteria-la-ria", categoria: "restaurantes", nombre: "Picantería La Ría", datos: "Restaurante en el sur", promedio: null, cantidad: 0, precio: 1, plan: "gratis", ejemplo: true },
];

const IMPERDIBLES: LugarResumen[] = [
  { slug: "malecon-2000", categoria: "turismo", nombre: "Malecón 2000", datos: "Paseo a orillas del río Guayas", promedio: null, cantidad: 0, precio: null, plan: "gratis", extra: "Entrada libre", ejemplo: false },
  { slug: "cerro-santa-ana", categoria: "turismo", nombre: "Cerro Santa Ana", datos: "Las Peñas y la escalinata hasta el faro", promedio: null, cantidad: 0, precio: null, plan: "gratis", extra: "444 escalones", ejemplo: false },
  { slug: "parque-seminario", categoria: "turismo", nombre: "Parque Seminario", datos: "El parque de las iguanas, en el centro", promedio: null, cantidad: 0, precio: null, plan: "gratis", extra: "Entrada libre", ejemplo: false },
  { slug: "isla-santay", categoria: "turismo", nombre: "Isla Santay", datos: "Manglares, a pie o en bici por el puente", promedio: null, cantidad: 0, precio: null, plan: "gratis", extra: "Naturaleza", ejemplo: false },
];

export function rutaLugar(l: Pick<LugarResumen, "categoria" | "slug">) {
  return `/guayaquil/${l.categoria}/${l.slug}`;
}

export async function getCategoriasBarra(): Promise<CategoriaBarra[]> {
  return CATEGORIAS.map((c) => ({ ...c, href: `/guayaquil/${c.slug}` }));
}

export async function getSeccionesInicio() {
  return { encebollados: ENCEBOLLADOS, imperdibles: IMPERDIBLES };
}
