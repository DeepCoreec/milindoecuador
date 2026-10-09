import "server-only";
import { createHmac } from "node:crypto";
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

/**
 * Una clave para un uso puntual del servidor (por ejemplo, la huella del contador de visitas), DERIVADA de la clave
 * de servicio con HMAC y una etiqueta: la clave de servicio no sale de este archivo y cada uso tiene su propia clave
 * (auditoría 2026-10-09). Si existe HUELLA_SECRETO en el entorno, se usa esa en su lugar.
 */
export function claveDerivada(etiqueta: string): Buffer {
  const propia = process.env.HUELLA_SECRETO;
  const base = propia || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.");
  return createHmac("sha256", base).update(`milindoecuador:${etiqueta}`).digest();
}
