"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { EstadoAdmin } from "@/acciones/admin";
import { requireAdmin } from "@/lib/auth";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { esquemaBuscarFotosGuia, esquemaQuitarFotoSitio } from "@/lib/validacion/admin";
import { enriquecerSitio } from "@/lib/guia/enriquecer";

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
