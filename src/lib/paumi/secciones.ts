/*
 * Lo que Paumi puede mover DENTRO de la página (2026-11-01, pedido del usuario: "que controle más la funcionalidad de la
 * página, que vaya moviendo según lo que busque el usuario"). La IA solo elige una palabra de estas listas; la página
 * busca el lugar por su id (si en esa página no existe, no pasa nada). Sin texto libre: nadie puede mandar a la página a
 * hacer otra cosa.
 */

export const SECCIONES = {
  categorias: { ids: ["t-cat"], que: "los cuadros de categorías (portada)" },
  destacados: { ids: ["t-recomendados"], que: "los lugares destacados (portada)" },
  eventos: { ids: ["t-eventos", "t-hoy", "t-finde", "t-proximos"], que: "los eventos" },
  eventos_hoy: { ids: ["t-hoy", "t-eventos"], que: "los eventos de hoy" },
  eventos_finde: { ids: ["t-finde", "t-eventos"], que: "los eventos del fin de semana" },
  eventos_proximos: { ids: ["t-proximos", "t-eventos"], que: "los próximos eventos" },
  fotos: { ids: ["fotos"], que: "las fotos del lugar" },
  informacion: { ids: ["t-info"], que: "horario, dirección, precio y cómo llegar del lugar ('Información' o 'Antes de ir')" },
  historia: { ids: ["t-hist", "t-sobre"], que: "la historia o descripción del lugar" },
  resenas: { ids: ["t-resenas"], que: "las reseñas" },
  cerca: { ids: ["t-mas", "t-ev"], que: "lo que hay cerca de un lugar para visitar" },
  comer_cerca: { ids: ["t-neg"], que: "dónde comer cerca de un lugar para visitar" },
  guias: { ids: ["t-guias", "t-nocturnos"], que: "los guías turísticos (en Turismo) o los guías de noche (en misterio)" },
  recorridos: { ids: ["t-recorridos", "t-paradas"], que: "los recorridos de un guía o las paradas de un recorrido" },
  leyendas: { ids: ["t-leyendas"], que: "las leyendas (Guayaquil de misterio)" },
  recorridos_oficiales: { ids: ["t-oficiales"], que: "los recorridos oficiales (Guayaquil de misterio)" },
  para_visitar: { ids: ["visitar", "t-visitar"], que: "lugares para visitar (Guía útil)" },
  reparaciones: { ids: ["danado", "t-danado", "t-tecnicos"], que: "dónde arreglar algo (Guía útil)" },
  salud: { ids: ["t-salud"], que: "hospitales y farmacias (Guía útil)" },
  transporte: { ids: ["t-transporte"], que: "Metrovía, Aerovía y terminal (Guía útil)" },
  numeros_utiles: { ids: ["info", "t-info"], que: "números de emergencia e información útil (Guía útil)" },
  negocios: { ids: ["t-neg"], que: "la parte para registrar un negocio (portada)" },
} as const;

export type Seccion = keyof typeof SECCIONES;
export const LISTA_SECCIONES = Object.keys(SECCIONES) as [Seccion, ...Seccion[]];

export const ACCIONES = {
  arriba: "volver arriba de la página",
  foto_siguiente: "pasar a la siguiente foto del lugar",
  foto_anterior: "volver a la foto anterior",
  todas_las_categorias: "abrir el panel con todas las categorías",
} as const;
export type Accion = keyof typeof ACCIONES;
export const LISTA_ACCIONES = Object.keys(ACCIONES) as [Accion, ...Accion[]];

export type Movimiento = { seccion?: Seccion; accion?: Accion };

/** Solo palabras conocidas (lo que llega del servidor se vuelve a revisar en la página). */
export function leerMovimiento(v: unknown): Movimiento | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const seccion = typeof o.seccion === "string" && o.seccion in SECCIONES ? (o.seccion as Seccion) : undefined;
  const accion = typeof o.accion === "string" && o.accion in ACCIONES ? (o.accion as Accion) : undefined;
  return seccion || accion ? { seccion, accion } : null;
}

/** "/guayaquil/restaurantes?sector=Urdesa&precio=1&precio=2&orden=calificacion" (lee lo mismo que leerFiltros). */
export function rutaConFiltros(ciudad: string, categoria: string, f: { sector?: string; precioMax?: 1 | 2 | 3; orden?: "destacados" | "calificacion" | "resenas" }): string {
  const p = new URLSearchParams();
  if (f.sector) p.set("sector", f.sector);
  if (f.precioMax) for (let n = 1; n <= f.precioMax; n++) p.append("precio", String(n));
  if (f.orden && f.orden !== "destacados") p.set("orden", f.orden);
  const q = p.toString();
  return `/${ciudad}/${categoria}${q ? `?${q}` : ""}`;
}

/** Para la IA: en qué página está la persona, en palabras. Solo rutas de la guía (lo demás, "otra página"). */
export function describirPagina(ruta: string): string {
  if (ruta === "/") return "la portada";
  if (ruta === "/guayaquil") return "Explora (todas las categorías)";
  if (ruta.startsWith("/buscar")) return "los resultados de búsqueda";
  if (ruta === "/guayaquil/eventos") return "los eventos";
  if (ruta === "/guayaquil/guia-util") return "la Guía útil";
  if (ruta === "/guayaquil/misterio") return "Guayaquil de misterio (leyendas)";
  if (/^\/guayaquil\/visitar\/[^/]+$/.test(ruta)) return "la página de un lugar para visitar (con galería de fotos, 'Antes de ir' y qué hay cerca)";
  if (/^\/guayaquil\/eventos\/[^/]+$/.test(ruta)) return "la página de un evento";
  if (/^\/guayaquil\/guias\/[^/]+\/recorridos\/[^/]+$/.test(ruta)) return "la página de un recorrido de un guía";
  const cat = /^\/guayaquil\/([a-z0-9-]+)$/.exec(ruta);
  if (cat) return `la categoría «${cat[1]}» (con filtros de sector, precio y orden)`;
  if (/^\/guayaquil\/[a-z0-9-]+\/[a-z0-9-]+$/.test(ruta)) return "la ficha de un lugar (fotos, información, historia y reseñas)";
  return "otra página";
}

const sinTildes = (t: string) => t.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[¿?¡!.,;:]/g, " ").replace(/\s+/g, " ").trim();

/** Categorías por cómo las dice la gente (sin tildes). Si se agrega una categoría nueva, sumarla aquí. */
const CATEGORIAS_DICHAS: [string, string, RegExp][] = [
  ["restaurantes", "Restaurantes", /^(los |unos )?(restaurantes?|donde comer)$/],
  ["hoteles", "Hoteles", /^(los )?(hoteles?|hospedajes?|hostales?|donde dormir)$/],
  ["turismo", "Lugares turísticos", /^(el )?(turismo|lugares turisticos|que visitar)$/],
  ["ejercicio", "Dónde hacer ejercicio", /^(el )?(ejercicio|donde hacer ejercicio)$/],
  ["paseos", "Dónde pasear", /^(los )?(paseos|donde pasear)$/],
  ["cafes", "Cafés y heladerías", /^(los |las )?(cafes|cafeterias|heladerias|cafes y heladerias)$/],
  ["vida-nocturna", "Vida nocturna", /^(la )?(vida nocturna|bares|discotecas)$/],
  ["museos", "Museos y cultura", /^(los )?(museos|museos y cultura|cultura)$/],
  ["compras", "Compras y mercados", /^(las |los )?(compras|mercados|compras y mercados)$/],
  ["ninos", "Para niños", /^(los )?(planes para ninos|para ninos|ninos)$/],
  ["naturaleza", "Naturaleza y aventura", /^(la )?(naturaleza|naturaleza y aventura)$/],
  ["reparaciones", "Reparaciones y servicios", /^(las )?(reparaciones|servicio tecnico)$/],
  ["guias", "Guías turísticos", /^(los )?(guias|guias turisticos)$/],
];
const PAGINAS_DICHAS: [string, string, RegExp][] = [
  ["/guayaquil/eventos", "los eventos", /^(los )?eventos$/],
  ["/guayaquil/guia-util", "la Guía útil", /^(la )?guia util$/],
  ["/guayaquil/misterio", "Guayaquil de misterio", /^(las )?(leyendas|historias|historias de miedo|misterio|guayaquil de misterio)$/],
  ["/", "la portada", /^(el )?(inicio|portada|pagina principal)$/],
  ["/guayaquil", "todas las categorías", /^(explorar|explora guayaquil)$/],
];
const SECCIONES_DICHAS: [Seccion, string, RegExp][] = [
  ["resenas", "las reseñas", /^(las )?(resenas|comentarios|opiniones)$/],
  ["informacion", "la información", /^(el |la )?(horario|informacion|direccion|como llegar|antes de ir)$/],
  ["fotos", "las fotos", /^(las )?fotos$/],
  ["historia", "la historia", /^(la )?(historia|descripcion)$/],
  ["eventos_hoy", "los eventos de hoy", /^(los )?eventos de hoy$/],
  ["eventos_finde", "los eventos del fin de semana", /^(los )?eventos del (fin de semana|finde)$/],
  ["cerca", "lo que hay cerca", /^(lo que hay )?cerca$/],
  ["guias", "los guías", /^(los )?guias$/],
  ["recorridos", "los recorridos", /^(los )?recorridos$/],
  ["leyendas", "las leyendas", /^(las )?leyendas$/],
  ["salud", "salud", /^(la )?(salud|hospitales|farmacias)$/],
  ["transporte", "transporte", /^(el )?(transporte|metrovia|aerovia)$/],
];
// "llévame a…", "muéstrame…", "baja a…", "abre…" (o solo el nombre)
const VERBO = /^(?:(?:llevame|lleva|ve|vamos|ir|abre|abrir|muestrame|muestra|ensename|quiero ver|ver|pon|entra|baja|bajar|anda|dame)(?: (?:a|al|hasta|en))? )?(?:la seccion de |la pagina de |la parte de )?/;

/**
 * Atajos que la página hace al instante, sin preguntarle a la IA (2026-11-01: más rápido por voz, la IA a veces decía
 * "listo" sin mover nada, y así Haiku solo se usa para preguntas de verdad). Solo frases cortas que son SOLO una orden
 * ("llévame a restaurantes", "baja a las reseñas", "siguiente foto"); si dicen algo más ("restaurantes baratos en
 * Urdesa"), se le pregunta a Paumi. `hay` dice si una parte está en la página que se ve (si no, tampoco es atajo).
 */
export function atajo(
  frase: string,
  hay: (ids: readonly string[]) => boolean = () => false,
): { movimiento?: Movimiento; navegar?: string; respuesta: string } | null {
  const t = sinTildes(frase).replace(/\b(por favor|porfa|paumi|oye|ahora|ya)\b/g, " ").replace(/\s+/g, " ").trim();
  if (!t || t.split(" ").length > 7) return null;
  if (/\b(siguiente|proxima|otra) foto\b|\bfoto siguiente\b|\bpasa (la )?foto\b/.test(t)) return { movimiento: { accion: "foto_siguiente" }, respuesta: "¡Ahí va la siguiente foto!" };
  if (/\bfoto anterior\b|\b(regresa|vuelve) (a )?la foto\b|\bla foto de antes\b/.test(t)) return { movimiento: { accion: "foto_anterior" }, respuesta: "Volvemos a la foto anterior." };
  if (/^(sube|subir|ve arriba|ir arriba|arriba|vuelve arriba|al inicio de la pagina)$/.test(t)) return { movimiento: { accion: "arriba" }, respuesta: "Listo, arriba." };
  if (/\b(todas las categorias|ver categorias|muestrame las categorias)\b/.test(t)) return { movimiento: { accion: "todas_las_categorias" }, respuesta: "Aquí están todas las categorías." };
  const resto = t.replace(VERBO, "");
  // Primero una parte de la página que se está viendo ("baja a las reseñas", "los guías" en Turismo)…
  for (const [seccion, nombre, re] of SECCIONES_DICHAS)
    if (re.test(resto) && hay(SECCIONES[seccion].ids)) return { movimiento: { seccion }, respuesta: `Aquí están ${nombre}.` };
  // …después una categoría o una página de la guía
  for (const [slug, nombre, re] of CATEGORIAS_DICHAS) if (re.test(resto)) return { navegar: `/guayaquil/${slug}`, respuesta: `Te llevo a ${nombre}.` };
  for (const [ruta, nombre, re] of PAGINAS_DICHAS) if (re.test(resto)) return { navegar: ruta, respuesta: `Te llevo a ${nombre}.` };
  return null;
}
