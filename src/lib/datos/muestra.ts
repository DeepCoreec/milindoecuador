import { datosDe, TEXTO_CATEGORIA } from "./textos";
import type { Categoria, Ciudad, LugarDetalle, LugarResumen } from "./tipos";

/*
 * DATOS DE MUESTRA, solo mientras no haya Supabase (paso 1.3).
 * - Los negocios son INVENTADOS: llevan `ejemplo: true` (insignia "Ejemplo"), no tienen WhatsApp
 *   y su historia empieza con "[Ejemplo]". Nunca se publican como reales.
 * - Los lugares turísticos son reales; sus textos se revisan otra vez al cargarlos en el paso 2.8.
 * Este archivo desaparece cuando las funciones de lugares.ts lean la base.
 */

export const CIUDADES: Ciudad[] = [{ slug: "guayaquil", nombre: "Guayaquil" }];

const NOMBRES: [slug: string, nombre: string, principal: boolean][] = [
  ["restaurantes", "Restaurantes", true],
  ["hoteles", "Hoteles", true],
  ["turismo", "Lugares turísticos", true],
  ["ejercicio", "Dónde hacer ejercicio", true],
  ["paseos", "Dónde pasear", true],
  ["cafes", "Cafés y heladerías", false],
  ["vida-nocturna", "Vida nocturna", false],
  ["museos", "Museos y cultura", false],
  ["compras", "Compras y mercados", false],
  ["ninos", "Para niños", false],
  ["naturaleza", "Naturaleza y aventura", false],
];

/** Igual que las categorías que siembra la migración, con sus textos. */
export const CATEGORIAS: Categoria[] = NOMBRES.map(([slug, nombre, principal]) => ({ slug, nombre, principal, ...TEXTO_CATEGORIA[slug] }));

const HISTORIA_EJEMPLO =
  "[Ejemplo] Este negocio es inventado: sirve para mostrar cómo se verá una ficha. Aquí el dueño cuenta su historia, qué lo hace especial y qué pedir la primera vez.";

type Opciones = Partial<Pick<LugarDetalle, "destacado" | "verificado" | "descripcion" | "horario" | "resenas">>;

const resto = (slug: string, nombre: string, sector: string, promedio: number | null, cantidad: number, precio: 1 | 2 | 3, o: Opciones = {}): LugarDetalle => ({
  slug,
  categoria: "restaurantes",
  nombre,
  sector,
  datos: datosDe("restaurantes", sector),
  promedio,
  cantidad,
  precio,
  destacado: o.destacado ?? false,
  verificado: o.verificado ?? false,
  ejemplo: true,
  descripcion: o.descripcion ?? HISTORIA_EJEMPLO,
  horario: o.horario ?? "[Ejemplo] Martes a domingo, de 12:00 a 22:00",
  direccion: `[Dirección de ejemplo], ${sector}`,
  whatsapp: null,
  fotos: [],
  resenas: o.resenas ?? [],
});

const turismo = (slug: string, nombre: string, sector: string, extra: string, d: Pick<LugarDetalle, "descripcion" | "horario" | "direccion">): LugarDetalle => ({
  slug, categoria: "turismo", nombre, sector, datos: datosDe("turismo", sector), promedio: null, cantidad: 0, precio: null, destacado: false, verificado: false, extra, ejemplo: false, whatsapp: null, fotos: [], resenas: [], ...d,
});

export const LUGARES: LugarDetalle[] = [
  resto("la-sazon-del-estero", "La Sazón del Estero", "Centro", 4.8, 32, 1, { destacado: true }),
  resto("el-rincon-de-dona-rosa", "El Rincón de Doña Rosa", "Urdesa", 4.6, 18, 1, { verificado: true }),
  resto("encebollados-el-puerto", "Encebollados El Puerto", "Alborada", 4.5, 41, 1),
  resto("picanteria-la-ria", "Picantería La Ría", "Sur", null, 0, 1),
  resto("cangrejal-dona-tere", "Cangrejal Doña Tere", "Urdesa", 4.8, 32, 2, {
    destacado: true,
    verificado: true,
    descripcion:
      "[Ejemplo] Doña Tere empezó vendiendo cangrejos en una mesa frente a su casa. Hoy sus hijos atienden el local, pero la salsa sigue siendo la receta de ella, y los domingos todavía se sienta en la caja.",
    resenas: [
      { id: "r1", autor: "Andrea M.", fecha: "2026-09-12T19:00:00Z", estrellas: 5, texto: "[Ejemplo] El cangrejo llegó rápido y bien servido. Los fines de semana conviene ir antes de la una.", respuesta: "Gracias, Andrea. Te esperamos de nuevo." },
      { id: "r2", autor: "Luis P.", fecha: "2026-09-03T23:30:00Z", estrellas: 4, texto: "[Ejemplo] Buena sazón y buen precio. Hay que tener paciencia para conseguir mesa." },
    ],
  }),
  resto("sabor-a-manglar", "Sabor a Manglar", "Samborondón", 4.4, 12, 2),
  resto("cafe-mirador-444", "Café Mirador 444", "Las Peñas", 4.7, 9, 1),
  resto("parrilla-del-salado", "Parrilla del Salado", "Centro", 4.2, 27, 3),
  resto("bolones-de-la-garzota", "Bolones de la Garzota", "La Garzota", null, 0, 1),
  turismo("malecon-2000", "Malecón 2000", "Centro", "Entrada libre", {
    descripcion:
      "Unos dos kilómetros y medio de paseo junto al río Guayas, con jardines, miradores y juegos. En el camino están la Torre Morisca y el Hemiciclo de la Rotonda, que recuerda el encuentro de Bolívar y San Martín en 1822. Al norte termina junto al barrio Las Peñas.",
    horario: "Todos los días",
    direccion: "Av. Malecón Simón Bolívar, centro",
  }),
  turismo("cerro-santa-ana", "Cerro Santa Ana", "Las Peñas", "444 escalones", {
    descripcion:
      "Una escalinata de 444 escalones numerados sube entre casas de colores, tiendas y cafés hasta el faro y la capilla de la cima, desde donde se ve el río y media ciudad. Al pie está Las Peñas, el barrio más antiguo de Guayaquil.",
    horario: "Todos los días",
    direccion: "Al norte del Malecón 2000, junto al barrio Las Peñas",
  }),
  turismo("parque-seminario", "Parque Seminario", "Centro", "Entrada libre", {
    descripcion:
      "También se llama Parque Bolívar, por la estatua ecuestre del Libertador que tiene en el centro. Es famoso por las iguanas que bajan de los árboles y caminan entre la gente, frente a la Catedral.",
    horario: "Todos los días",
    direccion: "Calles Chile y 10 de Agosto, frente a la Catedral",
  }),
  turismo("isla-santay", "Isla Santay", "Durán", "Naturaleza", {
    descripcion:
      "Una isla protegida en medio del río Guayas, con manglares, aves y senderos de madera. Se llega caminando o en bicicleta por el puente que sale del sur del malecón, y adentro vive una pequeña comunidad.",
    horario: "Todos los días",
    direccion: "Puente peatonal en el Malecón Simón Bolívar y calle El Oro",
  }),
];

export const ENCEBOLLADOS = ["la-sazon-del-estero", "el-rincon-de-dona-rosa", "encebollados-el-puerto", "picanteria-la-ria"];

/** Quita los campos de la ficha para listar: así las listas no cargan historias ni reseñas. */
export function resumen(l: LugarDetalle): LugarResumen {
  const { slug, categoria, nombre, sector, datos, promedio, cantidad, precio, destacado, verificado, extra, ejemplo } = l;
  return { slug, categoria, nombre, sector, datos, promedio, cantidad, precio, destacado, verificado, extra, ejemplo };
}
