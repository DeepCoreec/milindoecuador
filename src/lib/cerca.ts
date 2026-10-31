import "server-only";
import { fotoYDescripcion } from "@/lib/datos/sitios";
import { deEstaSemana, textoFechas, textoPrecio } from "@/lib/eventos";
import { urlPublicaFoto } from "@/lib/fotos";
import { estadoAhora, leerHorario } from "@/lib/horario";
import { NOMBRE_TIPO, type TipoSitio } from "@/lib/osm";
import { crearClientePublico } from "@/lib/supabase/publico";
import { enEcuador, enlaceRutaGoogle, type Ubicacion } from "@/lib/ubicacion";

/*
 * "Cerca de mí" (versión 8, fase 34; plan en docs/PLAN-V8.md): negocios, eventos de esta semana y lugares de la Guía
 * útil cerca de un punto, ordenados por distancia. Lo usan el buscador (/api/cerca) y Paumi (herramienta buscar_cerca).
 * Privacidad: la ubicación llega redondeada a unos 100 m, se usa solo para esta búsqueda y no se guarda ni se registra.
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

/** Caja alrededor del punto (para pedirle a la base solo lo de la zona). */
function caja(u: Ubicacion, radio: number) {
  const dLat = radio / 111_320;
  const dLng = radio / (111_320 * Math.cos((u.lat * Math.PI) / 180));
  return { latMin: u.lat - dLat, latMax: u.lat + dLat, lngMin: u.lng - dLng, lngMax: u.lng + dLng };
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
type FilaEvento = { slug: string; title: string; starts_at: string; ends_at: string; venue: string | null; price: number | string | null; latitude: number | string; longitude: number | string };
type FilaSitio = {
  id: string;
  tipo: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  osm_type: string;
  osm_id: number;
  photo_path: string | null;
  photo_credit: string | null;
  photo_license: string | null;
  photo_source: string | null;
  description: string | null;
  description_source: string | null;
};

async function buscarEnRadio(u: Ubicacion, radio: number, maximo: number, ahora: Date): Promise<ResultadoCerca> {
  const db = crearClientePublico();
  if (!db) return { lugares: [], eventos: [], sitios: [], radio };
  const c = caja(u, radio);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const [lugares, eventos, sitios] = await Promise.all([
    db
      .from("places")
      .select("id, slug, name, sector, price_level, latitude, longitude, opening_hours, categories!inner(slug, name), cities!inner(slug), place_photos(storage_path, alt_text, sort_order)")
      .eq("status", "publicado")
      .eq("cities.slug", CIUDAD)
      .gte("latitude", c.latMin)
      .lte("latitude", c.latMax)
      .gte("longitude", c.lngMin)
      .lte("longitude", c.lngMax)
      .limit(300)
      .returns<FilaLugar[]>(),
    db
      .from("city_events")
      .select("slug, title, starts_at, ends_at, venue, price, latitude, longitude, cities!inner(slug)")
      .eq("cities.slug", CIUDAD)
      .eq("online", false)
      .gte("latitude", c.latMin)
      .lte("latitude", c.latMax)
      .gte("longitude", c.lngMin)
      .lte("longitude", c.lngMax)
      .order("starts_at")
      .limit(100)
      .returns<FilaEvento[]>(),
    db
      .from("city_spots")
      .select(
        "id, tipo, name, address, latitude, longitude, osm_type, osm_id, photo_path, photo_credit, photo_license, photo_source, description, description_source, cities!inner(slug)",
      )
      .eq("cities.slug", CIUDAD)
      .eq("grupo", "visitar")
      .gte("latitude", c.latMin)
      .lte("latitude", c.latMax)
      .gte("longitude", c.lngMin)
      .lte("longitude", c.lngMax)
      .limit(300)
      .returns<FilaSitio[]>(),
  ]);

  const enRadio = <T extends { distancia: number }>(xs: T[]) => xs.filter((x) => x.distancia <= radio).sort((a, b) => a.distancia - b.distancia).slice(0, maximo);

  const listaLugares = enRadio(
    (lugares.data ?? []).map((f): CercaLugar => {
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
    }),
  );
  // Abiertos ahora primero (a igual cercanía, mejor lo que se puede visitar ya)
  listaLugares.sort((a, b) => Number(b.abierto === true) - Number(a.abierto === true) || a.distancia - b.distancia);

  const filasEventos = (eventos.data ?? []).map((f) => ({ ...f, inicio: f.starts_at, fin: f.ends_at }));
  const listaEventos = enRadio(
    deEstaSemana(filasEventos, ahora, 50).map((f): CercaEvento => {
      const punto = { lat: Number(f.latitude), lng: Number(f.longitude) };
      return {
        ruta: `/${CIUDAD}/eventos/${f.slug}`,
        titulo: f.title,
        cuando: textoFechas(f.inicio, f.fin),
        donde: f.venue ?? "",
        precio: textoPrecio(f.price == null ? null : Number(f.price)),
        distancia: distanciaM(u, punto),
        comoLlegar: enlaceRutaGoogle(punto),
      };
    }),
  );

  const listaSitios = enRadio(
    (sitios.data ?? []).map((f): CercaSitio => {
      const punto = { lat: f.latitude, lng: f.longitude };
      return {
        id: f.id,
        nombre: f.name,
        tipo: NOMBRE_TIPO[f.tipo as TipoSitio] ?? f.tipo,
        direccion: f.address,
        distancia: distanciaM(u, punto),
        foto: fotoYDescripcion(f).foto ? { src: fotoYDescripcion(f).foto!.src, alt: `Foto de ${f.name}` } : null,
        comoLlegar: enlaceRutaGoogle(punto),
        fuente:
          f.osm_type === "wikidata"
            ? { url: `https://www.wikidata.org/wiki/Q${f.osm_id}`, sitio: "wikidata.org" }
            : { url: `https://www.openstreetmap.org/${f.osm_type}/${f.osm_id}`, sitio: "openstreetmap.org" },
      };
    }),
  );
  // Primero los que tienen foto (los mejor documentados), a igual cercanía
  listaSitios.sort((a, b) => Number(!!b.foto) - Number(!!a.foto) || a.distancia - b.distancia);

  return { lugares: listaLugares, eventos: listaEventos, sitios: listaSitios, radio };
}

/** Lo que hay cerca de `u`: hasta `maximo` de cada cosa. Si a 3 km no hay casi nada, se amplía a 8 km. */
export async function buscarCerca(u: Ubicacion, maximo = 8, ahora = new Date()): Promise<ResultadoCerca> {
  let r = await buscarEnRadio(u, RADIOS_M[0], maximo, ahora);
  if (r.lugares.length + r.eventos.length + r.sitios.length < 3) r = await buscarEnRadio(u, RADIOS_M[1], maximo, ahora);
  return r;
}
