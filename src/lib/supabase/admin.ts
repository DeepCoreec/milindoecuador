import "server-only";
import { createClient } from "@supabase/supabase-js";
import { exigirConfigSupabase } from "./config";

// Cliente con la clave service_role: SALTA las reglas RLS.
// Solo para el servidor y solo donde ARQUITECTURA.md lo permite (insertar solicitudes de negocios
// después de verificar el captcha). `server-only` hace fallar la compilación si alguien lo importa
// desde código del navegador.
export function crearClienteAdmin() {
  const { url } = exigirConfigSupabase();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el servidor (.env.local o Vercel). Nunca la pongas en el código.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
