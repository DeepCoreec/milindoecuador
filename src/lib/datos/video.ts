import "server-only";
import { urlPublicaVideo } from "@/lib/fotos";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { exigirConfigSupabase } from "@/lib/supabase/config";

/** El video de un negocio tal como lo muestran el reproductor y el panel. */
export type VideoLugar = {
  src: string;
  portada: string | null;
  duracion: number;
  oculto: boolean;
  /** Reportes sin resolver (solo para el dueño y el admin). */
  reportes: number;
};

/**
 * El video de un lugar, también si está oculto, para "Mi negocio" y el panel (versión 3).
 * Se lee con admin.ts: llamar SOLO después de requireDueno o requireAdmin.
 */
export async function getVideoPrivado(lugar: string): Promise<VideoLugar | null> {
  const db = crearClienteAdmin();
  const [{ data }, { count }] = await Promise.all([
    db.from("place_videos").select("storage_path, poster_path, duration_seconds, hidden").eq("place_id", lugar).maybeSingle(),
    db.from("place_reports").select("id", { count: "exact", head: true }).eq("place_id", lugar).eq("target", "video").eq("resolved", false),
  ]);
  if (!data) return null;
  const url = exigirConfigSupabase().url;
  return {
    src: urlPublicaVideo(url, data.storage_path as string),
    portada: data.poster_path ? urlPublicaVideo(url, data.poster_path as string) : null,
    duracion: Number(data.duration_seconds),
    oculto: data.hidden as boolean,
    reportes: count ?? 0,
  };
}
