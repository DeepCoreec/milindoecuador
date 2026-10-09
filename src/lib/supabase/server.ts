import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { exigirConfigSupabase } from "./config";
import { COOKIE_CON_SESION, opcionesCookieSesion } from "./cookies";

// Cliente para componentes de servidor y Server Actions. Usa la sesión del usuario (sus cookies),
// así que la base aplica las reglas RLS de ese usuario.
export async function crearClienteServidor() {
  const { url, anonKey } = exigirConfigSupabase();
  const almacen = await cookies();

  return createServerClient(url, anonKey, {
    cookieOptions: opcionesCookieSesion,
    cookies: {
      getAll() {
        return almacen.getAll();
      },
      setAll(cookiesNuevas) {
        try {
          cookiesNuevas.forEach(({ name, value, options }) => almacen.set(name, value, options));
          // Al entrar o salir (Server Actions), el aviso sin secreto para los menús cambia en la misma respuesta
          const token = cookiesNuevas.filter((c) => c.name.includes("auth-token"));
          if (token.some((c) => c.value)) almacen.set(COOKIE_CON_SESION, "1", { sameSite: "lax", secure: opcionesCookieSesion.secure, path: "/", maxAge: 60 * 60 * 24 * 400 });
          else if (token.length) almacen.delete(COOKIE_CON_SESION);
        } catch {
          // Llamado desde un componente de servidor: no puede escribir cookies.
          // No pasa nada porque src/proxy.ts ya refresca la sesión en cada visita.
        }
      },
    },
  });
}
