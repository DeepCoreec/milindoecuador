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
const POR_CLIC = 15;
const PARALELO = 3;
const LIMITE_MS = 45_000;

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
  const bucket = db.storage.from("fotos-lugares");

  const uno = async (f: Fila) => {
    try {
      const r = await buscarEnWikimedia({ nombre: f.name, lat: f.latitude, lng: f.longitude, wikidata: f.wikidata, wikipedia: f.wikipedia });
      let foto: { photo_path: string; photo_credit: string; photo_license: string; photo_source: string } | null = null;
      if (r.foto) {
        const d = await descargarFoto(r.foto.url);
        const camino = `guia/${f.id}.${d.extension}`;
        const { error: e } = await bucket.upload(camino, d.datos, { contentType: d.tipo, upsert: true, cacheControl: "604800" });
        if (e) throw new ErrorWikimedia("No se pudo guardar la foto");
        foto = { photo_path: camino, photo_credit: r.foto.credito, photo_license: r.foto.licencia, photo_source: r.foto.fuente };
      }
      const { error: e } = await db
        .from("city_spots")
        .update({
          wikidata: r.wikidata ?? f.wikidata,
          ...(foto ?? {}),
          ...(r.descripcion ? { description: r.descripcion.texto, description_source: r.descripcion.fuente } : {}),
          enriched_at: new Date().toISOString(),
        })
        .eq("id", f.id)
        .eq("status", "publicado");
      if (e) {
        if (foto) await bucket.remove([foto.photo_path]); // sin fila, la foto no queda suelta en el bucket
        throw new ErrorWikimedia("No se pudo guardar");
      }
      revisados++;
      if (foto) conFoto++;
      if (r.descripcion) conTexto++;
      if (!foto && !r.descripcion) sinNada++;
      console.log(JSON.stringify({ evento: "foto_guia", sitio: f.id, wikidata: r.wikidata, foto: !!foto, descripcion: !!r.descripcion, nada: r.nada }));
    } catch (e) {
      fallas++;
      console.log(JSON.stringify({ evento: "foto_guia_falla", sitio: f.id, error: e instanceof ErrorWikimedia ? e.message : "inesperado" }));
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
  ];
  return { estado: "ok", mensaje: partes.filter(Boolean).join(" ") };
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
