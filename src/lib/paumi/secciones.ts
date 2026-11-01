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

/**
 * Atajos que la página hace al instante, sin preguntarle a la IA (2026-11-01: más rápido por voz, y la IA a veces decía
 * "listo" sin mover nada). Solo frases cortas y claras; todo lo demás se le pregunta a Paumi.
 */
export function atajo(frase: string): { movimiento: Movimiento; respuesta: string } | null {
  const t = sinTildes(frase);
  if (t.split(" ").length > 7) return null;
  if (/\b(siguiente|proxima|otra) foto\b|\bfoto siguiente\b|\bpasa (la )?foto\b/.test(t)) return { movimiento: { accion: "foto_siguiente" }, respuesta: "¡Ahí va la siguiente foto!" };
  if (/\bfoto anterior\b|\b(regresa|vuelve) (a )?la foto\b|\bla foto de antes\b/.test(t)) return { movimiento: { accion: "foto_anterior" }, respuesta: "Volvemos a la foto anterior." };
  if (/^(sube|subir|ve arriba|ir arriba|arriba|vuelve arriba|al inicio de la pagina)$/.test(t)) return { movimiento: { accion: "arriba" }, respuesta: "Listo, arriba." };
  if (/\b(todas las categorias|ver categorias|muestrame las categorias)\b/.test(t)) return { movimiento: { accion: "todas_las_categorias" }, respuesta: "Aquí están todas las categorías." };
  return null;
}
