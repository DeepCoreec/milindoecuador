import type { SupabaseClient } from "@supabase/supabase-js";
import { datosDe, TEXTO_CATEGORIA } from "./textos";
import type { Categoria, Ciudad, LugarDetalle, LugarResumen } from "./tipos";

/*
 * Lectura desde Supabase. Solo consultas de lectura con la clave pública:
 * las reglas RLS ya esconden borradores, lugares ocultos y reseñas ocultas.
 * Cada función devuelve la misma forma que los datos de muestra.
 */

type FilaLugar = {
  id: string;
  slug: string;
  name: string;
  sector: string;
  price_level: number | null;
  short_fact: string | null;
  is_featured: boolean;
  featured_until: string | null;
  is_verified: boolean;
  categories: { slug: string } | null;
};

type FilaDetalle = FilaLugar & {
  description: string;
  hours: string | null;
  address: string | null;
  whatsapp: string | null;
  place_photos: { storage_path: string; alt_text: string; sort_order: number }[];
};

type FilaResena = {
  id: string;
  user_id: string;
  stars: number;
  text: string;
  owner_reply: string | null;
  created_at: string;
  profiles: { display_name: string } | null;
};

const COLUMNAS = "id, slug, name, sector, price_level, short_fact, is_featured, featured_until, is_verified, categories!inner(slug)";

function fallo(que: string, error: { message: string }): never {
  throw new Error(`No se pudo leer ${que} desde la base: ${error.message}`);
}

/** El destacado vale mientras no haya vencido su fecha. */
function destacadoVigente(f: FilaLugar, ahora: number) {
  return f.is_featured && (!f.featured_until || new Date(f.featured_until).getTime() > ahora);
}

function aResumen(f: FilaLugar, nota: Map<string, { promedio: number; cantidad: number }>, ahora: number): LugarResumen {
  const categoria = f.categories?.slug ?? "";
  const n = nota.get(f.id);
  const precio = f.price_level === 1 || f.price_level === 2 || f.price_level === 3 ? f.price_level : null;
  return {
    slug: f.slug,
    categoria,
    nombre: f.name,
    sector: f.sector,
    datos: datosDe(categoria, f.sector),
    promedio: n ? n.promedio : null,
    cantidad: n ? n.cantidad : 0,
    precio,
    destacado: destacadoVigente(f, ahora),
    verificado: f.is_verified,
    extra: f.short_fact ?? undefined,
    ejemplo: false,
  };
}

async function notas(db: SupabaseClient, ids: string[]) {
  const mapa = new Map<string, { promedio: number; cantidad: number }>();
  if (ids.length === 0) return mapa;
  const { data, error } = await db.from("place_ratings").select("place_id, average_stars, review_count").in("place_id", ids);
  if (error) fallo("las calificaciones", error);
  for (const r of data ?? []) mapa.set(r.place_id, { promedio: Number(r.average_stars), cantidad: r.review_count });
  return mapa;
}

export async function leerCiudades(db: SupabaseClient): Promise<Ciudad[]> {
  const { data, error } = await db.from("cities").select("slug, name").eq("active", true).order("name");
  if (error) fallo("las ciudades", error);
  return (data ?? []).map((c) => ({ slug: c.slug, nombre: c.name }));
}

export async function leerCategorias(db: SupabaseClient): Promise<Categoria[]> {
  const { data, error } = await db.from("categories").select("slug, name, is_main").order("sort_order");
  if (error) fallo("las categorías", error);
  return (data ?? []).map((c) => ({
    slug: c.slug,
    nombre: c.name,
    principal: c.is_main,
    nombreCorto: TEXTO_CATEGORIA[c.slug]?.nombreCorto,
    bajada: TEXTO_CATEGORIA[c.slug]?.bajada ?? `Lugares de ${c.name.toLowerCase()} recomendados por la gente.`,
  }));
}

/** Todos los lugares publicados de una ciudad, con su calificación. */
export async function leerLugaresDeCiudad(db: SupabaseClient, ciudad: string): Promise<LugarResumen[]> {
  const { data, error } = await db
    .from("places")
    .select(`${COLUMNAS}, cities!inner(slug)`)
    .eq("cities.slug", ciudad)
    .eq("status", "publicado")
    .returns<FilaLugar[]>();
  if (error) fallo("los lugares", error);
  const filas = data ?? [];
  const nota = await notas(db, filas.map((f) => f.id));
  const ahora = Date.now();
  return filas.map((f) => aResumen(f, nota, ahora));
}

/** Un lugar con sus fotos y sus últimas reseñas visibles. */
export async function leerLugar(db: SupabaseClient, urlBase: string, ciudad: string, categoria: string, slug: string): Promise<LugarDetalle | null> {
  const { data, error } = await db
    .from("places")
    .select(`${COLUMNAS}, description, hours, address, whatsapp, place_photos(storage_path, alt_text, sort_order), cities!inner(slug)`)
    .eq("cities.slug", ciudad)
    .eq("categories.slug", categoria)
    .eq("slug", slug)
    .eq("status", "publicado")
    .returns<FilaDetalle[]>()
    .maybeSingle();
  if (error) fallo("el lugar", error);
  if (!data) return null;

  const [nota, resenas] = await Promise.all([
    notas(db, [data.id]),
    db
      .from("reviews")
      .select("id, user_id, stars, text, owner_reply, created_at, profiles(display_name)")
      .eq("place_id", data.id)
      .eq("status", "visible")
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<FilaResena[]>(),
  ]);
  if (resenas.error) fallo("las reseñas", resenas.error);

  const fotos = [...data.place_photos]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((f) => ({
      src: `${urlBase}/storage/v1/object/public/fotos-lugares/${f.storage_path.split("/").map(encodeURIComponent).join("/")}`,
      alt: f.alt_text,
    }));

  return {
    ...aResumen(data, nota, Date.now()),
    id: data.id,
    descripcion: data.description,
    horario: data.hours,
    direccion: data.address,
    whatsapp: data.whatsapp,
    fotos,
    resenas: (resenas.data ?? []).map((r) => ({
      id: r.id,
      autorId: r.user_id,
      autor: r.profiles?.display_name ?? "Visitante",
      fecha: r.created_at,
      estrellas: Math.min(5, Math.max(1, r.stars)) as 1 | 2 | 3 | 4 | 5,
      texto: r.text,
      respuesta: r.owner_reply ?? undefined,
    })),
  };
}
