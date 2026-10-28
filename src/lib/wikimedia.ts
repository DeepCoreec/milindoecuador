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
const MAX_FOTO = 5_000_000;

/**
 * Falla al hablar con Wikimedia. `permanente`: volver a intentar no sirve (por ejemplo, un título inválido que da 400):
 * el lugar se anota como revisado para que no trabe el botón (revisión independiente del 2026-10-28, hallazgo 2).
 */
export class ErrorWikimedia extends Error {
  constructor(
    mensaje: string,
    readonly permanente = false,
  ) {
    super(mensaje);
  }
}

/** Cómo se pide: el fetch (se reemplaza en las pruebas) y un corte opcional para no pasarse del tiempo de Vercel. */
type Ctx = { pedir: typeof fetch; corte?: AbortSignal };
const senal = (c: Ctx, ms: number) => (c.corte ? AbortSignal.any([AbortSignal.timeout(ms), c.corte]) : AbortSignal.timeout(ms));
const HOSTS = /^(www\.wikidata\.org|commons\.wikimedia\.org|upload\.wikimedia\.org|thumb\.wikimedia\.org|[a-z]{2,3}\.wikipedia\.org)$/;
/** Dónde Wikimedia sirve las copias web de las fotos (desde 2026 también thumb.wikimedia.org; visto en producción el 2026-10-28). */
const ORIGEN_FOTO = /^https:\/\/(upload|thumb)\.wikimedia\.org\//;

/** Después de una redirección, la respuesta tiene que seguir viniendo de Wikimedia (hallazgo 6). */
function hostPermitido(r: Response) {
  if (r.url && !HOSTS.test(new URL(r.url).hostname)) throw new ErrorWikimedia("Wikimedia redirigió a otro sitio", true);
}
/** 404: no existe (no es error). 429 y 5xx: volver a intentar después. Otro 4xx: no tiene arreglo (permanente). */
function revisarEstado(r: Response, que: string) {
  if (r.ok) return;
  throw new ErrorWikimedia(`${que} respondió ${r.status}`, r.status >= 400 && r.status < 500 && r.status !== 429);
}

export type FotoWikimedia = { url: string; credito: string; licencia: string; fuente: string };
export type ResultadoWikimedia = {
  wikidata: string | null;
  foto: FotoWikimedia | null;
  descripcion: { texto: string; fuente: string } | null;
  /** Por qué no hay foto (diagnóstico para el admin, 29.8), o null si hay foto. */
  sinFoto: string | null;
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

async function pedirJSON(url: string, c: Ctx): Promise<unknown> {
  const r = await c.pedir(url, {
    headers: { "user-agent": AGENTE, "api-user-agent": AGENTE, accept: "application/json" },
    signal: senal(c, 10_000),
    cache: "no-store",
  });
  hostPermitido(r);
  if (r.status === 404) return null;
  revisarEstado(r, "Wikimedia");
  const j = (await r.json()) as unknown;
  // La API de Wikipedia/Wikidata avisa errores con código 200 y {"error": {...}}. "Demasiado ocupado" y parecidos son
  // pasajeros: se reintenta en otro clic, nunca se toma como "no hay nada" (visto en producción el 2026-10-28, 29.11)
  const error = (j as { error?: { code?: unknown } } | null)?.error;
  if (error) {
    const codigo = String(error.code ?? "desconocido").slice(0, 40);
    throw new ErrorWikimedia(`Wikimedia dio error «${codigo}»`, !/busy|ratelimit|maxlag|readonly|internal|timeout/i.test(codigo));
  }
  return j;
}

type Entidad = { titulo: string | null; archivo: string | null; punto: { lat: number; lng: number } | null; esPersona: boolean };

/** Lo que importa de una entidad de Wikidata: artículo en español, imagen principal (P18) y coordenadas (P625). */
async function leerEntidad(qid: string, c: Ctx): Promise<Entidad | null> {
  if (!QID.test(qid)) return null;
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims%7Csitelinks&sitefilter=eswiki&format=json`;
  const j = (await pedirJSON(url, c)) as { entities?: Record<string, { missing?: string; claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]>; sitelinks?: { eswiki?: { title?: unknown } } }> } | null;
  const e = j?.entities?.[qid];
  if (!e || "missing" in e) return null;
  const archivo = e.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  const coord = e.claims?.P625?.[0]?.mainsnak?.datavalue?.value as { latitude?: unknown; longitude?: unknown } | undefined;
  const titulo = e.sitelinks?.eswiki?.title;
  // "Es una instancia de" (P31) ser humano (Q5): un monumento enlazado a la persona traería su retrato (visto en
  // producción el 2026-10-28 con "Presidente Gabriel García Moreno")
  const esPersona = (e.claims?.P31 ?? []).some((x) => (x.mainsnak?.datavalue?.value as { id?: unknown } | undefined)?.id === "Q5");
  return {
    esPersona,
    titulo: typeof titulo === "string" && titulo.length <= 250 ? titulo : null,
    archivo: typeof archivo === "string" && archivo.length <= 250 ? archivo : null,
    punto: typeof coord?.latitude === "number" && typeof coord.longitude === "number" ? { lat: coord.latitude, lng: coord.longitude } : null,
  };
}

type Resumen = { qid: string | null; extracto: string | null; pagina: string | null };

/** Resumen de un artículo de Wikipedia (`idioma`.wikipedia.org). Las desambiguaciones no sirven. */
async function leerResumen(idioma: string, titulo: string, c: Ctx): Promise<Resumen | null> {
  if (!IDIOMA.test(idioma)) return null;
  const url = `https://${idioma}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titulo.replace(/ /g, "_"))}`;
  const j = (await pedirJSON(url, c)) as { type?: unknown; extract?: unknown; wikibase_item?: unknown; content_urls?: { desktop?: { page?: unknown } } } | null;
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
async function buscarCerca(l: LugarParaBuscar, c: Ctx): Promise<{ titulo: string | null; detalle: string }> {
  const url = `https://es.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${l.lat.toFixed(6)}%7C${l.lng.toFixed(6)}&gsradius=${CERCA_BUSQUEDA_M}&gslimit=15&format=json`;
  const j = (await pedirJSON(url, c)) as { query?: { geosearch?: { title?: unknown; dist?: unknown }[] } } | null;
  // Diagnóstico (29.10): qué artículos hay cerca, para saber si no hay ninguno o si el nombre no coincide
  const vistos: string[] = [];
  for (const g of j?.query?.geosearch ?? []) {
    if (typeof g.title !== "string" || typeof g.dist !== "number" || g.dist > CERCA_BUSQUEDA_M) continue;
    if (nombresParecidos(l.nombre, sinAclaracion(g.title))) return { titulo: g.title, detalle: "" };
    if (vistos.length < 3) vistos.push(`«${g.title.slice(0, 40)}» a ${Math.round(g.dist)} m`);
  }
  return { titulo: null, detalle: vistos.length ? `cerca solo hay ${vistos.join(", ")}` : "ningún artículo a menos de 300 m" };
}

/** La foto en Commons: copia de 960 px, licencia libre, autor y enlace. Si algo no cuadra, el motivo (texto). */
async function leerFoto(archivo: string, c: Ctx): Promise<FotoWikimedia | string> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(`File:${archivo}`)}&prop=imageinfo&iiprop=url%7Cextmetadata%7Cmime&iiurlwidth=960&format=json`;
  const j = (await pedirJSON(url, c)) as {
    query?: { pages?: Record<string, { missing?: string; imageinfo?: { thumburl?: unknown; thumbmime?: unknown; mime?: unknown; descriptionurl?: unknown; extmetadata?: Record<string, { value?: unknown }> }[] }> };
  } | null;
  const pagina = Object.values(j?.query?.pages ?? {})[0];
  const ii = pagina && !("missing" in pagina) ? pagina.imageinfo?.[0] : undefined;
  if (!ii) return j ? `Commons no tiene el archivo «${archivo.slice(0, 40)}»` : "Commons no respondió el archivo";
  const mime = typeof ii.thumbmime === "string" ? ii.thumbmime : ii.mime;
  if (mime !== "image/jpeg" && mime !== "image/png" && mime !== "image/webp") return `tipo de archivo ${String(mime).slice(0, 30)}`;
  const foto = typeof ii.thumburl === "string" ? ii.thumburl : null;
  const fuente = typeof ii.descriptionurl === "string" ? ii.descriptionurl : null;
  if (!foto || !ORIGEN_FOTO.test(foto)) return `copia web rara (${String(foto).slice(0, 40)})`;
  if (!fuente?.startsWith("https://commons.wikimedia.org/") || fuente.length > 400) return `enlace raro (${String(fuente).slice(0, 40)})`;
  const meta = ii.extmetadata ?? {};
  const licencia = typeof meta.LicenseShortName?.value === "string" ? textoPlano(meta.LicenseShortName.value, 60) : "";
  if (!licenciaLibre(licencia)) return `licencia no libre o desconocida «${licencia || "sin dato"}»`;
  const autor = typeof meta.Artist?.value === "string" ? textoPlano(meta.Artist.value, 150) : "";
  return { url: foto, credito: autor || "Autor en Wikimedia Commons", licencia, fuente };
}

/**
 * Busca foto y descripción para un lugar publicado. Nunca lanza por "no encontré": devuelve `nada` con el motivo.
 * Lanza ErrorWikimedia si Wikimedia falla (para volver a intentar después). `pedir` se reemplaza en las pruebas.
 */
export async function buscarEnWikimedia(l: LugarParaBuscar, pedir: typeof fetch = fetch, corte?: AbortSignal): Promise<ResultadoWikimedia> {
  const c: Ctx = { pedir, corte };
  const vacio = (nada: string): ResultadoWikimedia => ({ wikidata: null, foto: null, descripcion: null, sinFoto: nada, nada });
  let qid = l.wikidata && QID.test(l.wikidata) ? l.wikidata : null;
  let tituloEs: string | null = null;
  let enlazado = !!qid;

  // 1. ¿Cuál es el lugar en Wikimedia?
  if (!qid && l.wikipedia) {
    const [idioma, ...resto] = l.wikipedia.split(":");
    const titulo = resto.join(":").trim();
    if (idioma && titulo && IDIOMA.test(idioma)) {
      const r = await leerResumen(idioma, titulo, c);
      qid = r?.qid ?? null;
      if (idioma === "es" && r) tituloEs = titulo;
      enlazado = !!qid;
    }
  }
  if (!qid) {
    const busqueda = await buscarCerca(l, c);
    const cerca = busqueda.titulo;
    if (!cerca) return vacio(`Sin artículo en Wikipedia cerca y con el mismo nombre (${busqueda.detalle})`);
    const r = await leerResumen("es", cerca, c);
    if (!r?.qid) return vacio("El artículo cercano no tiene ficha en Wikidata");
    qid = r.qid;
    tituloEs = cerca;
  }

  // 2. La ficha de Wikidata: ¿de verdad está aquí?
  const e = await leerEntidad(qid, c);
  if (!e) return vacio("La ficha de Wikidata no existe");
  if (e.esPersona) return vacio("La ficha de Wikidata es de una persona, no de un lugar");
  if (e.punto && distancia({ lat: l.lat, lng: l.lng }, e.punto) > (enlazado ? LEJOS_ENLAZADO_M : CERCA_BUSQUEDA_M)) {
    return vacio("La ficha de Wikidata está lejos de este lugar: puede ser otro");
  }
  tituloEs = e.titulo ?? tituloEs;
  // Sin coordenadas no hay cómo saber si es este lugar: solo vale si el nombre coincide (hallazgo 1 de la revisión:
  // un enlace equivocado en OpenStreetMap, por ejemplo a una persona o a un logo, no debe traer su foto)
  if (!e.punto && !(tituloEs && nombresParecidos(l.nombre, sinAclaracion(tituloEs)))) {
    return vacio("La ficha de Wikidata no tiene ubicación y su nombre no coincide: puede ser otro");
  }

  // 3. Foto y descripción (cada una por su lado: puede haber una sin la otra)
  const leida = e.archivo ? await leerFoto(e.archivo, c) : "la ficha de Wikidata no tiene foto (P18)";
  const foto = typeof leida === "string" ? null : leida;
  let descripcion: ResultadoWikimedia["descripcion"] = null;
  if (tituloEs) {
    const r = await leerResumen("es", tituloEs, c);
    if (r?.extracto && r.pagina) descripcion = { texto: primerasFrases(r.extracto), fuente: r.pagina };
  }
  return {
    wikidata: qid,
    foto,
    descripcion,
    sinFoto: typeof leida === "string" ? leida : null,
    nada: foto || descripcion ? null : "La ficha no tiene foto libre ni artículo en español",
  };
}

/**
 * Descarga la copia web de la foto: solo de upload.wikimedia.org, sin redirecciones, solo jpg/png/webp y como mucho
 * 5 MB, contando mientras llega (aunque el servidor no diga el tamaño; hallazgo 7 de la revisión).
 */
export async function descargarFoto(
  url: string,
  pedir: typeof fetch = fetch,
  corte?: AbortSignal,
): Promise<{ datos: Uint8Array; tipo: "image/jpeg" | "image/png" | "image/webp"; extension: "jpg" | "png" | "webp" }> {
  if (!ORIGEN_FOTO.test(url)) throw new ErrorWikimedia("Origen de la foto no permitido", true);
  const r = await pedir(url, { headers: { "user-agent": AGENTE }, signal: senal({ pedir, corte }, 15_000), redirect: "error", cache: "no-store" });
  revisarEstado(r, "La foto");
  const tipo = (r.headers.get("content-type") ?? "").split(";")[0]!.trim();
  const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const)[tipo as "image/jpeg"];
  if (!extension) throw new ErrorWikimedia("La foto no es jpg, png ni webp", true);
  if (Number(r.headers.get("content-length") ?? 0) > MAX_FOTO) throw new ErrorWikimedia("La foto pesa más de 5 MB", true);
  if (!r.body) throw new ErrorWikimedia("La foto llegó vacía", true);
  const partes: Uint8Array[] = [];
  let total = 0;
  const lector = r.body.getReader();
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_FOTO) {
      await lector.cancel();
      throw new ErrorWikimedia("La foto pesa más de 5 MB", true);
    }
    partes.push(value);
  }
  if (total < 1000) throw new ErrorWikimedia("Tamaño de foto raro", true);
  const datos = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) {
    datos.set(p, pos);
    pos += p.byteLength;
  }
  return { datos, tipo: tipo as "image/jpeg", extension };
}
