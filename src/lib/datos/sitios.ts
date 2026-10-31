import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { TIPOS_OCULTOS, type Grupo, type TipoSitio } from "@/lib/osm";
import { urlPublicaFoto } from "@/lib/fotos";
import { crearClientePublico } from "@/lib/supabase/publico";

/*
 * Guía útil (versión 5, fase 23): lugares de referencia de OpenStreetMap ya revisados por el admin.
 * Aparte de los negocios: no tienen ficha propia, solo nombre, tipo, una frase y "Cómo llegar".
 */

export type Sitio = {
  id: string;
  grupo: Grupo;
  tipo: TipoSitio;
  nombre: string;
  nota: string | null;
  direccion: string | null;
  telefono: string | null;
  web: string | null;
  horario: string | null;
  ubicacion: { lat: number; lng: number };
  osm: string;
  /** Versión 7 (29.4): foto de Wikimedia Commons (copiada a nuestro bucket) con su crédito, y 1–2 frases de Wikipedia. */
  foto: FotoSitio | null;
  descripcion: { texto: string; fuente: string } | null;
  /** Versión 12 (40.5): un párrafo de Wikipedia (misma fuente que `descripcion`) y datos rápidos de Wikidata. */
  parrafo: string | null;
  datos: DatosRapidosSitio;
};

export type DatosRapidosSitio = { inaugurado?: string; superficie?: string; patrimonio?: string };
export type FotoGaleria = { src: string; alt: string; credito: string | null; licencia: string | null; fuente: string | null };

/** Los datos rápidos tal como se muestran: solo las claves conocidas y texto corto (lo demás se ignora). */
function leerDatos(v: unknown): DatosRapidosSitio {
  const o = v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const d: DatosRapidosSitio = {};
  for (const k of ["inaugurado", "superficie", "patrimonio"] as const) {
    const x = o[k];
    if (typeof x === "string" && x.trim() && x.length <= 120) d[k] = x.trim();
  }
  return d;
}

export type FotoSitio = { src: string; credito: string; licencia: string; fuente: string };
type ColumnasFoto = {
  photo_path: string | null;
  photo_credit: string | null;
  photo_license: string | null;
  photo_source: string | null;
  description: string | null;
  description_source: string | null;
};

/** Foto y descripción de una fila de `city_spots` (la base garantiza que vienen con su licencia y su fuente). */
export function fotoYDescripcion(f: ColumnasFoto): Pick<Sitio, "foto" | "descripcion"> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return {
    foto:
      f.photo_path && f.photo_license && f.photo_source && base
        ? { src: urlPublicaFoto(base, f.photo_path), credito: f.photo_credit || "Autor en Wikimedia Commons", licencia: f.photo_license, fuente: f.photo_source }
        : null,
    descripcion: f.description && f.description_source ? { texto: f.description, fuente: f.description_source } : null,
  };
}

type Fila = {
  id: string;
  grupo: Grupo;
  tipo: TipoSitio;
  name: string;
  note: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  latitude: number;
  longitude: number;
  osm_type: string;
  osm_id: number;
  description_long: string | null;
  facts: unknown;
} & ColumnasFoto;

/**
 * Todos los sitios publicados de Guayaquil (lo filtra la base por RLS), ordenados por tipo y nombre.
 * Se guardan 5 minutos en caché (las categorías y el buscador se dibujan en cada visita); el admin la vacía al
 * publicar o corregir (etiqueta "sitios").
 */
export const getSitios = cache(() => leerSitiosEnCache());

const leerSitiosEnCache = unstable_cache(async (): Promise<Sitio[]> => {
  const db = crearClientePublico();
  if (!db) return [];
  // La API devuelve como mucho 1000 filas por pedido: se lee por páginas (hasta 5000)
  const filas: Fila[] = [];
  for (let desde = 0; desde < 5000; desde += 1000) {
    const { data, error } = await db
      .from("city_spots")
      .select("id, grupo, tipo, name, note, address, phone, website, opening_hours, latitude, longitude, osm_type, osm_id, photo_path, photo_credit, photo_license, photo_source, description, description_source, description_long, facts, cities!inner(slug)")
      .eq("cities.slug", "guayaquil")
      .order("tipo")
      .not("tipo", "in", `(${TIPOS_OCULTOS.join(",")})`)
      .order("name")
      .order("id")
      .range(desde, desde + 999)
      .returns<Fila[]>();
    if (error) throw new Error(`No se pudo leer la guía útil: ${error.message}`);
    filas.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return filas.map((f) => ({
    id: f.id,
    grupo: f.grupo,
    tipo: f.tipo,
    nombre: f.name,
    nota: f.note,
    direccion: f.address,
    telefono: f.phone,
    web: f.website,
    horario: f.opening_hours,
    ubicacion: { lat: f.latitude, lng: f.longitude },
    osm: `${f.osm_type}/${f.osm_id}`,
    ...fotoYDescripcion(f),
    parrafo: f.description_long && f.description_source ? f.description_long : null,
    datos: leerDatos(f.facts),
  }));
}, ["sitios-guia-util"], { revalidate: 300, tags: ["sitios"] });

/** Nombre en forma de dirección: "Malecón 2000" → "malecon-2000" (sin tildes ni signos, hasta 60 letras). */
export function slugSitio(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/** Dirección de la página de un lugar para visitar (versión 11, 39.1): /guayaquil/visitar/<nombre>-<id>. */
export function rutaSitio(s: Pick<Sitio, "id" | "nombre">): string {
  const slug = slugSitio(s.nombre);
  return `/guayaquil/visitar/${slug ? `${slug}-` : ""}${s.id}`;
}

const ID_AL_FINAL = /^(?:[a-z0-9-]{0,80}-)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/** El id de un lugar a partir de su dirección ("malecon-2000-<id>"); null si no tiene la forma esperada. */
export function idDeRutaSitio(parte: string): string | null {
  return ID_AL_FINAL.exec(parte)?.[1] ?? null;
}

/** Un lugar para visitar publicado (de la lista en caché); null si no existe o no es para visitar. */
export async function getSitioVisitar(id: string): Promise<Sitio | null> {
  return (await getSitios()).find((s) => s.id === id && s.grupo === "visitar") ?? null;
}

/**
 * Las fotos de la galería de un lugar (versión 12, 40.4): la principal y las más (de Commons, con su crédito, o
 * propias de la guía). Datos públicos, 5 minutos en caché (el panel la vacía al agregar o borrar).
 */
export const getFotosSitio = unstable_cache(
  async (id: string): Promise<{ src: string; alt: string; credito: string | null; licencia: string | null; fuente: string | null }[]> => {
    const db = crearClientePublico();
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!db || !base) return [];
    const { data, error } = await db
      .from("city_spot_photos")
      .select("storage_path, alt_text, credit, license, source")
      .eq("spot_id", id)
      .order("sort_order")
      .order("created_at")
      .limit(8);
    if (error) throw new Error("No se pudieron leer las fotos del lugar");
    return (data ?? []).map((f) => ({ src: urlPublicaFoto(base, f.storage_path), alt: f.alt_text, credito: f.credit, licencia: f.license, fuente: f.source }));
  },
  ["fotos-sitio"],
  { revalidate: 300, tags: ["sitios"] },
);
