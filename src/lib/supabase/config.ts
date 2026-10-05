// Variables públicas de Supabase. Son seguras en el navegador porque la base las protege con RLS.
// Mientras no exista el proyecto de Supabase (paso 1.3), devuelve null y la página funciona sin sesión.
export function configSupabase(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function exigirConfigSupabase(): { url: string; anonKey: string } {
  const config = configSupabase();
  if (!config) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY. Cópialas desde Supabase → Project Settings → API a .env.local (y a Vercel).",
    );
  }
  return config;
}
