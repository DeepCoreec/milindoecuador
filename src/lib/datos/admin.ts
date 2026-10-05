import { crearClienteServidor } from "@/lib/supabase/server";

/*
 * Lecturas del panel. Se hacen con la sesión del admin: las reglas RLS solo le muestran
 * solicitudes, borradores y reportes porque su perfil tiene rol admin.
 */

export async function getContadores() {
  const db = await crearClienteServidor();
  const contar = async (tabla: string, columna: string, valor: string | boolean) => {
    const { count } = await db.from(tabla).select("id", { count: "exact", head: true }).eq(columna, valor);
    return count ?? 0;
  };
  const [pendientes, publicados, reportes] = await Promise.all([
    contar("business_requests", "status", "pendiente"),
    contar("places", "status", "publicado"),
    contar("review_reports", "resolved", false),
  ]);
  return { pendientes, publicados, reportes };
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
  const db = await crearClienteServidor();
  const { data, error } = await db
    .from("business_requests")
    .select("id, business_name, sector, contact_name, whatsapp, description, status, admin_notes, created_at, categories(name)")
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
  const db = await crearClienteServidor();
  const { data, error } = await db
    .from("places")
    .select("id, slug, name, sector, status, is_featured, featured_until, is_verified, categories(slug, name), place_photos(count)")
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
    destacado: f.is_featured && (!f.featured_until || new Date(f.featured_until).getTime() > ahora),
    verificado: f.is_verified,
    fotos: f.place_photos[0]?.count ?? 0,
  }));
}

/** Una ficha completa para editarla. */
export async function getLugarAdmin(id: string) {
  const db = await crearClienteServidor();
  const { data } = await db
    .from("places")
    .select("id, slug, name, sector, description, short_fact, hours, address, price_level, whatsapp, status, categories(slug)")
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
        price_level: number | null;
        whatsapp: string | null;
        status: LugarAdmin["estado"];
        categories: { slug: string } | null;
      }[]
    >()
    .maybeSingle();
  return data;
}
