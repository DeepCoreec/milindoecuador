import { requireAdmin } from "@/lib/auth";
import { urlPublicaFoto } from "@/lib/fotos";
import { crearClienteServidor } from "@/lib/supabase/server";

/*
 * Lecturas del panel. Se hacen con la sesión del admin: las reglas RLS solo le muestran
 * solicitudes, borradores y reportes porque su perfil tiene rol admin. Además, cada función
 * vuelve a exigir el rol (Next arma el layout y la página en paralelo: no basta con el layout).
 */

export async function getContadores() {
  await requireAdmin();
  const db = await crearClienteServidor();
  const contar = async (
    tabla: string,
    columna: string,
    valor: string | boolean,
  ) => {
    const { count } = await db
      .from(tabla)
      .select("id", { count: "exact", head: true })
      .eq(columna, valor);
    return count ?? 0;
  };
  const [pendientes, publicados, reportes, cambios, lugaresReportados] =
    await Promise.all([
      contar("business_requests", "status", "pendiente"),
      contar("places", "status", "publicado"),
      contar("review_reports", "resolved", false),
      contar("place_changes", "reviewed", false),
      contar("place_reports", "resolved", false),
    ]);
  return { pendientes, publicados, reportes, cambios, lugaresReportados };
}

export type Solicitud = {
  id: string;
  negocio: string;
  categoria: string;
  sector: string | null;
  contacto: string;
  whatsapp: string;
  descripcion: string | null;
  estado: "pendiente" | "aprobada" | "rechazada";
  nota: string | null;
  fecha: string;
};

/** Solicitudes de negocios: las pendientes primero y después las más recientes. */
export async function getSolicitudes(): Promise<Solicitud[]> {
  await requireAdmin();
  const db = await crearClienteServidor();
  const { data, error } = await db
    .from("business_requests")
    .select(
      "id, business_name, sector, contact_name, whatsapp, description, status, admin_notes, created_at, categories(name)",
    )
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<
      {
        id: string;
        business_name: string;
        sector: string | null;
        contact_name: string;
        whatsapp: string;
        description: string | null;
        status: Solicitud["estado"];
        admin_notes: string | null;
        created_at: string;
        categories: { name: string } | null;
      }[]
    >();
  if (error) throw new Error("No se pudieron leer las solicitudes");
  const orden = { pendiente: 0, aprobada: 1, rechazada: 1 };
  return (data ?? [])
    .map((f) => ({
      id: f.id,
      negocio: f.business_name,
      categoria: f.categories?.name ?? "",
      sector: f.sector,
      contacto: f.contact_name,
      whatsapp: f.whatsapp,
      descripcion: f.description,
      estado: f.status,
      nota: f.admin_notes,
      fecha: f.created_at,
    }))
    .sort((a, b) => orden[a.estado] - orden[b.estado]);
}

export type LugarAdmin = {
  id: string;
  slug: string;
  nombre: string;
  categoria: string;
  categoriaNombre: string;
  sector: string;
  estado: "borrador" | "publicado" | "oculto";
  destacadoHasta: string | null;
  destacado: boolean;
  verificado: boolean;
  fotos: number;
};

/** Todos los lugares (también borradores y ocultos), los más recientes primero. */
export async function getLugaresAdmin(): Promise<LugarAdmin[]> {
  await requireAdmin();
  const db = await crearClienteServidor();
  const { data, error } = await db
    .from("places")
    .select(
      "id, slug, name, sector, status, is_featured, featured_until, is_verified, categories(slug, name), place_photos(count)",
    )
    .order("updated_at", { ascending: false })
    .limit(500)
    .returns<
      {
        id: string;
        slug: string;
        name: string;
        sector: string;
        status: LugarAdmin["estado"];
        is_featured: boolean;
        featured_until: string | null;
        is_verified: boolean;
        categories: { slug: string; name: string } | null;
        place_photos: { count: number }[];
      }[]
    >();
  if (error) throw new Error("No se pudieron leer los lugares");
  const ahora = Date.now();
  return (data ?? []).map((f) => ({
    id: f.id,
    slug: f.slug,
    nombre: f.name,
    categoria: f.categories?.slug ?? "",
    categoriaNombre: f.categories?.name ?? "",
    sector: f.sector,
    estado: f.status,
    destacadoHasta: f.featured_until,
    destacado:
      f.is_featured &&
      (!f.featured_until || new Date(f.featured_until).getTime() > ahora),
    verificado: f.is_verified,
    fotos: f.place_photos[0]?.count ?? 0,
  }));
}

/** Una ficha completa para editarla. */
export async function getLugarAdmin(id: string) {
  await requireAdmin();
  const db = await crearClienteServidor();
  const { data } = await db
    .from("places")
    .select(
      "id, slug, name, sector, description, short_fact, hours, address, latitude, longitude, price_level, whatsapp, status, is_featured, featured_until, is_verified, categories(slug)",
    )
    .eq("id", id)
    .returns<
      {
        id: string;
        slug: string;
        name: string;
        sector: string;
        description: string;
        short_fact: string | null;
        hours: string | null;
        address: string | null;
        latitude: number | null;
        longitude: number | null;
        price_level: number | null;
        whatsapp: string | null;
        status: LugarAdmin["estado"];
        is_featured: boolean;
        featured_until: string | null;
        is_verified: boolean;
        categories: { slug: string } | null;
      }[]
    >()
    .maybeSingle();
  return data;
}

export type FotoAdmin = { id: string; src: string; alt: string };

/** Fotos de un lugar en su orden (la primera es la principal). */
export async function getFotosAdmin(
  lugarId: string,
  urlSupabase: string,
): Promise<FotoAdmin[]> {
  await requireAdmin();
  const db = await crearClienteServidor();
  const { data } = await db
    .from("place_photos")
    .select("id, storage_path, alt_text")
    .eq("place_id", lugarId)
    .order("sort_order")
    .order("created_at");
  return (data ?? []).map((f) => ({
    id: f.id,
    src: urlPublicaFoto(urlSupabase, f.storage_path),
    alt: f.alt_text,
  }));
}

export type ResenaAdmin = {
  id: string;
  autor: string;
  estrellas: number;
  texto: string;
  fecha: string;
  visible: boolean;
  respuesta: string | null;
  lugar: { nombre: string; id: string } | null;
  motivos: string[];
};

type FilaResenaAdmin = {
  id: string;
  stars: number;
  text: string;
  status: "visible" | "oculta";
  owner_reply: string | null;
  created_at: string;
  profiles: { display_name: string } | null;
  places: { id: string; name: string } | null;
};

const COLUMNAS_RESENA =
  "id, stars, text, status, owner_reply, created_at, profiles(display_name), places(id, name)";

const aResenaAdmin = (
  r: FilaResenaAdmin,
  motivos: string[] = [],
): ResenaAdmin => ({
  id: r.id,
  autor: r.profiles?.display_name ?? "Visitante",
  estrellas: r.stars,
  texto: r.text,
  fecha: r.created_at,
  visible: r.status === "visible",
  respuesta: r.owner_reply,
  lugar: r.places ? { id: r.places.id, nombre: r.places.name } : null,
  motivos,
});

/** Reseñas con reportes sin resolver, las más reportadas primero. */
export async function getReportadas(): Promise<ResenaAdmin[]> {
  await requireAdmin();
  const db = await crearClienteServidor();
  const { data, error } = await db
    .from("review_reports")
    .select(`reason, reviews(${COLUMNAS_RESENA})`)
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<{ reason: string; reviews: FilaResenaAdmin | null }[]>();
  if (error) throw new Error("No se pudieron leer los reportes");
  const grupos = new Map<
    string,
    { fila: FilaResenaAdmin; motivos: string[] }
  >();
  for (const r of data ?? []) {
    if (!r.reviews) continue;
    const g = grupos.get(r.reviews.id) ?? { fila: r.reviews, motivos: [] };
    g.motivos.push(r.reason);
    grupos.set(r.reviews.id, g);
  }
  return [...grupos.values()]
    .map((g) => aResenaAdmin(g.fila, g.motivos))
    .sort((a, b) => b.motivos.length - a.motivos.length);
}

/** Todas las reseñas de un lugar (también las ocultas), para responder o moderar desde su ficha. */
export async function getResenasDeLugar(
  lugarId: string,
): Promise<ResenaAdmin[]> {
  await requireAdmin();
  const db = await crearClienteServidor();
  const { data } = await db
    .from("reviews")
    .select(COLUMNAS_RESENA)
    .eq("place_id", lugarId)
    .order("created_at", { ascending: false })
    .returns<FilaResenaAdmin[]>();
  return (data ?? []).map((r) => aResenaAdmin(r));
}

/** Lista de palabras prohibidas de la moderación automática (migración 0006). */
export async function getPalabras(): Promise<string[]> {
  await requireAdmin();
  const db = await crearClienteServidor();
  const { data } = await db.from("banned_words").select("word").order("word");
  return (data ?? []).map((p) => p.word as string);
}

const rutaFicha = (l: { slug: string; categories: { slug: string } | null }) =>
  `/guayaquil/${l.categories?.slug ?? ""}/${l.slug}`;

export type Cambio = {
  id: number;
  tipo: string;
  detalle: string | null;
  revisado: boolean;
  fecha: string;
  autor: string;
  lugar: { id: string; nombre: string; estado: string; ruta: string } | null;
};

/** "Cambios recientes" de los dueños (versión 2, paso 9.6): los sin revisar primero. */
export async function getCambios(): Promise<Cambio[]> {
  await requireAdmin();
  const db = await crearClienteServidor();
  const { data } = await db
    .from("place_changes")
    .select(
      "id, kind, detail, reviewed, created_at, places(id, name, slug, status, categories(slug)), profiles(display_name)",
    )
    .order("reviewed")
    .order("created_at", { ascending: false })
    .limit(150)
    .returns<
      {
        id: number;
        kind: string;
        detail: string | null;
        reviewed: boolean;
        created_at: string;
        places: {
          id: string;
          name: string;
          slug: string;
          status: string;
          categories: { slug: string } | null;
        } | null;
        profiles: { display_name: string } | null;
      }[]
    >();
  return (data ?? []).map((c) => ({
    id: c.id,
    tipo: c.kind,
    detalle: c.detail,
    revisado: c.reviewed,
    fecha: c.created_at,
    autor:
      c.profiles?.display_name ??
      (c.kind === "oculta-por-reportes" ? "La guía" : "Cuenta borrada"),
    lugar: c.places
      ? {
          id: c.places.id,
          nombre: c.places.name,
          estado: c.places.status,
          ruta: rutaFicha(c.places),
        }
      : null,
  }));
}

export type LugarReportado = {
  id: string;
  nombre: string;
  estado: string;
  ruta: string;
  motivos: string[];
};

/** Lugares con reportes sin resolver (versión 2, paso 9.7). */
export async function getLugaresReportados(): Promise<LugarReportado[]> {
  await requireAdmin();
  const db = await crearClienteServidor();
  const { data } = await db
    .from("place_reports")
    .select(
      "reason, created_at, places(id, name, slug, status, categories(slug))",
    )
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .returns<
      {
        reason: string;
        created_at: string;
        places: {
          id: string;
          name: string;
          slug: string;
          status: string;
          categories: { slug: string } | null;
        } | null;
      }[]
    >();
  const porLugar = new Map<string, LugarReportado>();
  for (const r of data ?? []) {
    if (!r.places) continue;
    const l = porLugar.get(r.places.id) ?? {
      id: r.places.id,
      nombre: r.places.name,
      estado: r.places.status,
      ruta: rutaFicha(r.places),
      motivos: [],
    };
    l.motivos.push(r.reason);
    porLugar.set(l.id, l);
  }
  return [...porLugar.values()];
}
