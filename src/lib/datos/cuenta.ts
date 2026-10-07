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

/** La reseña de la persona en un lugar, para llenar el formulario al editar. */
export async function getMiResena(idLugar: string, idUsuario: string) {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("reviews").select("stars, text, status").eq("place_id", idLugar).eq("user_id", idUsuario).maybeSingle();
  return data ? { estrellas: data.stars as number, texto: data.text as string, visible: data.status === "visible" } : null;
}

/** ¿La persona guardó este lugar? (versión 2, paso 10.3) La base solo le muestra sus favoritos. */
export async function esFavorito(lugarId: string): Promise<boolean> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("favorites").select("place_id").eq("place_id", lugarId).maybeSingle();
  return !!data;
}

export type Favorito = { nombre: string; ruta: string; datos: string };

/** Los lugares guardados de la persona, los más recientes primero (solo los que siguen publicados). */
export async function getMisFavoritos(): Promise<Favorito[]> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("favorites")
    .select("created_at, places(name, slug, sector, categories(slug, name), cities(slug))")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<{ places: { name: string; slug: string; sector: string; categories: { slug: string; name: string } | null; cities: { slug: string } | null } | null }[]>();
  return (data ?? [])
    .filter((f) => f.places)
    .map(({ places: l }) => ({
      nombre: l!.name,
      ruta: `/${l!.cities?.slug ?? "guayaquil"}/${l!.categories?.slug ?? ""}/${l!.slug}`,
      datos: `${l!.categories?.name ?? ""} · ${l!.sector}`,
    }));
}
