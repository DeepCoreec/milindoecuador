import "server-only";
import { distancia, nombresParecidos } from "@/lib/agente/reglas";

/*
 * Foto y descripción de la Guía útil desde Wikimedia (versión 7, fase 29.3; plan en docs/PLAN-V7.md).
 * - Foto: la imagen principal del lugar en Wikidata (P18), desde Wikimedia Commons, SOLO con licencia libre y con su
 *   autor. Se devuelve la dirección de la copia en tamaño web (960 px) para guardarla en NUESTRO bucket.
 * - Descripción: las primeras frases del resumen de Wikipedia en español, tal cual (sin IA: cero inventos; regla 3).
 * - El mismo lugar, seguro (regla 4): el enlace de OpenStreetMap (wikidata / wikipedia), o un artículo de Wikipedia
 *   a menos de 300 m con nombre parecido. Si las coordenadas de Wikidata quedan lejos del lugar, no se usa nada.
 * Todo con fetch (sin librerías) y solo a dominios fijos de Wikimedia. Lo que llega es dato de terceros: se limpia y
 * se valida; en la página se muestra como texto (React lo escapa).
 */

/** Wikimedia pide un User-Agent que diga quién consulta (https://meta.wikimedia.org/wiki/User-Agent_policy). */
const AGENTE = "MiLindoEcuador/1.0 (https://milindoecuador.vercel.app; guia de Guayaquil)";
/** Un lugar enlazado por OpenStreetMap puede ser grande (un parque): su punto en Wikidata puede quedar a ~1 km. */
const LEJOS_ENLAZADO_M = 1500;
/** Sin enlace, solo se acepta un artículo muy cerca y con nombre parecido. */
const CERCA_BUSQUEDA_M = 300;
export const MAX_DESCRIPCION = 300;

export class ErrorWikimedia extends Error {}

export type FotoWikimedia = { url: string; credito: string; licencia: string; fuente: string };
export type ResultadoWikimedia = {
  wikidata: string | null;
  foto: FotoWikimedia | null;
  descripcion: { texto: string; fuente: string } | null;
  /** Por qué no se encontró nada (para el registro), o null si se encontró algo. */
  nada: string | null;
};
export type LugarParaBuscar = { nombre: string; lat: number; lng: number; wikidata: string | null; wikipedia: string | null };

/** Licencias que dejan usar la foto con crédito: dominio público, CC0, CC BY y CC BY-SA (cualquier versión). */
const LICENCIA_LIBRE = /^(cc0( 1\.0)?|cc[ -]by(-sa)?[ -]\d(\.\d)?( [a-z]{2,3})?|public domain|dominio p[úu]blico|pd(-[a-z0-9.-]+)?)$/i;
export const licenciaLibre = (l: string) => LICENCIA_LIBRE.test(l.trim());

/** Texto plano desde el HTML que trae Commons en "Artist": sin etiquetas, sin entidades raras, sin invisibles. */
export function textoPlano(html: string, max: number): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&(amp|quot|#39|apos|lt|gt|nbsp);/g, (_, e: string) => ({ amp: "&", quot: '"', "#39": "'", apos: "'", lt: "<", gt: ">", nbsp: " " })[e] ?? " ")
    .replace(/&#?\w+;/g, " ")
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/**
 * Las primeras frases completas del resumen, hasta `max` caracteres. Si la primera frase ya es más larga, se corta en
 * una palabra y se agrega "…". No se reescribe nada (regla 3 del plan).
 */
export function primerasFrases(texto: string, max = MAX_DESCRIPCION): string {
  const t = textoPlano(texto, 5000);
  if (t.length <= max) return t;
  const frases = t.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [];
  let r = "";
  for (const f of frases) {
    if ((r + f).trim().length > max) break;
    r += f;
  }
  if (r.trim()) return r.trim();
  const corte = t.slice(0, max - 1);
  return `${corte.slice(0, Math.max(corte.lastIndexOf(" "), 1)).trim()}…`;
}

/** "Parque Seminario (Guayaquil)" → "Parque Seminario": lo de los paréntesis solo desambigua en Wikipedia. */
const sinAclaracion = (t: string) => t.replace(/\s*\([^)]*\)\s*$/, "").trim();

const QID = /^Q[1-9]\d{0,11}$/;
const IDIOMA = /^[a-z]{2,3}$/;

async function pedirJSON(url: string, pedir: typeof fetch): Promise<unknown> {
  const r = await pedir(url, {
    headers: { "user-agent": AGENTE, "api-user-agent": AGENTE, accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new ErrorWikimedia(`Wikimedia respondió ${r.status}`);
  return r.json();
}

type Entidad = { titulo: string | null; archivo: string | null; punto: { lat: number; lng: number } | null };

/** Lo que importa de una entidad de Wikidata: artículo en español, imagen principal (P18) y coordenadas (P625). */
async function leerEntidad(qid: string, pedir: typeof fetch): Promise<Entidad | null> {
  if (!QID.test(qid)) return null;
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims%7Csitelinks&sitefilter=eswiki&format=json`;
  const j = (await pedirJSON(url, pedir)) as { entities?: Record<string, { missing?: string; claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]>; sitelinks?: { eswiki?: { title?: unknown } } }> } | null;
  const e = j?.entities?.[qid];
  if (!e || "missing" in e) return null;
  const archivo = e.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  const coord = e.claims?.P625?.[0]?.mainsnak?.datavalue?.value as { latitude?: unknown; longitude?: unknown } | undefined;
  const titulo = e.sitelinks?.eswiki?.title;
  return {
    titulo: typeof titulo === "string" && titulo.length <= 250 ? titulo : null,
    archivo: typeof archivo === "string" && archivo.length <= 250 ? archivo : null,
    punto: typeof coord?.latitude === "number" && typeof coord.longitude === "number" ? { lat: coord.latitude, lng: coord.longitude } : null,
  };
}

type Resumen = { qid: string | null; extracto: string | null; pagina: string | null };

/** Resumen de un artículo de Wikipedia (`idioma`.wikipedia.org). Las desambiguaciones no sirven. */
async function leerResumen(idioma: string, titulo: string, pedir: typeof fetch): Promise<Resumen | null> {
  if (!IDIOMA.test(idioma)) return null;
  const url = `https://${idioma}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titulo.replace(/ /g, "_"))}`;
  const j = (await pedirJSON(url, pedir)) as { type?: unknown; extract?: unknown; wikibase_item?: unknown; content_urls?: { desktop?: { page?: unknown } } } | null;
  if (!j || j.type !== "standard") return null;
  const qid = typeof j.wikibase_item === "string" && QID.test(j.wikibase_item) ? j.wikibase_item : null;
  const pagina = typeof j.content_urls?.desktop?.page === "string" ? j.content_urls.desktop.page : null;
  return {
    qid,
    extracto: typeof j.extract === "string" && j.extract.trim().length >= 20 ? j.extract : null,
    pagina: pagina && pagina.startsWith(`https://${idioma}.wikipedia.org/`) && pagina.length <= 400 ? pagina : null,
  };
}

/** Artículos de Wikipedia en español a menos de 300 m; el primero con nombre parecido (regla 4). */
async function buscarCerca(l: LugarParaBuscar, pedir: typeof fetch): Promise<string | null> {
  const url = `https://es.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${l.lat.toFixed(6)}%7C${l.lng.toFixed(6)}&gsradius=${CERCA_BUSQUEDA_M}&gslimit=15&format=json`;
  const j = (await pedirJSON(url, pedir)) as { query?: { geosearch?: { title?: unknown; dist?: unknown }[] } } | null;
  for (const g of j?.query?.geosearch ?? []) {
    if (typeof g.title !== "string" || typeof g.dist !== "number" || g.dist > CERCA_BUSQUEDA_M) continue;
    if (nombresParecidos(l.nombre, sinAclaracion(g.title))) return g.title;
  }
  return null;
}

/** La foto en Commons: copia de 960 px, licencia libre, autor y enlace. Si algo no cuadra, null. */
async function leerFoto(archivo: string, pedir: typeof fetch): Promise<FotoWikimedia | null> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(`File:${archivo}`)}&prop=imageinfo&iiprop=url%7Cextmetadata%7Cmime&iiurlwidth=960&format=json`;
  const j = (await pedirJSON(url, pedir)) as {
    query?: { pages?: Record<string, { missing?: string; imageinfo?: { thumburl?: unknown; thumbmime?: unknown; mime?: unknown; descriptionurl?: unknown; extmetadata?: Record<string, { value?: unknown }> }[] }> };
  } | null;
  const pagina = Object.values(j?.query?.pages ?? {})[0];
  const ii = pagina && !("missing" in pagina) ? pagina.imageinfo?.[0] : undefined;
  if (!ii) return null;
  const mime = typeof ii.thumbmime === "string" ? ii.thumbmime : ii.mime;
  if (mime !== "image/jpeg" && mime !== "image/png" && mime !== "image/webp") return null;
  const foto = typeof ii.thumburl === "string" ? ii.thumburl : null;
  const fuente = typeof ii.descriptionurl === "string" ? ii.descriptionurl : null;
  if (!foto?.startsWith("https://upload.wikimedia.org/") || !fuente?.startsWith("https://commons.wikimedia.org/") || fuente.length > 400) return null;
  const meta = ii.extmetadata ?? {};
  const licencia = typeof meta.LicenseShortName?.value === "string" ? textoPlano(meta.LicenseShortName.value, 60) : "";
  if (!licenciaLibre(licencia)) return null;
  const autor = typeof meta.Artist?.value === "string" ? textoPlano(meta.Artist.value, 150) : "";
  return { url: foto, credito: autor || "Autor en Wikimedia Commons", licencia, fuente };
}

/**
 * Busca foto y descripción para un lugar publicado. Nunca lanza por "no encontré": devuelve `nada` con el motivo.
 * Lanza ErrorWikimedia si Wikimedia falla (para volver a intentar después). `pedir` se reemplaza en las pruebas.
 */
export async function buscarEnWikimedia(l: LugarParaBuscar, pedir: typeof fetch = fetch): Promise<ResultadoWikimedia> {
  const vacio = (nada: string): ResultadoWikimedia => ({ wikidata: null, foto: null, descripcion: null, nada });
  let qid = l.wikidata && QID.test(l.wikidata) ? l.wikidata : null;
  let tituloEs: string | null = null;
  let enlazado = !!qid;

  // 1. ¿Cuál es el lugar en Wikimedia?
  if (!qid && l.wikipedia) {
    const [idioma, ...resto] = l.wikipedia.split(":");
    const titulo = resto.join(":").trim();
    if (idioma && titulo && IDIOMA.test(idioma)) {
      const r = await leerResumen(idioma, titulo, pedir);
      qid = r?.qid ?? null;
      if (idioma === "es" && r) tituloEs = titulo;
      enlazado = !!qid;
    }
  }
  if (!qid) {
    const cerca = await buscarCerca(l, pedir);
    if (!cerca) return vacio("Sin artículo en Wikipedia cerca y con el mismo nombre");
    const r = await leerResumen("es", cerca, pedir);
    if (!r?.qid) return vacio("El artículo cercano no tiene ficha en Wikidata");
    qid = r.qid;
    tituloEs = cerca;
  }

  // 2. La ficha de Wikidata: ¿de verdad está aquí?
  const e = await leerEntidad(qid, pedir);
  if (!e) return vacio("La ficha de Wikidata no existe");
  if (e.punto && distancia({ lat: l.lat, lng: l.lng }, e.punto) > (enlazado ? LEJOS_ENLAZADO_M : CERCA_BUSQUEDA_M)) {
    return vacio("La ficha de Wikidata está lejos de este lugar: puede ser otro");
  }
  tituloEs = e.titulo ?? tituloEs;

  // 3. Foto y descripción (cada una por su lado: puede haber una sin la otra)
  const foto = e.archivo ? await leerFoto(e.archivo, pedir) : null;
  let descripcion: ResultadoWikimedia["descripcion"] = null;
  if (tituloEs) {
    const r = await leerResumen("es", tituloEs, pedir);
    if (r?.extracto && r.pagina) descripcion = { texto: primerasFrases(r.extracto), fuente: r.pagina };
  }
  return { wikidata: qid, foto, descripcion, nada: foto || descripcion ? null : "La ficha no tiene foto libre ni artículo en español" };
}

/** Descarga la copia web de la foto (solo de upload.wikimedia.org, máximo 5 MB, solo jpg/png/webp). */
export async function descargarFoto(url: string, pedir: typeof fetch = fetch): Promise<{ datos: ArrayBuffer; tipo: "image/jpeg" | "image/png" | "image/webp"; extension: "jpg" | "png" | "webp" }> {
  if (!url.startsWith("https://upload.wikimedia.org/")) throw new ErrorWikimedia("Origen de la foto no permitido");
  const r = await pedir(url, { headers: { "user-agent": AGENTE }, signal: AbortSignal.timeout(15_000), redirect: "error", cache: "no-store" });
  if (!r.ok) throw new ErrorWikimedia(`La foto respondió ${r.status}`);
  const tipo = (r.headers.get("content-type") ?? "").split(";")[0]!.trim();
  const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const)[tipo as "image/jpeg"];
  if (!extension) throw new ErrorWikimedia("La foto no es jpg, png ni webp");
  if (Number(r.headers.get("content-length") ?? 0) > 5_000_000) throw new ErrorWikimedia("La foto pesa más de 5 MB");
  const datos = await r.arrayBuffer();
  if (datos.byteLength > 5_000_000 || datos.byteLength < 1000) throw new ErrorWikimedia("Tamaño de foto raro");
  return { datos, tipo: tipo as "image/jpeg", extension };
}
