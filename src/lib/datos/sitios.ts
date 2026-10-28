import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { Grupo, TipoSitio } from "@/lib/osm";
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
};

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
      .select("id, grupo, tipo, name, note, address, phone, website, opening_hours, latitude, longitude, osm_type, osm_id, photo_path, photo_credit, photo_license, photo_source, description, description_source, cities!inner(slug)")
      .eq("cities.slug", "guayaquil")
      .order("tipo")
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
  }));
}, ["sitios-guia-util"], { revalidate: 300, tags: ["sitios"] });
