import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BrowserContext } from "@playwright/test";

/*
 * Ayudas de las pruebas de punta a punta: preparar datos, iniciar sesión sin correo y limpiar.
 * Usan la clave de servicio SOLO aquí, en la máquina que corre las pruebas.
 */

function variable(nombre: string): string {
  const v = process.env[nombre];
  if (!v) throw new Error(`Falta ${nombre} para las pruebas de punta a punta (ver tests/e2e/playwright.config.ts)`);
  return v;
}

export const URL_SUPABASE = () => variable("NEXT_PUBLIC_SUPABASE_URL");
export const marca = `E2E ${Date.now().toString(36)}`;

let cliente: SupabaseClient | null = null;
export function admin(): SupabaseClient {
  cliente ??= createClient(URL_SUPABASE(), variable("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
  return cliente;
}

const creados: string[] = [];

/** Crea una cuenta ya confirmada. Con `esAdmin`, le da el rol de admin. */
export async function crearUsuario(apodo: string, esAdmin = false) {
  const correo = `${apodo}.${Date.now().toString(36)}@e2e.milindoecuador.test`;
  const { data, error } = await admin().auth.admin.createUser({ email: correo, email_confirm: true });
  if (error || !data.user) throw new Error(`No se pudo crear el usuario de prueba: ${error?.message}`);
  creados.push(data.user.id);
  if (esAdmin) {
    const { error: e } = await admin().from("profiles").update({ role: "admin" }).eq("id", data.user.id);
    if (e) throw new Error(`No se pudo hacer admin: ${e.message}`);
  }
  return { id: data.user.id, correo };
}

/**
 * Inicia sesión en el navegador de la prueba sin pasar por el correo: pide un enlace mágico con la
 * clave de servicio, lo canjea en el servidor de pruebas y copia las cookies de sesión al navegador.
 */
export async function iniciarSesion(contexto: BrowserContext, correo: string, baseURL: string) {
  const { data, error } = await admin().auth.admin.generateLink({ type: "magiclink", email: correo });
  if (error || !data.properties?.hashed_token) throw new Error(`No se pudo generar el enlace: ${error?.message}`);

  const tarro = new Map<string, string>();
  const supabase = createServerClient(URL_SUPABASE(), variable("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll: () => [...tarro].map(([name, value]) => ({ name, value })),
      setAll: (lista) => lista.forEach(({ name, value }) => (value ? tarro.set(name, value) : tarro.delete(name))),
    },
  });
  const { error: e } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: data.properties.hashed_token });
  if (e) throw new Error(`No se pudo iniciar sesión: ${e.message}`);
  const dominio = new URL(baseURL).hostname;
  await contexto.addCookies([...tarro].map(([name, value]) => ({ name, value, domain: dominio, path: "/", sameSite: "Lax" as const })));
}

/** Crea un lugar publicado para las pruebas y devuelve su ruta. */
export async function crearLugar(categoria = "restaurantes", extra: Record<string, unknown> = {}) {
  const db = admin();
  const [{ data: ciudad }, { data: cat }] = await Promise.all([
    db.from("cities").select("id").eq("slug", "guayaquil").single(),
    db.from("categories").select("id").eq("slug", categoria).single(),
  ]);
  const slug = `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await db
    .from("places")
    .insert({
      city_id: ciudad!.id,
      category_id: cat!.id,
      slug,
      name: `${marca} ${slug.slice(-4)}`,
      sector: "Centro",
      description: "Lugar creado por las pruebas de punta a punta; se borra al terminar.",
      status: "publicado",
      ...extra,
    })
    .select("id, slug")
    .single();
  if (error || !data) throw new Error(`No se pudo crear el lugar: ${error?.message}`);
  return { id: data.id as string, slug: data.slug as string, ruta: `/guayaquil/${categoria}/${data.slug}` };
}

/** Borra todo lo que crearon las pruebas: usuarios (con sus reseñas), lugares y solicitudes "E2E …". */
export async function limpiar() {
  const db = admin();
  for (const id of creados.splice(0)) await db.auth.admin.deleteUser(id);
  const { data: fotos } = await db.from("place_photos").select("storage_path, places!inner(name)").like("places.name", "E2E %");
  if (fotos?.length) await db.storage.from("fotos-lugares").remove(fotos.map((f) => f.storage_path as string));
  await db.from("places").delete().like("name", "E2E %");
  await db.from("business_requests").delete().like("business_name", "E2E %");
}

/** Una imagen PNG pequeña para probar la subida de fotos. */
export function pngDePrueba(): Buffer {
  // PNG de 16×16 píxeles color mango
  return Buffer.from("iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR4nGP4sMWGJMQwqmFUw/DVAADiIeAQYMszPwAAAABJRU5ErkJggg==", "base64");
}
