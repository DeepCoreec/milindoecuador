import "server-only";
import { aSlug, slugLibre } from "@/lib/slug";
import { crearClienteAdmin } from "@/lib/supabase/admin";

export const DESCRIPCION_PENDIENTE = "Descripción pendiente: escríbela desde «Mi negocio» o desde el panel antes de publicar.";

type Solicitud = {
  business_name: string;
  category_id: string;
  city_id: string;
  sector: string | null;
  whatsapp: string;
  description: string | null;
  user_id: string | null;
};

/**
 * Crea la ficha de un negocio como BORRADOR (no se ve en público) a partir de una solicitud.
 * El dueño solo lo puede poner el servidor (migración 0005), por eso se usa admin.ts: quien llame debe haber
 * comprobado antes quién es (el admin, o la cuenta que registra su propio negocio).
 */
export async function crearFichaBorrador(s: Solicitud): Promise<{ id: string } | null> {
  const db = crearClienteAdmin();
  const base = aSlug(s.business_name) || "lugar";
  const { data: parecidos } = await db.from("places").select("slug").eq("city_id", s.city_id).like("slug", `${base}%`);
  const slug = slugLibre(base, new Set((parecidos ?? []).map((p) => p.slug)));
  const descripcion = s.description && s.description.trim().length >= 20 ? s.description.trim() : DESCRIPCION_PENDIENTE;
  const { data, error } = await db
    .from("places")
    .insert({
      owner_id: s.user_id ?? null,
      city_id: s.city_id,
      category_id: s.category_id,
      slug,
      name: s.business_name,
      sector: s.sector && s.sector.trim().length >= 2 ? s.sector.trim() : "Por definir",
      description: descripcion,
      whatsapp: s.whatsapp,
      status: "borrador",
    })
    .select("id")
    .single();
  return error || !data ? null : { id: data.id };
}
