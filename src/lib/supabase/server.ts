import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { exigirConfigSupabase } from "./config";

// Cliente para componentes de servidor y Server Actions. Usa la sesión del usuario (sus cookies),
// así que la base aplica las reglas RLS de ese usuario.
export async function crearClienteServidor() {
  const { url, anonKey } = exigirConfigSupabase();
  const almacen = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return almacen.getAll();
      },
      setAll(cookiesNuevas) {
        try {
          cookiesNuevas.forEach(({ name, value, options }) => almacen.set(name, value, options));
        } catch {
          // Llamado desde un componente de servidor: no puede escribir cookies.
          // No pasa nada porque src/proxy.ts ya refresca la sesión en cada visita.
        }
      },
    },
  });
}
