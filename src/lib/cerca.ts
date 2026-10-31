import "server-only";
import { unstable_cache } from "next/cache";
import { getSitios, rutaSitio } from "@/lib/datos/sitios";
import { deEstaSemana, textoFechas, textoPrecio } from "@/lib/eventos";
import { urlPublicaFoto } from "@/lib/fotos";
import { estadoAhora, leerHorario } from "@/lib/horario";
import { enlaceOSM, NOMBRE_TIPO, type TipoSitio } from "@/lib/osm";
import { crearClientePublico } from "@/lib/supabase/publico";
import { enEcuador, enlaceRutaGoogle, type Ubicacion } from "@/lib/ubicacion";

/*
 * "Cerca de mí" (versión 8, fase 34; plan en docs/PLAN-V8.md): negocios, eventos de esta semana y lugares de la Guía
 * útil cerca de un punto, ordenados por distancia. Lo usan el buscador (/api/cerca) y Paumi (herramienta buscar_cerca).
 * Privacidad: la ubicación llega redondeada a unos 100 m, se usa solo en la memoria del servidor para calcular distancias
 * y no se guarda, no se registra ni se manda a la base (lo público se lee aparte, sin ella, y en caché).
 * Solo lee lo público, con la clave pública (RLS esconde borradores y todo lo privado).
 */

const CIUDAD = "guayaquil";
/** Primero se busca a 3 km; si no hay casi nada, a 8 km. */
const RADIOS_M = [3000, 8000] as const;
const PRECIOS = { 1: "$", 2: "$$", 3: "$$$" } as const;

/** La ubicación que se acepta: números reales, dentro de Ecuador y redondeada a 3 decimales (≈ 110 m). */
export function ubicacionAproximada(v: unknown): Ubicacion | null {
  const u = v as { lat?: unknown; lng?: unknown } | null;
  const lat = typeof u?.lat === "number" ? u.lat : NaN;
  const lng = typeof u?.lng === "number" ? u.lng : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !enEcuador({ lat, lng })) return null;
  return { lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000 };
}

/** Distancia aproximada en metros (suficiente para una ciudad). */
export function distanciaM(a: Ubicacion, b: Ubicacion): number {
  const dLat = (a.lat - b.lat) * 111_320;
  const dLng = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

/** "a 350 m" o "a 1,2 km" (redondeado: la ubicación misma es aproximada). */
export function textoDistancia(m: number): string {
  if (m < 1000) return `a ${Math.max(100, Math.round(m / 50) * 50)} m`;
  return `a ${(Math.round(m / 100) / 10).toLocaleString("es-EC")} km`;
}

export type CercaLugar = {
  id: string;
  nombre: string;
  categoria: string;
  sector: string;
  ruta: string;
  distancia: number;
  estado: string | null;
  abierto: boolean | null;
  precio: string | null;
  foto: { src: string; alt: string } | null;
  comoLlegar: string;
};
export type CercaEvento = { ruta: string; titulo: string; cuando: string; donde: string; precio: string; distancia: number; comoLlegar: string };
export type CercaSitio = {
  id: string;
  nombre: string;
  tipo: string;
  direccion: string | null;
  distancia: number;
  foto: { src: string; alt: string } | null;
  comoLlegar: string;
  fuente: { url: string; sitio: string };
  /** Versión 11 (39.3): su página en la guía */
  ruta: string;
};
export type ResultadoCerca = { lugares: CercaLugar[]; eventos: CercaEvento[]; sitios: CercaSitio[]; radio: number };

type FilaLugar = {
  id: string;
  slug: string;
  name: string;
  sector: string;
  price_level: number | null;
  latitude: number | string;
  longitude: number | string;
  opening_hours: unknown;
  categories: { slug: string; name: string } | null;
  place_photos: { storage_path: string; alt_text: string; sort_order: number }[];
};
type FilaEvento = {
  slug: string;
  title: string;
  starts_at: string;
  ends_at: string;
  venue: string | null;
  address: string | null;
  price: number | string | null;
  latitude: number | string;
  longitude: number | string;
};

/*
 * Lo público de Guayaquil que tiene ubicación, leído SIN la ubicación de la persona y guardado 5 minutos en caché
 * (revisión independiente del 2026-10-30, hallazgos 1, 2 y 7): así la ubicación nunca sale de nuestro servidor (no va
 * en las consultas a la base ni queda en sus registros), cada "Cerca de mí" no carga la base y lo más cercano no
 * queda fuera por un límite. Si la base falla, se lanza el error (no se muestra "no hay nada cerca").
 */
const leerPublico = unstable_cache(
  async () => {
    const db = crearClientePublico();
    if (!db) return { lugares: [] as FilaLugar[], eventos: [] as FilaEvento[] };
    const [lugares, eventos] = await Promise.all([
      db
        .from("places")
        .select("id, slug, name, sector, price_level, latitude, longitude, opening_hours, categories!inner(slug, name), cities!inner(slug), place_photos(storage_path, alt_text, sort_order)")
        .eq("status", "publicado")
        .eq("cities.slug", CIUDAD)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(3000)
        .returns<FilaLugar[]>(),
      db
        .from("city_events")
        .select("slug, title, starts_at, ends_at, venue, address, price, latitude, longitude, cities!inner(slug)")
        .eq("cities.slug", CIUDAD)
        .eq("online", false)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("starts_at")
        .limit(500)
        .returns<FilaEvento[]>(),
    ]);
    if (lugares.error || eventos.error) throw new Error("No se pudo leer la guía para «Cerca de mí»");
    return { lugares: lugares.data ?? [], eventos: eventos.data ?? [] };
  },
  ["cerca-de-mi"],
  { revalidate: 300, tags: ["sitios"] },
);

function enRadio<T extends { distancia: number }>(xs: T[], radio: number, maximo: number): T[] {
  return xs.filter((x) => x.distancia <= radio).sort((a, b) => a.distancia - b.distancia).slice(0, maximo);
}

/** Lo que hay cerca de `u`: hasta `maximo` de cada cosa. Si a 3 km no hay casi nada, se amplía a 8 km. */
export async function buscarCerca(u: Ubicacion, maximo = 8, ahora = new Date()): Promise<ResultadoCerca> {
  const [publico, sitios] = await Promise.all([leerPublico(), getSitios()]);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  const todosLugares = publico.lugares.map((f): CercaLugar => {
    const punto = { lat: Number(f.latitude), lng: Number(f.longitude) };
    const h = leerHorario(f.opening_hours);
    const e = h ? estadoAhora(h, ahora) : null;
    const foto = [...(f.place_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
    return {
      id: f.id,
      nombre: f.name,
      categoria: f.categories?.name ?? "",
      sector: f.sector,
      ruta: `/${CIUDAD}/${f.categories?.slug ?? ""}/${f.slug}`,
      distancia: distanciaM(u, punto),
      estado: e?.texto ?? null,
      abierto: e?.abierto ?? null,
      precio: f.price_level === 1 || f.price_level === 2 || f.price_level === 3 ? PRECIOS[f.price_level] : null,
      foto: foto && base ? { src: urlPublicaFoto(base, foto.storage_path), alt: foto.alt_text } : null,
      comoLlegar: enlaceRutaGoogle(punto),
    };
  });
  const filasEventos = publico.eventos.map((f) => ({ ...f, inicio: f.starts_at, fin: f.ends_at }));
  const todosEventos = deEstaSemana(filasEventos, ahora, 500).map((f): CercaEvento => {
    const punto = { lat: Number(f.latitude), lng: Number(f.longitude) };
    return {
      ruta: `/${CIUDAD}/eventos/${f.slug}`,
      titulo: f.title,
      cuando: textoFechas(f.inicio, f.fin),
      donde: [f.venue, f.address].filter(Boolean).join(", "),
      precio: textoPrecio(f.price == null ? null : Number(f.price)),
      distancia: distanciaM(u, punto),
      comoLlegar: enlaceRutaGoogle(punto),
    };
  });
  const todosSitios = sitios
    .filter((x) => x.grupo === "visitar")
    .map((x): CercaSitio => {
      const [tipoOsm, idOsm] = x.osm.split("/");
      return {
        id: x.id,
        nombre: x.nombre,
        tipo: NOMBRE_TIPO[x.tipo as TipoSitio] ?? x.tipo,
        direccion: x.direccion,
        distancia: distanciaM(u, x.ubicacion),
        foto: x.foto ? { src: x.foto.src, alt: `Foto de ${x.nombre}` } : null,
        comoLlegar: enlaceRutaGoogle(x.ubicacion),
        fuente: { url: enlaceOSM(tipoOsm!, idOsm!), sitio: tipoOsm === "wikidata" ? "wikidata.org" : "openstreetmap.org" },
        ruta: rutaSitio(x),
      };
    });

  for (const radio of RADIOS_M) {
    const lugares = enRadio(todosLugares, radio, maximo);
    // Abiertos ahora primero; luego los que tienen foto (versión 9, 35.3); luego el más cercano
    lugares.sort((a, b) => Number(b.abierto === true) - Number(a.abierto === true) || Number(!!b.foto) - Number(!!a.foto) || a.distancia - b.distancia);
    const eventos = enRadio(todosEventos, radio, maximo);
    const visitar = enRadio(todosSitios, radio, maximo);
    // Primero los que tienen foto (los mejor documentados), a igual cercanía
    visitar.sort((a, b) => Number(!!b.foto) - Number(!!a.foto) || a.distancia - b.distancia);
    const r = { lugares, eventos, sitios: visitar, radio };
    if (lugares.length + eventos.length + visitar.length >= 3 || radio === RADIOS_M[RADIOS_M.length - 1]) return r;
  }
  return { lugares: [], eventos: [], sitios: [], radio: RADIOS_M[RADIOS_M.length - 1] };
}

/**
 * Distancia en tramos para Paumi (revisión del 2026-10-30, hallazgo 3): con distancias exactas a lugares reales se
 * podría deducir dónde está la persona. A la IA solo le llegan tramos.
 */
export function tramoDistancia(m: number): string {
  if (m < 300) return "a menos de 300 m";
  if (m < 600) return "a unos 300–600 m";
  if (m < 1000) return "a menos de 1 km";
  if (m < 2000) return "a 1–2 km";
  if (m < 3000) return "a 2–3 km";
  if (m < 5000) return "a 3–5 km";
  return "a 5–8 km";
}
