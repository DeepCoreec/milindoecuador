/*
 * Guía útil (versión 5, fase 23): lugares de referencia traídos de OpenStreetMap con la API Overpass.
 * Datos © colaboradores de OpenStreetMap, licencia ODbL (se cita en la página y en los términos).
 * Aquí solo se arma la consulta y se traduce la respuesta; quién puede importar lo decide la acción del admin.
 */

export type Grupo = "visitar" | "servicios" | "salud" | "transporte";

/** Tipos de lugar: cómo se reconocen en OSM y cómo se llaman en la guía. El orden importa (gana el primero). */
export const TIPOS_SITIO = [
  { tipo: "museo", grupo: "visitar", nombre: "Museo", plural: "Museos", tags: [["tourism", "museum"]] },
  { tipo: "mirador", grupo: "visitar", nombre: "Mirador", plural: "Miradores", tags: [["tourism", "viewpoint"]] },
  { tipo: "zoologico", grupo: "visitar", nombre: "Zoológico", plural: "Zoológicos", tags: [["tourism", "zoo"]] },
  { tipo: "monumento", grupo: "visitar", nombre: "Monumento", plural: "Monumentos", tags: [["historic", "monument"], ["historic", "memorial"]] },
  { tipo: "atraccion", grupo: "visitar", nombre: "Atracción", plural: "Atracciones", tags: [["tourism", "attraction"]] },
  { tipo: "reserva", grupo: "visitar", nombre: "Área natural", plural: "Áreas naturales", tags: [["leisure", "nature_reserve"]] },
  { tipo: "parque", grupo: "visitar", nombre: "Parque", plural: "Parques", tags: [["leisure", "park"]] },
  { tipo: "iglesia", grupo: "visitar", nombre: "Iglesia", plural: "Iglesias", tags: [["amenity", "place_of_worship"]] },
  { tipo: "taller", grupo: "servicios", nombre: "Taller de autos", plural: "Talleres de autos", tags: [["shop", "car_repair"]] },
  { tipo: "celulares", grupo: "servicios", nombre: "Celulares", plural: "Celulares", tags: [["shop", "mobile_phone"]] },
  { tipo: "electronica", grupo: "servicios", nombre: "Electrónica", plural: "Electrónica", tags: [["craft", "electronics_repair"], ["shop", "electronics"]] },
  { tipo: "cerrajeria", grupo: "servicios", nombre: "Cerrajería", plural: "Cerrajerías", tags: [["shop", "locksmith"], ["craft", "locksmith"]] },
  { tipo: "hospital", grupo: "salud", nombre: "Hospital", plural: "Hospitales", tags: [["amenity", "hospital"]] },
  { tipo: "clinica", grupo: "salud", nombre: "Clínica", plural: "Clínicas", tags: [["amenity", "clinic"]] },
  { tipo: "farmacia", grupo: "salud", nombre: "Farmacia", plural: "Farmacias", tags: [["amenity", "pharmacy"]] },
  { tipo: "aerovia", grupo: "transporte", nombre: "Estación de Aerovía", plural: "Aerovía", tags: [["aerialway", "station"]] },
  { tipo: "terminal", grupo: "transporte", nombre: "Terminal de buses", plural: "Terminales", tags: [["amenity", "bus_station"]] },
  { tipo: "metrovia", grupo: "transporte", nombre: "Estación de Metrovía", plural: "Metrovía", tags: [["public_transport", "station"]] },
] as const satisfies readonly { tipo: string; grupo: Grupo; nombre: string; plural: string; tags: readonly (readonly [string, string])[] }[];

export type TipoSitio = (typeof TIPOS_SITIO)[number]["tipo"];
export const NOMBRE_TIPO = Object.fromEntries(TIPOS_SITIO.map((t) => [t.tipo, t.nombre])) as Record<TipoSitio, string>;

/** Zona urbana de Guayaquil (sur, oeste, norte, este), con Samborondón y la Isla Santay. */
/** API Overpass de OpenStreetMap (en desarrollo se puede cambiar con OVERPASS_URL; en producción, nunca). */
const OVERPASS = "https://overpass-api.de/api/interpreter";
export const urlOverpass = () => (process.env.NODE_ENV !== "production" && process.env.OVERPASS_URL) || OVERPASS;

export const CAJA_GUAYAQUIL = [-2.3, -80.05, -2.05, -79.84] as const;

/** Consulta para Overpass: solo lo que tiene nombre, con el centro de las áreas. */
export function consultaOverpass(caja: readonly [number, number, number, number] = CAJA_GUAYAQUIL): string {
  const c = caja.join(",");
  const partes = TIPOS_SITIO.flatMap((t) => t.tags.map(([k, v]) => `nwr["${k}"="${v}"]["name"](${c});`));
  return `[out:json][timeout:30];(${partes.join("")});out center tags 4000;`;
}

export type SitioOSM = {
  osm_type: "node" | "way" | "relation";
  osm_id: number;
  grupo: Grupo;
  tipo: TipoSitio;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  /** Enlace a Wikidata ("Q123") y a Wikipedia ("es:Título") si OpenStreetMap lo trae (versión 7, fase 29.2). */
  wikidata: string | null;
  wikipedia: string | null;
};

type Elemento = { type?: unknown; id?: unknown; lat?: unknown; lon?: unknown; center?: { lat?: unknown; lon?: unknown }; tags?: Record<string, unknown> };

const limpio = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.replace(/[\p{Cc}\p{Cf}]/gu, " ").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
};
const numero = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** "Q123" válido de Wikidata, o null (lo que no tenga esa forma no se guarda). */
export const codigoWikidata = (v: unknown): string | null => (typeof v === "string" && /^Q[1-9]\d{0,11}$/.test(v.trim()) ? v.trim() : null);
/** "es:Título" de Wikipedia (idioma de 2 o 3 letras), o null. */
export const tituloWikipedia = (v: unknown): string | null => {
  const t = limpio(v, 200);
  return t && /^[a-z]{2,3}:.+/.test(t) ? t : null;
};

/** Traduce la respuesta de Overpass a filas de `city_spots`. Ignora lo incompleto, raro o fuera de la caja. */
export function aSitios(respuesta: unknown, caja: readonly [number, number, number, number] = CAJA_GUAYAQUIL): SitioOSM[] {
  const elementos = (respuesta as { elements?: unknown })?.elements;
  if (!Array.isArray(elementos)) return [];
  const vistos = new Set<string>();
  const sitios: SitioOSM[] = [];
  for (const e of elementos as Elemento[]) {
    if (e.type !== "node" && e.type !== "way" && e.type !== "relation") continue;
    const id = numero(e.id);
    const lat = numero(e.lat) ?? numero(e.center?.lat);
    const lon = numero(e.lon) ?? numero(e.center?.lon);
    const tags = e.tags && typeof e.tags === "object" ? e.tags : {};
    const name = limpio(tags.name, 120);
    if (!id || id <= 0 || lat == null || lon == null || !name || name.length < 2) continue;
    if (lat < caja[0] || lat > caja[2] || lon < caja[1] || lon > caja[3]) continue;
    const tipo = TIPOS_SITIO.find((t) => t.tags.some(([k, v]) => tags[k] === v));
    if (!tipo) continue;
    // Estaciones de transporte: solo las de Metrovía (las demás estaciones no son útiles aquí)
    if (tipo.tipo === "metrovia" && !/metrov[ií]a/i.test(`${tags.network ?? ""} ${tags.operator ?? ""} ${name}`)) continue;
    // Iglesias: solo las que alguien marcó como turísticas o históricas (si no, serían cientos de capillas)
    if (tipo.tipo === "iglesia" && !(tags.tourism || tags.historic || tags.heritage || tags.wikipedia || tags.wikidata)) continue;
    const clave = `${e.type}/${id}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    const calle = limpio(tags["addr:street"], 150);
    const numeroCasa = limpio(tags["addr:housenumber"], 20);
    const web = limpio(tags.website ?? tags["contact:website"], 300);
    sitios.push({
      osm_type: e.type,
      osm_id: id,
      grupo: tipo.grupo,
      tipo: tipo.tipo,
      name,
      latitude: lat,
      longitude: lon,
      address: calle ? (numeroCasa ? `${calle} ${numeroCasa}` : calle) : null,
      phone: limpio(tags.phone ?? tags["contact:phone"], 40),
      website: web && /^https?:\/\/[^\s]+\.[^\s]+$/i.test(web) ? web : null,
      opening_hours: limpio(tags.opening_hours, 300),
      wikidata: codigoWikidata(tags.wikidata),
      wikipedia: tituloWikipedia(tags.wikipedia),
    });
  }
  return sitios;
}

/** Enlace a la ficha del lugar en OpenStreetMap (para revisarlo y para citar la fuente). */
export function enlaceOSM(tipo: string, id: number | string): string {
  // Versión 7 (30.1): los lugares traídos de Wikidata guardan osm_type = "wikidata" y el número de su Q
  if (tipo === "wikidata") return `https://www.wikidata.org/wiki/Q${encodeURIComponent(String(id))}`;
  return `https://www.openstreetmap.org/${encodeURIComponent(tipo)}/${encodeURIComponent(String(id))}`;
}

/**
 * Tipos de la Guía útil que no se muestran al público (2026-10-31, pedido del usuario: "no pongas estatuas, la gente no va
 * a un lugar solo por una estatua"). Siguen en la base y en el panel del admin.
 */
export const TIPOS_OCULTOS: readonly TipoSitio[] = ["monumento"];

/** Tipos de la Guía útil que acompañan a cada categoría de negocios (versión 5, fase 24): así ninguna queda vacía. */
export const TIPOS_POR_CATEGORIA: Record<string, readonly TipoSitio[]> = {
  reparaciones: ["celulares", "electronica", "taller", "cerrajeria"],
  // 2026-10-31, pedido del usuario: en Turismo, lugares espaciosos y con actividades (sin estatuas ni iglesias)
  turismo: ["atraccion", "parque", "reserva", "zoologico", "mirador", "museo"],
  paseos: ["parque", "mirador"],
  museos: ["museo"],
  naturaleza: ["reserva", "zoologico", "parque"],
  ejercicio: ["parque"],
  ninos: ["parque", "zoologico"],
};

const DIAS_OSM: Record<string, string> = { Mo: "lun", Tu: "mar", We: "mié", Th: "jue", Fr: "vie", Sa: "sáb", Su: "dom", PH: "feriados" };

/** Horario de OpenStreetMap ("Mo-Fr 08:00-18:00; Sa 09:00-13:00") en español sencillo; si trae algo raro, tal cual. */
export function horarioLegible(h: string): string {
  if (h.trim() === "24/7") return "Abierto las 24 horas";
  if (!/^[\s\d:;,+-]*(?:(?:Mo|Tu|We|Th|Fr|Sa|Su|PH|off|closed)[\s\d:;,+-]*)*$/.test(h)) return h;
  return h
    .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (d) => DIAS_OSM[d]!)
    .replace(/\s*\b(?:off|closed)\b/gi, ": cerrado")
    .replace(/-/g, " a ")
    .replace(/\s*;\s*/g, "; ")
    .replace(/,(?=\S)/g, ", ")
    .replace(/(\d{2}:\d{2}) a (\d{2}:\d{2})/g, "de $1 a $2");
}

const sinTildes = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Lugares de la Guía útil que responden a una búsqueda: por nombre o por tipo ("cerrajería", "farmacias"). */
export function buscarEnSitios<T extends { nombre: string; tipo: TipoSitio }>(sitios: T[], q: string, maximo = 12): T[] {
  const palabras = sinTildes(q).split(/\s+/).filter((p) => p.length >= 3);
  if (!palabras.length) return [];
  // Para reconocer un tipo, la palabra (sin la "s" o "es" del plural) debe tener 4 letras o más y empezar una palabra
  const raiz = (p: string) => {
    const r = p.replace(/(es|s)$/, "");
    return r.length >= 4 ? r : p;
  };
  const tipos = new Set(
    TIPOS_SITIO.filter((t) => {
      const nombres = sinTildes(`${t.nombre} ${t.plural} ${t.tipo}`).split(/[\s-]+/);
      return palabras.some((p) => p.length >= 4 && nombres.some((n) => n.startsWith(raiz(p))));
    }).map((t) => t.tipo as TipoSitio),
  );
  return sitios.filter((s) => tipos.has(s.tipo) || palabras.every((p) => sinTildes(s.nombre).includes(p))).slice(0, maximo);
}

/* ---------------------------------------------------------------------------------------------------------------
 * Horario, página web y teléfono desde OpenStreetMap para lugares que ya están en la guía (2026-10-31, pedido del
 * usuario: "al menos ponle el horario para tener noción, y la página web de cada lugar").
 * ------------------------------------------------------------------------------------------------------------- */

export type DatosContacto = { opening_hours: string | null; website: string | null; phone: string | null };

/** Consulta de Overpass para elementos por su Q de Wikidata y por su id de OpenStreetMap (solo etiquetas). */
export function consultaDatosOSM(qids: string[], ids: { tipo: "node" | "way" | "relation"; id: number }[]): string {
  const q = qids.filter((x) => /^Q[1-9]\d{0,11}$/.test(x));
  const partes: string[] = [];
  if (q.length) partes.push(`nwr["wikidata"~"^(${q.join("|")})$"](${CAJA_GUAYAQUIL.join(",")});`);
  for (const t of ["node", "way", "relation"] as const) {
    const lista = ids.filter((x) => x.tipo === t && Number.isSafeInteger(x.id) && x.id > 0).map((x) => x.id);
    if (lista.length) partes.push(`${t}(id:${lista.join(",")});`);
  }
  return `[out:json][timeout:25];(${partes.join("")});out tags 1000;`;
}

/** De la respuesta de Overpass: datos por "Q123" y por "node/123" (solo lo que tiene forma válida). */
export function aDatosContacto(respuesta: unknown): Map<string, DatosContacto> {
  const r = new Map<string, DatosContacto>();
  const elementos = (respuesta as { elements?: unknown })?.elements;
  if (!Array.isArray(elementos)) return r;
  for (const e of elementos as Elemento[]) {
    const tags = e.tags && typeof e.tags === "object" ? e.tags : {};
    const web = limpio(tags.website ?? tags["contact:website"] ?? tags.url, 300);
    const datos: DatosContacto = {
      opening_hours: limpio(tags.opening_hours, 300),
      website: web && /^https?:\/\/[^\s]+\.[^\s]+$/i.test(web) ? web : null,
      phone: limpio(tags.phone ?? tags["contact:phone"], 40),
    };
    if (!datos.opening_hours && !datos.website && !datos.phone) continue;
    const q = codigoWikidata(tags.wikidata);
    if (q && !r.has(q)) r.set(q, datos);
    const id = numero(e.id);
    if ((e.type === "node" || e.type === "way" || e.type === "relation") && id) r.set(`${e.type}/${id}`, datos);
  }
  return r;
}

/**
 * El primer número de un texto que puede traer varios ("04 2300500 2304999 2304998" → "04 2300500"): se juntan partes
 * hasta tener un número completo (9 dígitos con el código de área, o 10 un celular).
 */
export function primerTelefono(texto: string): string {
  const partes = texto.split(/[;,/]/)[0]!.trim().split(/\s+/);
  let r = "";
  for (const p of partes) {
    r = r ? `${r} ${p}` : p;
    if (r.replace(/\D/g, "").replace(/^593/, "0").length >= 9) break;
  }
  return r;
}

