/*
 * "Agregar un lugar" pegando su enlace (versión 7, fase 30.3): qué es lo que pegó el admin.
 * Solo se aceptan Wikidata, Wikipedia y OpenStreetMap (tienen licencia libre y dicen cuál es el lugar). Un enlace de
 * Google Maps, TripAdvisor o Instagram no sirve: no podemos usar sus datos ni sus fotos.
 */

export type EnlaceLugar =
  | { fuente: "wikidata"; qid: string }
  | { fuente: "wikipedia"; idioma: string; titulo: string }
  | { fuente: "osm"; tipo: "node" | "way" | "relation"; id: number };

const QID = /^Q[1-9]\d{0,11}$/;

/** Lo que pegó el admin, o null si no es un enlace de esas tres fuentes. No hace pedidos: solo lee el texto. */
export function leerEnlace(texto: string): EnlaceLugar | null {
  const t = texto.trim();
  if (QID.test(t)) return { fuente: "wikidata", qid: t };
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase();
  const partes = u.pathname.split("/").filter(Boolean);

  if (host === "www.wikidata.org" || host === "m.wikidata.org" || host === "wikidata.org") {
    const q = partes[0] === "wiki" ? partes[1] : undefined;
    return q && QID.test(q) ? { fuente: "wikidata", qid: q } : null;
  }
  const wiki = /^([a-z]{2,3})(?:\.m)?\.wikipedia\.org$/.exec(host);
  if (wiki && wiki[1] !== "www") {
    if (partes[0] !== "wiki" || !partes[1]) return null;
    let titulo: string;
    try {
      titulo = decodeURIComponent(partes.slice(1).join("/")).replace(/_/g, " ").trim();
    } catch {
      return null;
    }
    return titulo && titulo.length <= 250 ? { fuente: "wikipedia", idioma: wiki[1]!, titulo } : null;
  }
  if (host === "www.openstreetmap.org" || host === "openstreetmap.org") {
    const [tipo, id] = partes;
    if ((tipo === "node" || tipo === "way" || tipo === "relation") && id && /^[1-9]\d{0,14}$/.test(id)) return { fuente: "osm", tipo, id: Number(id) };
    return null;
  }
  return null;
}
