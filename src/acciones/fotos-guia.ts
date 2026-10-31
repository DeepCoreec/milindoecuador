"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { EstadoAdmin } from "@/acciones/admin";
import { requireAdmin } from "@/lib/auth";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { esquemaBuscarFotosGuia, esquemaFotoSitio, esquemaIdFotoSitio, esquemaQuitarFotoSitio } from "@/lib/validacion/admin";
import { enriquecerSitio } from "@/lib/guia/enriquecer";
import { traerMasDeUnSitio, type FilaMas } from "@/lib/guia/mas-fotos";
import { firmaValida } from "@/lib/firmaArchivo";
import { urlPublicaFoto } from "@/lib/fotos";
import { exigirConfigSupabase } from "@/lib/supabase/config";

/*
 * "Buscar fotos y descripción" en /admin/guia (versión 7, fase 29.3; plan en docs/PLAN-V7.md).
 * Para los lugares PUBLICADOS que todavía no se buscaron (enriched_at vacío): Wikimedia → copia de la foto en NUESTRO
 * bucket (guia/<id>.<ext>) → guardar foto, crédito, licencia y descripción con su fuente. Si no hay nada bueno, solo se
 * anota la fecha (no se pone nada de relleno; regla 2). Si Wikimedia falla, no se anota: se reintenta en otro clic.
 * Orden: Zod → requireAdmin → leer y escribir con admin.ts (después de requireAdmin) → guardar después de cada lugar.
 */

/** Lugares por clic y al mismo tiempo: despacio, como pide Wikimedia, y dentro de los 60 s de Vercel. */
const POR_CLIC = 12;
/** De a uno: con 3 a la vez la búsqueda de Wikipedia respondía "demasiado ocupado" (29.11). */
const PARALELO = 1;
const LIMITE_MS = 40_000;

type Fila = { id: string; name: string; latitude: number; longitude: number; wikidata: string | null; wikipedia: string | null };

export async function buscarFotosGuia(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  if (!esquemaBuscarFotosGuia.safeParse(Object.fromEntries(datos)).success) return { estado: "error", mensaje: "Datos inválidos" };
  await requireAdmin();
  const inicio = Date.now();
  const db = crearClienteAdmin();
  // Primero los que tienen enlace de OpenStreetMap (más seguros), luego el resto; "Para visitar" antes que los demás
  const { data: filas, error } = await db
    .from("city_spots")
    .select("id, name, latitude, longitude, wikidata, wikipedia")
    // Publicados, y también los candidatos de Wikidata por revisar (30.2: se deciden ya con foto y descripción)
    .or("status.eq.publicado,and(status.eq.pendiente,osm_type.eq.wikidata)")
    .is("enriched_at", null)
    // Los publicados antes que los candidatos (hallazgo 4); dentro de cada grupo, primero los que tienen enlace
    .order("status", { ascending: false })
    .order("wikidata", { nullsFirst: false })
    .order("grupo", { ascending: false })
    .limit(POR_CLIC)
    .returns<Fila[]>();
  if (error) return { estado: "error", mensaje: "No se pudieron leer los lugares" };
  if (!filas?.length) return { estado: "ok", mensaje: "Ya se buscó en todos los lugares publicados y en los candidatos de Wikidata." };

  let revisados = 0;
  let conFoto = 0;
  let conTexto = 0;
  let sinNada = 0;
  let fallas = 0;
  /** Por qué cada lugar no trajo foto (29.8): se muestra al admin para encontrar fallas. */
  const motivos: string[] = [];

  // Corte duro antes de los 60 s de Vercel: lo que no alcance se aborta y se reintenta en el próximo clic (hallazgo 3)
  const corte = AbortSignal.timeout(Math.max(LIMITE_MS + 10_000 - (Date.now() - inicio), 5_000));
  const uno = async (f: Fila) => {
    const r = await enriquecerSitio(db, f, "busqueda", corte);
    const nombre = f.name.slice(0, 40);
    if (r.estado === "pasajero") fallas++;
    else if (r.estado === "permanente") {
      revisados++;
      sinNada++;
      motivos.push(`${nombre}: ${r.motivo}`);
    } else if (r.estado === "listo") {
      revisados++;
      if (r.conFoto) conFoto++;
      if (r.conTexto) conTexto++;
      if (!r.conFoto && !r.conTexto) sinNada++;
      if (r.sinFoto) motivos.push(`${nombre}: ${r.sinFoto}`);
    }
  };

  for (let i = 0; i < filas.length; i += PARALELO) {
    if (Date.now() - inicio > LIMITE_MS) break;
    await Promise.all(filas.slice(i, i + PARALELO).map(uno));
  }

  revalidateTag("sitios", { expire: 0 });
  revalidatePath("/admin/guia");
  const partes = [
    `Se buscaron ${revisados} lugares: ${conFoto} con foto, ${conTexto} con descripción y ${sinNada} sin nada bueno en Wikipedia (se quedan como están).`,
    filas.length === POR_CLIC ? "Puede que queden más: vuelve a tocar el botón." : null,
    fallas ? `${fallas} no se pudieron revisar ahora (Wikimedia no respondió): vuelve a tocar el botón.` : null,
    motivos.length ? `Sin foto — ${motivos.slice(0, 15).join(" · ")}` : null,
  ];
  return { estado: "ok", mensaje: partes.filter(Boolean).join(" ") };
}

/**
 * "Volver a buscar los que quedaron sin foto" (29.8): borra la fecha de búsqueda de los lugares publicados que no tienen
 * foto, para que el botón los vuelva a mirar (después de corregir una falla). No toca fotos ni descripciones ya puestas.
 */
export async function reiniciarBusquedaFotos(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  if (!esquemaBuscarFotosGuia.safeParse(Object.fromEntries(datos)).success) return { estado: "error", mensaje: "Datos inválidos" };
  await requireAdmin();
  const { data, error } = await crearClienteAdmin()
    .from("city_spots")
    .update({ enriched_at: null })
    .eq("status", "publicado")
    .is("photo_path", null)
    .not("enriched_at", "is", null)
    .select("id");
  if (error) return { estado: "error", mensaje: "No se pudo reiniciar" };
  revalidatePath("/admin/guia");
  return { estado: "ok", mensaje: `${data?.length ?? 0} lugares sin foto se volverán a buscar. Toca "Buscar fotos y descripción".` };
}

/** Quitar la foto y la descripción de un lugar (regla 7: todo se puede deshacer). No se vuelven a buscar solas. */
export async function quitarFotoSitio(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaQuitarFotoSitio.safeParse({ sitio: datos.get("sitio") });
  if (!r.success) return { estado: "error", mensaje: "Lugar inválido" };
  await requireAdmin();
  const db = crearClienteAdmin();
  const { data: fila } = await db.from("city_spots").select("photo_path").eq("id", r.data.sitio).maybeSingle<{ photo_path: string | null }>();
  if (!fila) return { estado: "error", mensaje: "No se encontró el lugar" };
  const { error } = await db
    .from("city_spots")
    .update({ photo_path: null, photo_credit: null, photo_license: null, photo_source: null, description: null, description_source: null, enriched_at: new Date().toISOString() })
    .eq("id", r.data.sitio);
  if (error) return { estado: "error", mensaje: "No se pudo quitar" };
  if (fila.photo_path) await db.storage.from("fotos-lugares").remove([fila.photo_path]);
  revalidateTag("sitios", { expire: 0 });
  revalidatePath("/admin/guia");
  return { estado: "ok", mensaje: "Foto y descripción quitadas" };
}

/* ---------------------------------------------------------------------------------------------------------------
 * Versión 12 (fase 40; plan en docs/PLAN-V12.md): más fotos de cada lugar.
 * ------------------------------------------------------------------------------------------------------------- */

/** Lugares por clic en "Traer más fotos": cada uno baja hasta 6 fotos (dentro de los 60 s de Vercel). */
const MAS_POR_CLIC = 5;

/**
 * "Traer más fotos" (40.2): para los lugares PUBLICADOS para visitar que tienen su ficha de Wikidata y todavía no se
 * revisaron (photos_at vacío), hasta 6 fotos libres más, el párrafo de Wikipedia y los datos rápidos.
 */
export async function traerMasFotosGuia(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  if (!esquemaBuscarFotosGuia.safeParse(Object.fromEntries(datos)).success) return { estado: "error", mensaje: "Datos inválidos" };
  await requireAdmin();
  const inicio = Date.now();
  const db = crearClienteAdmin();
  const { data: filas, error } = await db
    .from("city_spots")
    .select("id, name, wikidata, photo_source, description_source")
    .eq("status", "publicado")
    .eq("grupo", "visitar")
    .not("wikidata", "is", null)
    .is("photos_at", null)
    // Primero los que ya tienen foto principal (los mejor documentados)
    .order("photo_path", { nullsFirst: false })
    .limit(MAS_POR_CLIC)
    .returns<FilaMas[]>();
  if (error) return { estado: "error", mensaje: "No se pudieron leer los lugares" };
  if (!filas?.length) return { estado: "ok", mensaje: "Ya se buscaron más fotos en todos los lugares publicados que tienen ficha en Wikidata." };

  const corte = AbortSignal.timeout(Math.max(LIMITE_MS + 10_000 - (Date.now() - inicio), 5_000));
  let revisados = 0;
  let fotos = 0;
  let parrafos = 0;
  let fallas = 0;
  for (const f of filas) {
    if (Date.now() - inicio > LIMITE_MS) break;
    const r = await traerMasDeUnSitio(db, f, 6, corte);
    if (r.estado === "pasajero") fallas++;
    else if (r.estado === "listo") {
      revisados++;
      fotos += r.fotos;
      if (r.parrafo) parrafos++;
    }
  }
  revalidateTag("sitios", { expire: 0 });
  revalidatePath("/admin/guia");
  return {
    estado: "ok",
    mensaje: [
      `Se revisaron ${revisados} lugares: ${fotos} fotos nuevas y ${parrafos} con párrafo de Wikipedia.`,
      filas.length === MAS_POR_CLIC ? "Puede que queden más: vuelve a tocar el botón." : null,
      fallas ? `${fallas} no se pudieron revisar ahora (Wikimedia no respondió): vuelve a tocar el botón.` : null,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

/**
 * Fotos propias de un lugar de la guía (40.3), paso 1: permiso de subida firmado, de un solo uso, a un camino que elige
 * el servidor (guia/<lugar>/<uuid>.webp|jpg). El navegador sube la foto ya preparada (WebP, sin datos del celular).
 */
export async function pedirSubidaFotoSitio(sitio: string, formato: "webp" | "jpg" = "webp"): Promise<{ camino: string; token: string } | { error: string }> {
  const r = esquemaQuitarFotoSitio.safeParse({ sitio });
  if (!r.success || (formato !== "webp" && formato !== "jpg")) return { error: "Datos inválidos" };
  await requireAdmin();
  const db = crearClienteAdmin();
  const { data: lugar } = await db.from("city_spots").select("id").eq("id", r.data.sitio).eq("grupo", "visitar").maybeSingle();
  if (!lugar) return { error: "No se encontró el lugar" };
  const { count } = await db.from("city_spot_photos").select("id", { count: "exact", head: true }).eq("spot_id", r.data.sitio);
  if ((count ?? 0) >= 8) return { error: "Este lugar ya tiene 8 fotos más. Borra una para subir otra." };
  const camino = `guia/${r.data.sitio}/${crypto.randomUUID()}.${formato}`;
  const { data, error } = await db.storage.from("fotos-lugares").createSignedUploadUrl(camino);
  if (error || !data) return { error: "No se pudo preparar la subida. Inténtalo de nuevo." };
  return { camino, token: data.token };
}

/** Fotos propias (40.3), paso 2: revisa que de verdad sea una foto y la guarda (sin licencia ni enlace: es de la guía). */
export async function registrarFotoSitio(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaFotoSitio.safeParse({ sitio: datos.get("sitio"), camino: datos.get("camino"), alt: datos.get("alt") });
  if (!r.success) return { estado: "error", mensaje: r.error.issues[0]?.message ?? "Datos inválidos" };
  if (!r.data.camino.startsWith(`guia/${r.data.sitio}/`)) return { estado: "error", mensaje: "La foto no es de este lugar" };
  await requireAdmin();
  const db = crearClienteAdmin();
  const bucket = db.storage.from("fotos-lugares");
  // Un camino que ya está registrado no se vuelve a registrar ni se borra (revisión independiente 2026-10-31, hallazgo 1)
  const { data: yaEsta } = await db.from("city_spot_photos").select("id").eq("storage_path", r.data.camino).maybeSingle();
  if (yaEsta) return { estado: "error", mensaje: "Esa foto ya está guardada." };
  if (!(await firmaValida(urlPublicaFoto(exigirConfigSupabase().url, r.data.camino), ["webp", "jpeg"]))) {
    await bucket.remove([r.data.camino]);
    return { estado: "error", mensaje: "Ese archivo no es una foto válida. Vuelve a elegirla." };
  }
  const { data: ultima } = await db.from("city_spot_photos").select("sort_order").eq("spot_id", r.data.sitio).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await db
    .from("city_spot_photos")
    .insert({ spot_id: r.data.sitio, storage_path: r.data.camino, alt_text: r.data.alt, sort_order: (ultima?.sort_order ?? 0) + 1 });
  if (error) {
    // Si el camino ya existía (código 23505), el archivo es de otra foto: no se borra
    if (error.code !== "23505") await bucket.remove([r.data.camino]);
    if (error.message.includes("tope_fotos")) return { estado: "error", mensaje: "Este lugar ya tiene 8 fotos más." };
    if (error.message.includes("texto_no_permitido")) return { estado: "error", mensaje: "La descripción de la foto no se permite (sin teléfonos, enlaces ni groserías)." };
    return { estado: "error", mensaje: "No se pudo guardar la foto. Inténtalo de nuevo." };
  }
  revalidateTag("sitios", { expire: 0 });
  revalidatePath("/admin/guia");
  return { estado: "ok", mensaje: "Foto agregada" };
}

/** Borra una de las fotos más de un lugar (de Commons o propia): la fila y el archivo. */
export async function borrarFotoSitio(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaIdFotoSitio.safeParse({ foto: datos.get("foto") });
  if (!r.success) return { estado: "error", mensaje: "Foto inválida" };
  await requireAdmin();
  const db = crearClienteAdmin();
  const { data } = await db.from("city_spot_photos").delete().eq("id", r.data.foto).select("storage_path");
  const camino = data?.[0]?.storage_path;
  if (!camino) return { estado: "error", mensaje: "La foto ya no existe" };
  await db.storage.from("fotos-lugares").remove([camino]);
  revalidateTag("sitios", { expire: 0 });
  revalidatePath("/admin/guia");
  return { estado: "ok", mensaje: "Foto borrada" };
}
