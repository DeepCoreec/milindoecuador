import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { configSupabase } from "@/lib/supabase/config";
import { COOKIE_CON_SESION, opcionesCookieSesion } from "@/lib/supabase/cookies";

// Se ejecuta antes de cada página: refresca la sesión de Supabase y devuelve las cookies nuevas.
// No decide permisos: eso lo hacen las Server Actions y RLS en la base.
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const config = configSupabase();
  if (!config) return respuesta; // todavía sin Supabase (paso 1.3): la página funciona sin sesión

  const supabase = createServerClient(config.url, config.anonKey, {
    cookieOptions: opcionesCookieSesion,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesNuevas, cabeceras) {
        cookiesNuevas.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        cookiesNuevas.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
        Object.entries(cabeceras ?? {}).forEach(([clave, valor]) => respuesta.headers.set(clave, valor));
      },
    },
  });

  // Valida el token con Supabase y lo renueva si venció. No poner código entre crear el cliente y esta línea.
  const { data } = await supabase.auth.getClaims();

  // Aviso sin secreto para los menús ("Mi cuenta"): la sesión de verdad está en cookies httpOnly
  const conSesion = !!data?.claims?.sub;
  if (conSesion && request.cookies.get(COOKIE_CON_SESION)?.value !== "1")
    respuesta.cookies.set(COOKIE_CON_SESION, "1", { sameSite: "lax", secure: opcionesCookieSesion.secure, path: "/", maxAge: 60 * 60 * 24 * 400 });
  if (!conSesion && request.cookies.has(COOKIE_CON_SESION)) respuesta.cookies.delete(COOKIE_CON_SESION);

  return respuesta;
}

export const config = {
  // Todo menos archivos estáticos e imágenes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)"],
};
