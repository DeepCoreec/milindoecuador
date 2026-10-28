import "server-only";
import { CAJA_GUAYAQUIL, type TipoSitio } from "@/lib/osm";
import { ErrorWikimedia } from "@/lib/wikimedia";

/*
 * Candidatos a lugares turísticos desde Wikidata (versión 7, fase 30.1; plan en docs/PLAN-V7.md).
 * Regla del usuario: "no queremos llenar de basura, solo lugares buenos". Por eso la consulta SOLO trae lugares que:
 *   - están dentro de la caja de Guayaquil (la misma de OpenStreetMap),
 *   - tienen foto (P18), artículo en Wikipedia en español y nombre en español,
 *   - son de una clase turística (museo, parque, monumento, iglesia…; también sus subclases),
 *   - no son personas.
 * Entran "por revisar": el agente los revisa y se publican solo con foto y descripción. Wikidata es CC0.
 */

const AGENTE = "MiLindoEcuador/1.0 (https://milindoecuador.vercel.app; guia de Guayaquil)";

/** Clases de Wikidata → tipo de la guía. El orden importa: gana la primera que coincida. */
export const CLASES: readonly (readonly [string, TipoSitio, string])[] = [
  ["Q33506", "museo", "museo"],
  ["Q43501", "zoologico", "zoológico"],
  ["Q473972", "reserva", "área protegida"],
  ["Q23442", "reserva", "isla"],
  ["Q16970", "iglesia", "iglesia"],
  ["Q4989906", "monumento", "monumento"],
  ["Q5003624", "monumento", "memorial"],
  ["Q179700", "monumento", "estatua"],
  ["Q860861", "monumento", "escultura"],
  ["Q22698", "parque", "parque"],
  ["Q167346", "parque", "jardín botánico"],
  ["Q57821", "atraccion", "fortificación"],
  ["Q39715", "atraccion", "faro"],
  ["Q202570", "atraccion", "noria"],
  ["Q24354", "atraccion", "teatro"],
  ["Q174782", "atraccion", "plaza"],
  ["Q39614", "atraccion", "cementerio"],
  ["Q570116", "atraccion", "atracción turística"],
];

/** La consulta SPARQL (se arma solo con constantes: nada que venga de afuera). */
export function consultaWikidata(soloQ?: string): string {
  const [latMin, lonMin, latMax, lonMax] = CAJA_GUAYAQUIL;
  // 30.3: un solo lugar (agregar por enlace). El Q se valida con su forma exacta antes de ponerlo en la consulta
  if (soloQ !== undefined && !/^Q[1-9]\d{0,11}$/.test(soloQ)) throw new ErrorWikimedia("Código de Wikidata inválido", true);
  const uno = soloQ ? `\n  VALUES ?item { wd:${soloQ} }` : "";
  // Con un solo lugar (lo eligió el admin) la clase turística es opcional: si no tiene una conocida, entra como
  // "Atracción" (Malecón 2000 es un "paseo marítimo" en Wikidata; visto en producción el 2026-10-28)
  const lista = CLASES.map(([q]) => `wd:${q}`).join(" ");
  const clases = soloQ
    ? `  OPTIONAL { VALUES ?clase { ${lista} } ?item wdt:P31/wdt:P279* ?clase . }`
    : `  VALUES ?clase { ${lista} }\n  ?item wdt:P31/wdt:P279* ?clase .`;
  return `SELECT ?item ?nombre ?coord ?clase WHERE {${uno}
  SERVICE wikibase:box {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:cornerSouthWest "Point(${lonMin} ${latMin})"^^geo:wktLiteral .
    bd:serviceParam wikibase:cornerNorthEast "Point(${lonMax} ${latMax})"^^geo:wktLiteral .
  }
  ?item wdt:P18 ?foto .
  ?articulo schema:about ?item ; schema:isPartOf <https://es.wikipedia.org/> .
${clases}
  FILTER NOT EXISTS { ?item wdt:P31 wd:Q5 }
  ?item rdfs:label ?nombre . FILTER(LANG(?nombre) = "es")
}
LIMIT 3000`;
}

export type CandidatoWikidata = { qid: string; nombre: string; lat: number; lng: number; tipo: TipoSitio };

const QID_URI = /^http:\/\/www\.wikidata\.org\/entity\/(Q[1-9]\d{0,11})$/;
const PUNTO = /^Point\((-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\)$/;

/** Traduce la respuesta SPARQL: un candidato por Q, con el tipo de la clase más importante. Ignora lo raro. */
export function aCandidatos(respuesta: unknown, claseOpcional = false): CandidatoWikidata[] {
  const filas = (respuesta as { results?: { bindings?: unknown } })?.results?.bindings;
  if (!Array.isArray(filas)) return [];
  const prioridad = new Map(CLASES.map(([q], i) => [q, i]));
  const porQ = new Map<string, CandidatoWikidata & { orden: number }>();
  const [latMin, lonMin, latMax, lonMax] = CAJA_GUAYAQUIL;
  for (const f of filas as Record<string, { value?: unknown } | undefined>[]) {
    const qid = typeof f.item?.value === "string" ? QID_URI.exec(f.item.value)?.[1] : undefined;
    const clase = typeof f.clase?.value === "string" ? QID_URI.exec(f.clase.value)?.[1] : undefined;
    const punto = typeof f.coord?.value === "string" ? PUNTO.exec(f.coord.value) : null;
    const nombre = typeof f.nombre?.value === "string" ? f.nombre.value.replace(/[\p{Cc}\p{Cf}]/gu, " ").replace(/\s+/g, " ").trim() : "";
    if (!qid || !punto || nombre.length < 2 || nombre.length > 120 || /^Q\d+$/.test(nombre)) continue;
    if (!clase && !claseOpcional) continue;
    // Sin clase conocida (solo al agregar uno a mano): "Atracción", con la prioridad más baja
    const orden = clase ? prioridad.get(clase) : CLASES.length - 1;
    if (orden === undefined) continue;
    const lng = Number(punto[1]);
    const lat = Number(punto[2]);
    if (lat < latMin || lat > latMax || lng < lonMin || lng > lonMax) continue;
    const antes = porQ.get(qid);
    const tipo = clase ? CLASES[orden]![1] : "atraccion";
    if (!antes || orden < antes.orden) porQ.set(qid, { qid, nombre, lat, lng, tipo, orden });
  }
  return [...porQ.values()].map((c) => ({ qid: c.qid, nombre: c.nombre, lat: c.lat, lng: c.lng, tipo: c.tipo })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Pide la consulta al servicio público de Wikidata (solo ese dominio, sin redirecciones, máximo 5 MB). */
export async function buscarCandidatosWikidata(pedir: typeof fetch = fetch, soloQ?: string, corte?: AbortSignal): Promise<CandidatoWikidata[]> {
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(consultaWikidata(soloQ))}`;
  const r = await pedir(url, {
    headers: { "user-agent": AGENTE, accept: "application/sparql-results+json" },
    signal: corte ? AbortSignal.any([AbortSignal.timeout(40_000), corte]) : AbortSignal.timeout(40_000),
    redirect: "error",
    cache: "no-store",
  });
  if (!r.ok) throw new ErrorWikimedia(`Wikidata respondió ${r.status}`);
  if (Number(r.headers.get("content-length") ?? 0) > 5_000_000) throw new ErrorWikimedia("La respuesta de Wikidata es demasiado grande");
  const texto = await r.text();
  if (texto.length > 5_000_000) throw new ErrorWikimedia("La respuesta de Wikidata es demasiado grande");
  try {
    return aCandidatos(JSON.parse(texto), soloQ !== undefined);
  } catch {
    throw new ErrorWikimedia("Wikidata no devolvió datos válidos");
  }
}
