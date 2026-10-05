import { createClient } from "@supabase/supabase-js";
import { configSupabase } from "./config";

/**
 * Cliente sin sesión, solo para leer lo público (lugares publicados, fotos, reseñas visibles).
 * Usa la clave pública: lo que puede ver lo deciden las reglas RLS de la base.
 * No lee cookies, así las páginas del catálogo pueden guardarse en caché.
 */
export function crearClientePublico() {
  const config = configSupabase();
  if (!config) return null;
  return createClient(config.url, config.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
