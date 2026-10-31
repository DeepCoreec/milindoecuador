"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { EstadoAdmin } from "@/acciones/admin";
import { requireAdmin } from "@/lib/auth";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { esquemaBuscarFotosGuia, esquemaDatosSitio, esquemaFotoCommons, esquemaFotoSitio, esquemaIdFotoSitio, esquemaQuitarFotoSitio } from "@/lib/validacion/admin";
import { aDatosContacto, consultaDatosOSM, urlOverpass } from "@/lib/osm";
import { enriquecerSitio } from "@/lib/guia/enriquecer";
import { traerMasDeUnSitio, type FilaMas } from "@/lib/guia/mas-fotos";
import { firmaDeDatos, firmaValida } from "@/lib/firmaArchivo";
import { descargarFoto, leerFotoPorEnlace } from "@/lib/wikimedia";
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

/* ---------------------------------------------------------------------------------------------------------------
 * Horario, página web y teléfono de los lugares para visitar (2026-10-31, pedido del usuario).
 * ------------------------------------------------------------------------------------------------------------- */

/**
 * "Completar horario y web desde OpenStreetMap": para los lugares publicados para visitar a los que les falta el
 * horario, la web o el teléfono, busca en OpenStreetMap (por su Q de Wikidata o su id) y llena SOLO lo que falta.
 */
export async function completarDatosOSM(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  if (!esquemaBuscarFotosGuia.safeParse(Object.fromEntries(datos)).success) return { estado: "error", mensaje: "Datos inválidos" };
  await requireAdmin();
  const db = crearClienteAdmin();
  const { data: filas, error } = await db
    .from("city_spots")
    .select("id, osm_type, osm_id, wikidata, opening_hours, website, phone")
    .eq("status", "publicado")
    .eq("grupo", "visitar")
    .or("opening_hours.is.null,website.is.null,phone.is.null")
    .limit(300)
    .returns<{ id: string; osm_type: string; osm_id: number; wikidata: string | null; opening_hours: string | null; website: string | null; phone: string | null }[]>();
  if (error) return { estado: "error", mensaje: "No se pudieron leer los lugares" };
  if (!filas?.length) return { estado: "ok", mensaje: "Todos los lugares publicados para visitar ya tienen horario, web y teléfono." };
  const qids = [...new Set(filas.map((f) => f.wikidata).filter((q): q is string => !!q))];
  const ids = filas.filter((f) => f.osm_type === "node" || f.osm_type === "way" || f.osm_type === "relation").map((f) => ({ tipo: f.osm_type as "node", id: f.osm_id }));
  let json: unknown;
  try {
    const r = await fetch(urlOverpass(), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "MiLindoEcuador/1.0 (guia de Guayaquil)" },
      body: new URLSearchParams({ data: consultaDatosOSM(qids, ids) }),
      signal: AbortSignal.timeout(35_000),
      redirect: "error",
    });
    if (!r.ok) return { estado: "error", mensaje: `OpenStreetMap no respondió (código ${r.status}). Inténtalo en unos minutos.` };
    const texto = await r.text();
    if (texto.length > 5_000_000) return { estado: "error", mensaje: "La respuesta fue demasiado grande." };
    json = JSON.parse(texto);
  } catch {
    return { estado: "error", mensaje: "No se pudo conectar con OpenStreetMap. Inténtalo en unos minutos." };
  }
  const encontrados = aDatosContacto(json);
  let horarios = 0;
  let webs = 0;
  let telefonos = 0;
  for (const f of filas) {
    const d = (f.wikidata && encontrados.get(f.wikidata)) || encontrados.get(`${f.osm_type}/${f.osm_id}`);
    if (!d) continue;
    const cambios: Record<string, string> = {};
    if (!f.opening_hours && d.opening_hours) cambios.opening_hours = d.opening_hours;
    if (!f.website && d.website) cambios.website = d.website;
    if (!f.phone && d.phone) cambios.phone = d.phone;
    if (!Object.keys(cambios).length) continue;
    const { error: e } = await db.from("city_spots").update(cambios).eq("id", f.id);
    if (e) continue;
    if (cambios.opening_hours) horarios++;
    if (cambios.website) webs++;
    if (cambios.phone) telefonos++;
  }
  revalidateTag("sitios", { expire: 0 });
  revalidatePath("/admin/guia");
  return { estado: "ok", mensaje: `Se completaron ${horarios} horarios, ${webs} páginas web y ${telefonos} teléfonos desde OpenStreetMap. Lo que falte se puede poner a mano en «Fotos y datos del lugar».` };
}

/** Horario, web y teléfono puestos a mano por el admin. Vacío = se borra ese dato. */
export async function editarDatosSitio(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaDatosSitio.safeParse({
    sitio: datos.get("sitio"),
    nota: datos.get("nota") ?? undefined,
    horario: datos.get("horario") ?? undefined,
    web: datos.get("web") ?? undefined,
    telefono: datos.get("telefono") ?? undefined,
  });
  if (!r.success) return { estado: "error", mensaje: r.error.issues[0]?.message ?? "Datos inválidos" };
  await requireAdmin();
  const { data, error } = await crearClienteAdmin()
    .from("city_spots")
    .update({ note: r.data.nota || null, opening_hours: r.data.horario || null, website: r.data.web || null, phone: r.data.telefono || null })
    .eq("id", r.data.sitio)
    .eq("grupo", "visitar")
    .select("id");
  if (error?.message?.includes("texto_no_permitido")) return { estado: "error", mensaje: "La frase no se permite (sin enlaces, teléfonos ni groserías)." };
  if (error || !data?.length) return { estado: "error", mensaje: "No se pudo guardar" };
  revalidateTag("sitios", { expire: 0 });
  revalidatePath("/admin/guia");
  return { estado: "ok", mensaje: "Guardado" };
}

/**
 * Agregar una foto de Commons por su enlace (2026-10-31): si el lugar no tiene foto principal, pasa a ser la principal
 * (guia/<id>.<ext>); si ya tiene, va a las fotos más. Siempre con su autor, licencia y enlace.
 */
export async function agregarFotoCommons(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaFotoCommons.safeParse({ sitio: datos.get("sitio"), enlace: datos.get("enlace") });
  if (!r.success) return { estado: "error", mensaje: r.error.issues[0]?.message ?? "Datos inválidos" };
  await requireAdmin();
  const db = crearClienteAdmin();
  const { data: s } = await db.from("city_spots").select("id, name, grupo, photo_path, photo_source").eq("id", r.data.sitio).maybeSingle();
  if (!s || s.grupo !== "visitar") return { estado: "error", mensaje: "No se encontró el lugar" };
  const corte = AbortSignal.timeout(40_000);
  let foto;
  try {
    foto = await leerFotoPorEnlace(r.data.enlace, fetch, corte);
  } catch {
    return { estado: "error", mensaje: "Wikimedia no respondió. Inténtalo de nuevo." };
  }
  if (typeof foto === "string") return { estado: "error", mensaje: `No sirve: ${foto}` };
  if (s.photo_source === foto.fuente) return { estado: "error", mensaje: "Esa ya es la foto principal." };
  let d;
  try {
    d = await descargarFoto(foto.url, fetch, corte);
  } catch {
    return { estado: "error", mensaje: "No se pudo descargar la foto. Inténtalo de nuevo." };
  }
  if (!firmaDeDatos(d.datos, [d.extension === "jpg" ? "jpeg" : d.extension])) return { estado: "error", mensaje: "El archivo no es una foto." };
  const bucket = db.storage.from("fotos-lugares");
  const principal = !s.photo_path;
  const camino = principal ? `guia/${s.id}.${d.extension}` : `guia/${s.id}/${crypto.randomUUID()}.${d.extension}`;
  const { error: e } = await bucket.upload(camino, d.datos, { contentType: d.tipo, upsert: principal, cacheControl: "604800" });
  if (e) return { estado: "error", mensaje: "No se pudo guardar la foto." };
  let error;
  if (principal) {
    ({ error } = await db
      .from("city_spots")
      .update({ photo_path: camino, photo_credit: foto.credito, photo_license: foto.licencia, photo_source: foto.fuente })
      .eq("id", s.id));
  } else {
    const { data: ultima } = await db.from("city_spot_photos").select("sort_order").eq("spot_id", s.id).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    ({ error } = await db.from("city_spot_photos").insert({
      spot_id: s.id,
      storage_path: camino,
      alt_text: `Foto de ${s.name}`.slice(0, 160),
      credit: foto.credito,
      license: foto.licencia,
      source: foto.fuente,
      sort_order: (ultima?.sort_order ?? 0) + 1,
    }));
  }
  if (error) {
    await bucket.remove([camino]);
    if (error.message.includes("tope_fotos")) return { estado: "error", mensaje: "Este lugar ya tiene 8 fotos más." };
    if (error.code === "23505") return { estado: "error", mensaje: "Esa foto ya está en este lugar." };
    if (error.message.includes("texto_no_permitido")) return { estado: "error", mensaje: "El autor de la foto no pasó el filtro de palabras." };
    return { estado: "error", mensaje: "No se pudo guardar la foto." };
  }
  revalidateTag("sitios", { expire: 0 });
  revalidatePath("/admin/guia");
  return { estado: "ok", mensaje: principal ? "Foto principal agregada" : "Foto agregada" };
}

/**
 * Pasar una de las fotos más (de Commons) a foto principal, cuando el lugar no tiene una (2026-10-31): las tarjetas de
 * la guía muestran solo la principal. Las fotos propias no pueden ser la principal (la base exige licencia y enlace).
 */
export async function hacerPrincipalFotoSitio(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaIdFotoSitio.safeParse({ foto: datos.get("foto") });
  if (!r.success) return { estado: "error", mensaje: "Foto inválida" };
  await requireAdmin();
  const db = crearClienteAdmin();
  const { data: f } = await db.from("city_spot_photos").select("id, spot_id, storage_path, credit, license, source").eq("id", r.data.foto).maybeSingle();
  if (!f) return { estado: "error", mensaje: "La foto ya no existe" };
  if (!f.source || !f.license) return { estado: "error", mensaje: "Solo una foto de Wikimedia Commons puede ser la principal." };
  const { data: s } = await db.from("city_spots").select("id, photo_path").eq("id", f.spot_id).maybeSingle();
  if (!s) return { estado: "error", mensaje: "No se encontró el lugar" };
  if (s.photo_path) return { estado: "error", mensaje: "Este lugar ya tiene foto principal. Quítala primero en la lista de la guía." };
  const extension = f.storage_path.split(".").pop();
  const camino = `guia/${s.id}.${extension}`;
  const bucket = db.storage.from("fotos-lugares");
  const { error: e } = await bucket.copy(f.storage_path, camino);
  if (e) return { estado: "error", mensaje: "No se pudo mover la foto." };
  const { error } = await db.from("city_spots").update({ photo_path: camino, photo_credit: f.credit ?? "Autor en Wikimedia Commons", photo_license: f.license, photo_source: f.source }).eq("id", s.id);
  if (error) {
    await bucket.remove([camino]);
    return { estado: "error", mensaje: "No se pudo guardar." };
  }
  await db.from("city_spot_photos").delete().eq("id", f.id);
  await bucket.remove([f.storage_path]);
  revalidateTag("sitios", { expire: 0 });
  revalidatePath("/admin/guia");
  return { estado: "ok", mensaje: "Ahora es la foto principal" };
}
