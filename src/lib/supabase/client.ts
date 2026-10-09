import { createClient } from "@supabase/supabase-js";
import { exigirConfigSupabase } from "./config";

/**
 * Cliente del navegador SOLO para subir archivos con un permiso firmado que dio el servidor (fotos y videos).
 * No usa ni guarda sesión (versión 3, paso 13.3: la sesión vive en cookies httpOnly que la página no lee):
 * el permiso firmado ya dice qué archivo se puede subir y dónde.
 */
export function crearClienteSubidas() {
  const { url, anonKey } = exigirConfigSupabase();
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
