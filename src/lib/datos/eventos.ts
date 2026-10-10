import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TipoEvento } from "@/lib/eventos";
import { urlPublicaAfiche } from "@/lib/fotos";
import { configSupabase } from "@/lib/supabase/config";
import { crearClientePublico } from "@/lib/supabase/publico";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/*
 * Lectura de eventos (versión 5, fase 22). Lo público pasa por las reglas RLS: solo publicados y vigentes.
 */

export type Evento = {
  id: string;
  slug: string;
  titulo: string;
  tipo: TipoEvento;
  descripcion: string;
  inicio: string;
  fin: string;
  enLinea: boolean;
  lugar: string | null;
  direccion: string | null;
  ubicacion: { lat: number; lng: number } | null;
  precio: number | null;
  organizador: string;
  whatsapp: string | null;
  web: string | null;
  entradas: string | null;
  edad: number | null;
  afiche: { src: string; alt: string; camino: string } | null;
  estado: "publicado" | "oculto";
};

const COLUMNAS =
  "id, slug, title, kind, description, starts_at, ends_at, online, venue, address, latitude, longitude, price, organizer, whatsapp, website, tickets_url, min_age, poster_path, poster_alt, status";

type Fila = {
  id: string;
  slug: string;
  title: string;
  kind: TipoEvento;
  description: string;
  starts_at: string;
  ends_at: string;
  online: boolean;
  venue: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  price: number | string | null;
  organizer: string;
  whatsapp: string | null;
  website: string | null;
  tickets_url: string | null;
  min_age: number | null;
  poster_path: string | null;
  poster_alt: string | null;
  status: "publicado" | "oculto";
};

export function aEvento(f: Fila, urlSupabase: string): Evento {
  return {
    id: f.id,
    slug: f.slug,
    titulo: f.title,
    tipo: f.kind,
    descripcion: f.description,
    inicio: f.starts_at,
    fin: f.ends_at,
    enLinea: f.online,
    lugar: f.venue,
    direccion: f.address,
    ubicacion: f.latitude != null && f.longitude != null ? { lat: f.latitude, lng: f.longitude } : null,
    precio: f.price == null ? null : Number(f.price),
    organizador: f.organizer,
    whatsapp: f.whatsapp,
    web: f.website,
    entradas: f.tickets_url,
    edad: f.min_age,
    afiche: f.poster_path && f.poster_alt ? { src: urlPublicaAfiche(urlSupabase, f.poster_path), alt: f.poster_alt, camino: f.poster_path } : null,
    estado: f.status,
  };
}

async function leer(db: SupabaseClient, filtro: { slug?: string; usuario?: string } = {}): Promise<Evento[]> {
  const config = configSupabase();
  if (!config) return [];
  let q = db.from("city_events").select(`${COLUMNAS}, cities!inner(slug)`).eq("cities.slug", "guayaquil");
  if (filtro.slug) q = q.eq("slug", filtro.slug);
  if (filtro.usuario) q = q.eq("user_id", filtro.usuario);
  const { data, error } = await q
    .order("starts_at")
    .limit(200)
    .returns<Fila[]>();
  if (error) throw new Error(`No se pudieron leer los eventos: ${error.message}`);
  return (data ?? []).map((f) => aEvento(f, config.url));
}

/** Eventos publicados y vigentes de Guayaquil, en orden de inicio. */
export const getEventos = cache(async (): Promise<Evento[]> => {
  const db = crearClientePublico();
  return db ? leer(db) : [];
});

export const getEvento = cache(async (slug: string): Promise<Evento | null> => {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const db = crearClientePublico();
  if (!db) return null;
  return (await leer(db, { slug }))[0] ?? null;
});

/** Los eventos de una cuenta (también los ocultos). El id sale de la sesión, nunca del navegador. */
export async function getMisEventos(usuario: string): Promise<Evento[]> {
  return leer(crearClienteAdmin(), { usuario });
}
