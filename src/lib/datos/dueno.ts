import "server-only";
import { notFound } from "next/navigation";
import { requireUsuario, type Usuario } from "@/lib/auth";
import { urlPublicaFoto } from "@/lib/fotos";
import { leerHorario, type Horario } from "@/lib/horario";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { exigirConfigSupabase } from "@/lib/supabase/config";

/*
 * Lecturas de "Mi negocio" (versión 2, fase 9).
 * El dueño no tiene permisos en la base (migración 0005): se lee con admin.ts, pero SIEMPRE
 * filtrando por la cuenta de la sesión verificada en el servidor (requireUsuario). Nunca por un id que
 * mande el navegador sin comprobar que es suyo.
 */

export type EstadoFicha = "borrador" | "publicado" | "oculto";

export type MiNegocioResumen = {
  id: string;
  nombre: string;
  estado: EstadoFicha;
  ruta: string;
  fotos: number;
};

export async function getMisNegocios(usuario: Usuario): Promise<MiNegocioResumen[]> {
  const { data } = await crearClienteAdmin()
    .from("places")
    .select("id, slug, name, status, categories(slug), cities(slug), place_photos(count)")
    .eq("owner_id", usuario.id)
    .order("name")
    .returns<
      {
        id: string;
        slug: string;
        name: string;
        status: EstadoFicha;
        categories: { slug: string } | null;
        cities: { slug: string } | null;
        place_photos: { count: number }[];
      }[]
    >();
  return (data ?? []).map((l) => ({
    id: l.id,
    nombre: l.name,
    estado: l.status,
    ruta: `/${l.cities?.slug ?? "guayaquil"}/${l.categories?.slug ?? ""}/${l.slug}`,
    fotos: l.place_photos[0]?.count ?? 0,
  }));
}

/**
 * Exige que la cuenta de la sesión sea dueña del lugar. Si no lo es (o el id no existe), responde
 * "no existe": no se revela qué negocios tienen dueño.
 */
export async function requireDueno(lugarId: string, siguiente = "/mi-negocio"): Promise<Usuario> {
  const usuario = await requireUsuario(siguiente);
  if (!/^[0-9a-f-]{36}$/.test(lugarId)) notFound();
  const { data } = await crearClienteAdmin().from("places").select("id").eq("id", lugarId).eq("owner_id", usuario.id).maybeSingle();
  if (!data) notFound();
  return usuario;
}

export type MiNegocio = {
  id: string;
  nombre: string;
  categoria: string;
  ruta: string;
  estado: EstadoFicha;
  sector: string;
  descripcion: string;
  dato: string | null;
  horario: string | null;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  horarioDias: Horario | null;
  precio: number | null;
  whatsapp: string | null;
  fotos: { id: string; src: string; alt: string }[];
  resenas: {
    id: string;
    autor: string;
    estrellas: number;
    texto: string;
    fecha: string;
    respuesta: string | null;
    visible: boolean;
  }[];
};

/** La ficha completa de un negocio de la cuenta. Llamar después de requireDueno. */
export async function getMiNegocio(usuario: Usuario, lugarId: string): Promise<MiNegocio> {
  const db = crearClienteAdmin();
  const { data: l } = await db
    .from("places")
    .select(
      "id, slug, name, status, sector, description, short_fact, hours, address, latitude, longitude, opening_hours, price_level, whatsapp, categories(slug, name), cities(slug)",
    )
    .eq("id", lugarId)
    .eq("owner_id", usuario.id)
    .returns<
      {
        id: string;
        slug: string;
        name: string;
        status: EstadoFicha;
        sector: string;
        description: string;
        short_fact: string | null;
        hours: string | null;
        address: string | null;
        latitude: number | string | null;
        longitude: number | string | null;
        opening_hours: unknown;
        price_level: number | null;
        whatsapp: string | null;
        categories: { slug: string; name: string } | null;
        cities: { slug: string } | null;
      }[]
    >()
    .maybeSingle();
  if (!l) notFound();

  const [fotos, resenas] = await Promise.all([
    db.from("place_photos").select("id, storage_path, alt_text").eq("place_id", l.id).order("sort_order").order("created_at"),
    db
      .from("reviews")
      .select("id, stars, text, created_at, owner_reply, status, profiles(display_name)")
      .eq("place_id", l.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<
        {
          id: string;
          stars: number;
          text: string;
          created_at: string;
          owner_reply: string | null;
          status: string;
          profiles: { display_name: string } | null;
        }[]
      >(),
  ]);
  const url = exigirConfigSupabase().url;
  return {
    id: l.id,
    nombre: l.name,
    categoria: l.categories?.name ?? "",
    ruta: `/${l.cities?.slug ?? "guayaquil"}/${l.categories?.slug ?? ""}/${l.slug}`,
    estado: l.status,
    sector: l.sector,
    descripcion: l.description,
    dato: l.short_fact,
    horario: l.hours,
    direccion: l.address,
    latitud: l.latitude == null ? null : Number(l.latitude),
    longitud: l.longitude == null ? null : Number(l.longitude),
    horarioDias: leerHorario(l.opening_hours),
    precio: l.price_level,
    whatsapp: l.whatsapp,
    fotos: (fotos.data ?? []).map((f) => ({
      id: f.id as string,
      src: urlPublicaFoto(url, f.storage_path as string),
      alt: f.alt_text as string,
    })),
    resenas: (resenas.data ?? []).map((r) => ({
      id: r.id,
      autor: r.profiles?.display_name ?? "Visitante",
      estrellas: r.stars,
      texto: r.text,
      fecha: r.created_at,
      respuesta: r.owner_reply,
      visible: r.status === "visible",
    })),
  };
}

export type Totales = { vistas: number; whatsapp: number; ruta: number };

/** Estadísticas de un negocio de la cuenta (paso 10.2): últimos 7 y 30 días. Llamar después de requireDueno. */
export async function getEstadisticas(usuario: Usuario, lugarId: string): Promise<{ semana: Totales; mes: Totales }> {
  const db = crearClienteAdmin();
  const { data: propio } = await db.from("places").select("id").eq("id", lugarId).eq("owner_id", usuario.id).maybeSingle();
  const vacio = () => ({ vistas: 0, whatsapp: 0, ruta: 0 });
  if (!propio) return { semana: vacio(), mes: vacio() };
  const dia = (atras: number) => new Date(Date.now() - 5 * 3600_000 - atras * 86_400_000).toISOString().slice(0, 10); // hoy en Ecuador, menos N días
  const { data } = await db.from("place_stats").select("day, views, whatsapp, route").eq("place_id", lugarId).gt("day", dia(30));
  const semana = vacio();
  const mes = vacio();
  for (const f of data ?? []) {
    for (const t of f.day > dia(7) ? [semana, mes] : [mes]) {
      t.vistas += f.views;
      t.whatsapp += f.whatsapp;
      t.ruta += f.route;
    }
  }
  return { semana, mes };
}
