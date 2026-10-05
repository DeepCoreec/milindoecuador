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
