/**
 * Agente revisor de la Guía útil · reglas sin IA (versión 6, paso 27.2; plan en docs/PLAN-V6.md).
 * Resuelven gratis y al instante los casos obvios que se vieron en la revisión a mano del 2026-10-28
 * (docs/revisiones/guia-util-2026-10-28.md). Solo DESCARTAN o mandan a REVISAR con su motivo; nunca publican:
 * publicar lo decide Claude o el admin. Si ninguna regla aplica, devuelven null y el caso pasa a Claude.
 */

export type Veredicto = "publicar" | "revisar" | "descartar";
export type Recomendacion = { veredicto: Veredicto; motivo: string };

export type SitioParaRevisar = {
  id: string;
  nombre: string;
  tipo: string;
  grupo: string;
  direccion?: string | null;
  telefono?: string | null;
  web?: string | null;
  horario?: string | null;
  lat?: number | null;
  lng?: number | null;
};

/** Minúsculas, sin tildes ni signos, espacios simples. */
export function normalizar(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();
}

/** Nombres que no dicen cuál lugar es (solo el tipo o una palabra suelta). */
const GENERICOS = new Set(
  [
    "mirador", "parque", "parque infantil", "juegos infantiles", "area verde", "cancha", "museo", "monumento", "iglesia", "capilla",
    "atraccion", "bazar", "tienda", "farmacia", "taller", "mecanica", "celulares", "electronica", "cerrajeria", "clinica",
    "consultorio", "hospital", "estacion", "parada", "terminal", "aerovia", "metrovia", "plaza", "plazoleta", "glorieta",
  ].map(normalizar),
);

/** Palabras que delatan una urbanización, un bloque o una etapa de vivienda (no un lugar para visitar). */
const VIVIENDA = /\b(urb|urbanizacion|etapa|conjunto|condominio|manzana|mz|bloque|villa|ciudadela|cdla)\b/;
/** Cosas que nunca son un lugar para visitar aunque OSM las marque así. */
const NO_VISITABLE = /\b(palco|palcos|servicios higienicos|bano|banos|parqueadero|garita|bodega)\b/;
/** Casas particulares ("familia" sola no: "Parque de la Familia" es un parque; ajuste del 2026-10-28). */
const CASA = /\b(home|casa familia)\b|^casa de [a-z]+$/;
/** Negocios o servicios que OSM marcó como "para visitar". */
const NEGOCIO = /\b(farmacia|clinica|consultorio|hospital|taller|ferreteria|tienda|bazar|restaurante|panaderia|abarrotes|despensa|cyber)\b/;

/** Distancia aproximada en metros (suficiente para Guayaquil). */
export function distancia(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = (a.lat - b.lat) * 111_320;
  const dLng = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

/** Palabras que no distinguen un lugar de otro: artículos y nombres de tipo ("Estatua de las Artes Mayores" y
 *  "Estatua de las Artes Aplicadas" no son el mismo lugar; ajuste del 2026-10-28 tras la primera corrida real). */
const PALABRAS_VACIAS = new Set(
  [
    "de", "del", "la", "las", "el", "los", "y", "a", "al", "en", "san", "santa", "guayaquil",
    "museo", "parque", "mirador", "estacion", "monumento", "estatua", "busto", "plaza", "plazoleta", "iglesia", "capilla",
    "cancha", "multiple", "area", "comun", "verde", "torre", "elemento", "artes", "arte",
  ].map(normalizar),
);
/** Palabras importantes, en singular simple ("bomberos" = "bombero"). */
const palabras = (t: string) =>
  new Set(
    normalizar(t)
      .split(" ")
      .filter((p) => p.length > 2 && !PALABRAS_VACIAS.has(p))
      .map((p) => (p.length > 4 && p.endsWith("s") ? p.slice(0, -1) : p)),
  );

/** ¿Dos nombres hablan del mismo lugar? Iguales, o comparten casi todas sus palabras importantes (todas si es una sola). */
/** Números y números romanos de un nombre ("Parque Herradura 3", "La Floresta II"). */
const numeros = (t: string) => new Set(normalizar(t).match(/\b(\d+|i{1,3}|iv|v|vi{1,3}|ix|x)\b/g) ?? []);

export function nombresParecidos(a: string, b: string): boolean {
  const na = normalizar(a);
  const nb = normalizar(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Si los dos llevan número y no es el mismo, son lugares distintos ("Herradura 2" y "Herradura 3")
  const xa = numeros(a);
  const xb = numeros(b);
  if (xa.size && xb.size && ![...xa].some((x) => xb.has(x))) return false;
  const pa = palabras(a);
  const pb = palabras(b);
  if (!pa.size || !pb.size) return false;
  const comunes = [...pa].filter((p) => pb.has(p)).length;
  const parte = comunes / Math.min(pa.size, pb.size);
  // Con 2 o más palabras en común: casi todas iguales. Con 1 sola: solo si las dos se reducen a esa misma palabra
  // ("Orquídeas" y "Monumento a las Orquídeas" sí; "Elemento Fuego" y "Elemento Tierra" no).
  return comunes >= 2 ? parte >= 0.6 : comunes === 1 && pa.size === 1 && pb.size === 1;
}

/**
 * La regla que aplica a este lugar, o null si el caso necesita criterio (Claude).
 * `otros`: lugares ya publicados o pendientes, para detectar duplicados (a menos de 300 m): del mismo tipo, o de
 * cualquier tipo de "Para visitar" ("Parque Histórico de Guayaquil" como parque y "Parque Histórico" como museo son
 * el mismo lugar; ajuste del 2026-10-28). En transporte no: la parada de Aerovía y la de Metrovía de "Parque
 * Centenario" son distintas.
 */
export function aplicarReglas(s: SitioParaRevisar, otros: SitioParaRevisar[] = []): Recomendacion | null {
  const n = normalizar(s.nombre);
  if (n.length < 3) return { veredicto: "descartar", motivo: "Sin nombre propio" };
  if (GENERICOS.has(n)) return { veredicto: "descartar", motivo: "Nombre genérico: no dice cuál lugar es" };

  if (s.grupo === "visitar") {
    if (NO_VISITABLE.test(n)) return { veredicto: "descartar", motivo: "No es un lugar para visitar (palco, baño u otro)" };
    if (VIVIENDA.test(n))
      return { veredicto: "descartar", motivo: s.tipo === "parque" ? "Parque de barrio o ciudadela (en la guía van solo los parques grandes)" : "Parece una urbanización, etapa o bloque de vivienda" };
    if (CASA.test(n)) return { veredicto: "descartar", motivo: "Parece una casa particular" };
    if (NEGOCIO.test(n)) return { veredicto: "descartar", motivo: "Es un negocio o servicio, no un lugar para visitar" };
  }

  if (s.lat != null && s.lng != null) {
    const gemelo = otros.find(
      (o) => o.id !== s.id && (o.tipo === s.tipo || (s.grupo === "visitar" && o.grupo === "visitar")) && o.lat != null && o.lng != null && distancia({ lat: s.lat!, lng: s.lng! }, { lat: o.lat, lng: o.lng }) < 300 && nombresParecidos(s.nombre, o.nombre),
    );
    if (gemelo) return { veredicto: "revisar", motivo: `Posible duplicado de «${gemelo.nombre.slice(0, 80)}»` };
  }
  return null;
}
