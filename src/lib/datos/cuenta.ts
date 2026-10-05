import { crearClienteServidor } from "@/lib/supabase/server";

export type MiResena = {
  id: string;
  estrellas: number;
  texto: string;
  fecha: string;
  visible: boolean;
  lugar: { nombre: string; ruta: string } | null;
};

type Fila = {
  id: string;
  stars: number;
  text: string;
  status: "visible" | "oculta";
  created_at: string;
  places: { name: string; slug: string; categories: { slug: string } | null; cities: { slug: string } | null } | null;
};

/** Perfil y reseñas de la persona con sesión. Se lee con su sesión: la base solo le muestra lo suyo. */
export async function getMiCuenta(idUsuario: string) {
  const supabase = await crearClienteServidor();
  const [perfil, resenas] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", idUsuario).maybeSingle(),
    supabase
      .from("reviews")
      .select("id, stars, text, status, created_at, places(name, slug, categories(slug), cities(slug))")
      .eq("user_id", idUsuario)
      .order("created_at", { ascending: false })
      .returns<Fila[]>(),
  ]);
  if (perfil.error || resenas.error) throw new Error("No se pudo leer tu cuenta");
  return {
    nombre: perfil.data?.display_name ?? "",
    resenas: (resenas.data ?? []).map(
      (r): MiResena => ({
        id: r.id,
        estrellas: r.stars,
        texto: r.text,
        fecha: r.created_at,
        visible: r.status === "visible",
        lugar:
          r.places?.categories && r.places.cities
            ? { nombre: r.places.name, ruta: `/${r.places.cities.slug}/${r.places.categories.slug}/${r.places.slug}` }
            : null,
      }),
    ),
  };
}
