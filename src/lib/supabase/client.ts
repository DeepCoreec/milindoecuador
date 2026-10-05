import { createBrowserClient } from "@supabase/ssr";
import { exigirConfigSupabase } from "./config";

// Cliente para componentes del navegador ('use client'). Solo usa la clave pública.
export function crearClienteNavegador() {
  const { url, anonKey } = exigirConfigSupabase();
  return createBrowserClient(url, anonKey);
}
