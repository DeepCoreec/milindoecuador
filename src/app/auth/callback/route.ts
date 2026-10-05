import { NextResponse, type NextRequest } from "next/server";
import { configSupabase } from "@/lib/supabase/config";
import { crearClienteServidor } from "@/lib/supabase/server";
import { rutaSegura } from "@/lib/validacion/sesion";

/**
 * Vuelta del enlace del correo o de Google. Cambia el código de un solo uso por la sesión
 * (queda en cookies seguras) y lleva a la persona a donde iba. Solo a rutas internas.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const siguiente = rutaSegura(searchParams.get("siguiente"));
  const codigo = searchParams.get("code");

  if (codigo && configSupabase()) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(new URL(siguiente, origin));
  }
  return NextResponse.redirect(new URL(`/entrar?error=enlace&siguiente=${encodeURIComponent(siguiente)}`, origin));
}
