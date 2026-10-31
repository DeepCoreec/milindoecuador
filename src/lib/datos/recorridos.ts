import { cache } from "react";
import { getSitios, type Sitio } from "@/lib/datos/sitios";
import { crearClientePublico } from "@/lib/supabase/publico";

/*
 * Lecturas públicas de los recorridos (versión 13, 42.3). Las reglas de la base (0024) solo dejan ver los recorridos
 * publicados de guías publicados, y paradas de lugares publicados. Las paradas se completan con los lugares de la guía
 * que hoy se muestran (foto, ubicación y su página).
 */

export type Recorrido = {
  id: string;
  lugarId: string;
  nombre: string;
  descripcion: string;
  duracion: number;
  precio: number | null;
  encuentro: string;
  paradas: Sitio[];
};

type Fila = {
  id: string;
  place_id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_usd: number | string | null;
  meeting_point: string;
  guide_tour_stops: { spot_id: string; position: number }[];
};

const COLUMNAS = "id, place_id, name, description, duration_minutes, price_usd, meeting_point, guide_tour_stops(spot_id, position)";

async function aRecorridos(filas: Fila[]): Promise<Recorrido[]> {
  const sitios = new Map((await getSitios().catch(() => [] as Sitio[])).map((s) => [s.id, s]));
  return filas
    .map((t) => ({
      id: t.id,
      lugarId: t.place_id,
      nombre: t.name,
      descripcion: t.description,
      duracion: t.duration_minutes,
      precio: t.price_usd == null ? null : Number(t.price_usd),
      encuentro: t.meeting_point,
      paradas: [...t.guide_tour_stops]
        .sort((a, b) => a.position - b.position)
        .map((p) => sitios.get(p.spot_id))
        .filter((s): s is Sitio => !!s),
    }))
    .filter((r) => r.paradas.length >= 2); // si se quitaron paradas de la guía y quedó una sola, no se muestra
}

/** Los recorridos publicados de un guía, para su ficha. */
export const getRecorridosDeGuia = cache(async (lugarId: string): Promise<Recorrido[]> => {
  const db = crearClientePublico();
  if (!db) return [];
  const { data, error } = await db.from("guide_tours").select(COLUMNAS).eq("place_id", lugarId).eq("status", "publicado").order("created_at").returns<Fila[]>();
  if (error) return [];
  return aRecorridos(data ?? []);
});

/** Un recorrido publicado, por su id. */
export const getRecorrido = cache(async (id: string): Promise<Recorrido | null> => {
  const db = crearClientePublico();
  if (!db) return null;
  const { data, error } = await db.from("guide_tours").select(COLUMNAS).eq("id", id).eq("status", "publicado").returns<Fila[]>().maybeSingle();
  if (error || !data) return null;
  return (await aRecorridos([data]))[0] ?? null;
});
