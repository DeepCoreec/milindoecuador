import "server-only";
import { cache } from "react";
import type { Grupo, TipoSitio } from "@/lib/osm";
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
};

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
};

/** Todos los sitios publicados de Guayaquil (lo filtra la base por RLS), ordenados por tipo y nombre. */
export const getSitios = cache(async (): Promise<Sitio[]> => {
  const db = crearClientePublico();
  if (!db) return [];
  const { data, error } = await db
    .from("city_spots")
    .select("id, grupo, tipo, name, note, address, phone, website, opening_hours, latitude, longitude, osm_type, osm_id, cities!inner(slug)")
    .eq("cities.slug", "guayaquil")
    .order("tipo")
    .order("name")
    .limit(3000)
    .returns<Fila[]>();
  if (error) throw new Error(`No se pudo leer la guía útil: ${error.message}`);
  return (data ?? []).map((f) => ({
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
  }));
});
