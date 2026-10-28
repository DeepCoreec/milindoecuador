"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { EstadoAdmin } from "@/acciones/admin";
import { requireAdmin } from "@/lib/auth";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { esquemaBuscarFotosGuia, esquemaQuitarFotoSitio } from "@/lib/validacion/admin";
import { buscarEnWikimedia, descargarFoto, ErrorWikimedia } from "@/lib/wikimedia";

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
    .eq("status", "publicado")
    .is("enriched_at", null)
    .order("wikidata", { nullsFirst: false })
    .order("grupo", { ascending: false })
    .limit(POR_CLIC)
    .returns<Fila[]>();
  if (error) return { estado: "error", mensaje: "No se pudieron leer los lugares" };
  if (!filas?.length) return { estado: "ok", mensaje: "Ya se buscó en todos los lugares publicados." };

  let revisados = 0;
  let conFoto = 0;
  let conTexto = 0;
  let sinNada = 0;
  let fallas = 0;
  /** Por qué cada lugar no trajo foto (29.8): se muestra al admin para encontrar fallas. */
  const motivos: string[] = [];
  const bucket = db.storage.from("fotos-lugares");

  // Corte duro antes de los 60 s de Vercel: lo que no alcance se aborta y se reintenta en el próximo clic (hallazgo 3)
  const corte = AbortSignal.timeout(Math.max(LIMITE_MS + 10_000 - (Date.now() - inicio), 5_000));
  const anotar = (id: string, cambios: Record<string, unknown> = {}) =>
    db.from("city_spots").update({ ...cambios, enriched_at: new Date().toISOString() }).eq("id", id).eq("status", "publicado").select("id");

  const uno = async (f: Fila) => {
    let subida: string | null = null;
    try {
      const r = await buscarEnWikimedia({ nombre: f.name, lat: f.latitude, lng: f.longitude, wikidata: f.wikidata, wikipedia: f.wikipedia }, fetch, corte);
      let foto: { photo_path: string; photo_credit: string; photo_license: string; photo_source: string } | null = null;
      let sinFoto = r.sinFoto;
      if (r.foto) {
        try {
          const d = await descargarFoto(r.foto.url, fetch, corte);
          const camino = `guia/${f.id}.${d.extension}`;
          const { error: e } = await bucket.upload(camino, d.datos, { contentType: d.tipo, upsert: true, cacheControl: "604800" });
          if (e) throw new ErrorWikimedia(`no se pudo guardar en el bucket (${e.message.slice(0, 40)})`);
          subida = camino;
          foto = { photo_path: camino, photo_credit: r.foto.credito, photo_license: r.foto.licencia, photo_source: r.foto.fuente };
        } catch (e) {
          // Si la descarga falla sin arreglo, la descripción igual se guarda; si es pasajera, se reintenta todo
          if (!(e instanceof ErrorWikimedia && e.permanente)) throw e;
          sinFoto = `descarga: ${e.message}`;
        }
      }
      if (sinFoto) motivos.push(`${f.name.slice(0, 40)}: ${sinFoto}`);
      const textos = { ...(foto ?? {}), ...(r.descripcion ? { description: r.descripcion.texto, description_source: r.descripcion.fuente } : {}) };
      let res = await anotar(f.id, { wikidata: r.wikidata ?? f.wikidata, ...textos });
      let filtrado = false;
      // El filtro de palabras de la base (0020) rechazó el texto o el autor: el lugar se queda sin foto ni descripción
      if (res.error?.message?.includes("texto_no_permitido")) {
        filtrado = true;
        res = await anotar(f.id, { wikidata: r.wikidata ?? f.wikidata });
      }
      if (res.error) throw new ErrorWikimedia("No se pudo guardar");
      // Sin fila actualizada (el lugar dejó de estar publicado) o rechazado por el filtro: la foto no queda suelta
      if (subida && (filtrado || !res.data?.length)) await bucket.remove([subida]);
      if (!res.data?.length) return;
      revisados++;
      const conFotoAqui = !!foto && !filtrado;
      const conTextoAqui = !!r.descripcion && !filtrado;
      if (conFotoAqui) conFoto++;
      if (conTextoAqui) conTexto++;
      if (!conFotoAqui && !conTextoAqui) sinNada++;
      console.log(JSON.stringify({ evento: "foto_guia", sitio: f.id, wikidata: r.wikidata, foto: conFotoAqui, descripcion: conTextoAqui, filtrado, nada: r.nada }));
    } catch (e) {
      if (subida) await bucket.remove([subida]);
      const permanente = e instanceof ErrorWikimedia && e.permanente;
      // Un error que no se arregla solo: se anota como revisado (sin foto ni texto) para no trabar el botón (hallazgo 2)
      if (permanente) {
        await anotar(f.id);
        revisados++;
        sinNada++;
        motivos.push(`${f.name.slice(0, 40)}: ${e instanceof ErrorWikimedia ? e.message : "error"}`);
      } else fallas++;
      console.log(JSON.stringify({ evento: "foto_guia_falla", sitio: f.id, permanente, error: e instanceof ErrorWikimedia ? e.message : "inesperado o tiempo agotado" }));
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
