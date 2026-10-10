"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { obtenerUsuario } from "@/lib/auth";
import { verificarCaptcha } from "@/lib/captcha";
import { expandirEnlaceMaps } from "@/lib/enlaceCorto";
import { firmaValida } from "@/lib/firmaArchivo";
import { urlPublicaAfiche } from "@/lib/fotos";
import { mensajeModeracion } from "@/lib/moderacion";
import { aSlug } from "@/lib/slug";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { configSupabase, exigirConfigSupabase } from "@/lib/supabase/config";
import { enEcuador, esEnlaceCorto, leerUbicacion } from "@/lib/ubicacion";
import { CAMPOS_EVENTO, esquemaEvento, esquemaEventoNuevo, esquemaIdEvento, esquemaSubidaAfiche, type CampoEvento } from "@/lib/validacion/eventos";

/*
 * Eventos (versión 5, fase 22). Orden: Zod → captcha (solo al publicar) → sesión → límites → escribir con admin.ts.
 * La tabla no acepta escrituras desde el navegador; la base vuelve a exigir los límites y el filtro de palabras.
 * Se publica al instante (como el registro de negocios); 3 reportes lo ocultan y el admin lo revisa después.
 */

export type EstadoEvento = {
  estado: "inicio" | "ok" | "error";
  mensaje?: string;
  errores?: Partial<Record<CampoEvento, string>>;
  valores?: Record<string, string>;
  /** Dirección del evento publicado o guardado. */
  ruta?: string;
  intento?: number;
};

const BUCKET = "afiches-eventos";
const ARCHIVOS_POR_CUENTA = 8;

const MENSAJES_BASE: Record<string, string> = {
  limite_eventos_semana: "Ya publicaste 3 eventos esta semana. Podrás publicar otro en unos días.",
  evento_muy_lejos: "Puedes publicar eventos de los próximos 6 meses.",
  evento_vencido: "Esa fecha ya pasó.",
};

function leerFormulario(datos: FormData) {
  const valores = Object.fromEntries(CAMPOS_EVENTO.map((c) => [c, String(datos.get(c) ?? "").slice(0, 3000)]));
  const crudo: Record<string, unknown> = { ...valores };
  for (const c of ["enLinea", "gratis", "terminos"] as const) crudo[c] = datos.get(c) ?? undefined;
  return { valores, crudo };
}

function erroresDe(issues: { path: PropertyKey[]; message: string }[]) {
  const errores: EstadoEvento["errores"] = {};
  for (const i of issues) errores[i.path[0] as CampoEvento] ??= i.message;
  return errores;
}

/** Ubicación opcional: coordenadas o un enlace de Google Maps (también el corto de "Compartir"). */
async function leerUbicacionEvento(texto: string): Promise<{ lat: number; lng: number } | null | "invalida"> {
  if (!texto) return null;
  const largo = esEnlaceCorto(texto) ? await expandirEnlaceMaps(texto) : texto;
  const u = largo ? leerUbicacion(largo) : "invalida";
  if (!u || u === "invalida" || !enEcuador(u)) return "invalida";
  return u;
}

/** El afiche tiene que estar en la carpeta de esta cuenta, no ser de otro evento, existir y ser de verdad una imagen. */
async function aficheValido(usuario: string, camino: string): Promise<boolean> {
  if (!camino.startsWith(`eventos/${usuario}/`)) return false;
  const db = crearClienteAdmin();
  const { count } = await db.from("city_events").select("id", { count: "exact", head: true }).eq("poster_path", camino);
  if (count) return false;
  const nombre = camino.split("/").pop()!;
  const { data } = await db.storage.from(BUCKET).list(`eventos/${usuario}`, { search: nombre, limit: 1 });
  if (!data?.some((o) => o.name === nombre)) return false;
  if (await firmaValida(urlPublicaAfiche(exigirConfigSupabase().url, camino), ["webp", "jpeg"])) return true;
  await db.storage.from(BUCKET).remove([camino]);
  return false;
}

/** Afiche, paso 1: permiso de subida de un solo uso para un camino que elige el servidor. */
export async function pedirSubidaAfiche(formato: "webp" | "jpg"): Promise<{ camino: string; token: string } | { error: string }> {
  const r = esquemaSubidaAfiche.safeParse({ formato });
  if (!r.success) return { error: "Datos inválidos" };
  if (!configSupabase()) return { error: "Los eventos todavía no están activos." };
  const usuario = await obtenerUsuario();
  if (!usuario) return { error: "Tu sesión se cerró. Entra otra vez a tu cuenta." };
  const db = crearClienteAdmin();
  // Contra el abuso: pocos archivos por cuenta a la vez (los afiches se borran con su evento; los que nadie usa, cada noche)
  const { data: hay } = await db.storage.from(BUCKET).list(`eventos/${usuario.id}`, { limit: ARCHIVOS_POR_CUENTA + 1 });
  if ((hay?.length ?? 0) >= ARCHIVOS_POR_CUENTA) return { error: "Subiste muchos afiches. Borra algún evento viejo o publica sin afiche." };
  // Y como mucho 6 permisos al día, contados en la base aunque no se usen
  const { data: cupo } = await db.rpc("permiso_afiche", { usuario: usuario.id });
  if (cupo !== true) return { error: "Llegaste al límite de afiches por hoy. Publica sin afiche o vuelve mañana." };
  const camino = `eventos/${usuario.id}/${crypto.randomUUID()}.${r.data.formato}`;
  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(camino);
  if (error || !data) return { error: "No se pudo preparar la subida. Inténtalo de nuevo." };
  return { camino, token: data.token };
}

function filaDe(d: ReturnType<typeof esquemaEvento.parse>, ubicacion: { lat: number; lng: number } | null) {
  return {
    title: d.titulo,
    kind: d.tipo,
    description: d.descripcion,
    starts_at: d.inicio.toISOString(),
    ends_at: d.fin.toISOString(),
    online: d.enLinea,
    venue: d.lugar || null,
    address: d.direccion || null,
    latitude: ubicacion?.lat ?? null,
    longitude: ubicacion?.lng ?? null,
    price: d.precio,
    organizer: d.organizador,
    whatsapp: d.whatsapp,
    website: d.web || null,
    tickets_url: d.entradas || null,
    min_age: d.edad,
    poster_path: d.afiche || null,
    poster_alt: d.afiche ? d.aficheAlt : null,
  };
}

function mensajeError(error: { message?: string } | null): string {
  const texto = error?.message ?? "";
  for (const [clave, mensaje] of Object.entries(MENSAJES_BASE)) if (texto.includes(clave)) return mensaje;
  return mensajeModeracion(error) ?? "No se pudo guardar el evento. Inténtalo de nuevo.";
}

/** Publica un evento nuevo. */
export async function publicarEvento(_previo: EstadoEvento, datos: FormData): Promise<EstadoEvento> {
  const { valores, crudo } = leerFormulario(datos);
  const falla = (mensaje: string, errores?: EstadoEvento["errores"]): EstadoEvento => ({ estado: "error", mensaje, errores, valores, intento: Date.now() });
  const r = esquemaEvento.safeParse(crudo);
  const t = esquemaEventoNuevo.safeParse(crudo);
  if (!r.success || !t.success) return falla("Revisa los campos marcados", erroresDe([...(r.error?.issues ?? []), ...(t.error?.issues ?? [])]));
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
  if (!(await verificarCaptcha(datos.get("cf-turnstile-response"), ip))) return falla("Confirma que no eres un robot y vuelve a publicar.");
  if (!configSupabase()) return falla("Los eventos todavía no están activos. Vuelve pronto.");
  const usuario = await obtenerUsuario();
  if (!usuario) return falla("Tu sesión se cerró. Entra otra vez a tu cuenta y vuelve a publicar.");

  const db = crearClienteAdmin();
  const semana = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const [{ count }, ciudad] = await Promise.all([
    db.from("city_events").select("id", { count: "exact", head: true }).eq("user_id", usuario.id).gte("created_at", semana),
    db.from("cities").select("id").eq("slug", "guayaquil").eq("active", true).maybeSingle(),
  ]);
  if ((count ?? 0) >= 3) return falla(MENSAJES_BASE.limite_eventos_semana!);
  if (!ciudad.data) return falla("No se pudo publicar. Inténtalo de nuevo.");

  const ubicacion = await leerUbicacionEvento(r.data.ubicacion);
  if (ubicacion === "invalida") return falla("Revisa los campos marcados", { ubicacion: "No entendimos esa ubicación. Pega el enlace de «Compartir» de Google Maps o las coordenadas." });
  if (r.data.afiche && !(await aficheValido(usuario.id, r.data.afiche))) return falla("Revisa los campos marcados", { afiche: "No encontramos el afiche subido. Vuelve a elegirlo." });

  const slug = `${aSlug(r.data.titulo, 60) || "evento"}-${randomBytes(3).toString("hex")}`;
  const { error } = await db.from("city_events").insert({ ...filaDe(r.data, ubicacion), slug, city_id: ciudad.data.id, user_id: usuario.id });
  if (error) {
    if (r.data.afiche) await db.storage.from(BUCKET).remove([r.data.afiche]);
    return falla(mensajeError(error));
  }
  revalidatePath("/", "layout");
  return { estado: "ok", mensaje: "¡Tu evento ya está publicado!", ruta: `/guayaquil/eventos/${slug}` };
}

/** El evento, solo si es de la cuenta con sesión. */
async function miEvento(id: unknown) {
  const r = esquemaIdEvento.safeParse({ evento: id });
  if (!r.success) return { error: "Datos inválidos" } as const;
  if (!configSupabase()) return { error: "Los eventos todavía no están activos." } as const;
  const usuario = await obtenerUsuario();
  if (!usuario) return { error: "Tu sesión se cerró. Entra otra vez a tu cuenta." } as const;
  const { data } = await crearClienteAdmin().from("city_events").select("id, slug, poster_path").eq("id", r.data.evento).eq("user_id", usuario.id).maybeSingle();
  if (!data) return { error: "Ese evento ya no existe o no es tuyo." } as const;
  return { usuario, evento: data as { id: string; slug: string; poster_path: string | null } };
}

/** Guarda los cambios de un evento propio (sin captcha: ya se pasó al publicarlo y hace falta la sesión). */
export async function editarEvento(_previo: EstadoEvento, datos: FormData): Promise<EstadoEvento> {
  const { valores, crudo } = leerFormulario(datos);
  const falla = (mensaje: string, errores?: EstadoEvento["errores"]): EstadoEvento => ({ estado: "error", mensaje, errores, valores, intento: Date.now() });
  const r = esquemaEvento.safeParse(crudo);
  if (!r.success) return falla("Revisa los campos marcados", erroresDe(r.error.issues));
  const m = await miEvento(datos.get("evento"));
  if ("error" in m) return falla(m.error!);
  const ubicacion = await leerUbicacionEvento(r.data.ubicacion);
  if (ubicacion === "invalida") return falla("Revisa los campos marcados", { ubicacion: "No entendimos esa ubicación. Pega el enlace de «Compartir» de Google Maps o las coordenadas." });
  const anterior = m.evento.poster_path;
  const nuevo = r.data.afiche || null;
  if (nuevo && nuevo !== anterior && !(await aficheValido(m.usuario.id, nuevo))) return falla("Revisa los campos marcados", { afiche: "No encontramos el afiche subido. Vuelve a elegirlo." });
  const db = crearClienteAdmin();
  const { error } = await db.from("city_events").update(filaDe(r.data, ubicacion)).eq("id", m.evento.id).eq("user_id", m.usuario.id);
  if (error) {
    if (nuevo && nuevo !== anterior) await db.storage.from(BUCKET).remove([nuevo]);
    return falla(mensajeError(error));
  }
  if (anterior && anterior !== nuevo) await db.storage.from(BUCKET).remove([anterior]);
  revalidatePath("/", "layout");
  return { estado: "ok", mensaje: "Cambios guardados", ruta: `/guayaquil/eventos/${m.evento.slug}`, intento: Date.now() };
}

/** Borra un evento propio y su afiche. */
export async function borrarEvento(_previo: EstadoEvento, datos: FormData): Promise<EstadoEvento> {
  const m = await miEvento(datos.get("evento"));
  if ("error" in m) return { estado: "error", mensaje: m.error };
  const db = crearClienteAdmin();
  const { error } = await db.from("city_events").delete().eq("id", m.evento.id).eq("user_id", m.usuario.id);
  if (error) return { estado: "error", mensaje: "No se pudo borrar. Inténtalo de nuevo." };
  if (m.evento.poster_path) await db.storage.from(BUCKET).remove([m.evento.poster_path]);
  revalidatePath("/", "layout");
  return { estado: "ok", mensaje: "Evento borrado" };
}
