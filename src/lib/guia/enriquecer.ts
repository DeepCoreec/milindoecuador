import "server-only";
import type { crearClienteAdmin } from "@/lib/supabase/admin";
import { buscarEnWikimedia, descargarFoto, ErrorWikimedia } from "@/lib/wikimedia";

/*
 * Foto y descripción de UN lugar de la Guía útil (versión 7). Lo usan "Buscar fotos y descripción" (29.3) y
 * "Agregar un lugar" (30.3). Vive aquí y no en un archivo "use server" porque no debe ser un punto de entrada público:
 * quien lo llama ya pasó Zod y requireAdmin.
 */

type Db = ReturnType<typeof crearClienteAdmin>;
export type FilaEnriquecer = { id: string; name: string; latitude: number; longitude: number; wikidata: string | null; wikipedia: string | null };

/**
 * En qué lugares se puede guardar (filtro fijo, nada que venga de afuera):
 * - "busqueda": publicados o candidatos de Wikidata por revisar (botón de 29.3);
 * - "agregado": cualquiera por revisar o publicado (30.3: el admin lo acaba de agregar).
 */
const ESTADOS = {
  busqueda: "status.eq.publicado,and(status.eq.pendiente,osm_type.eq.wikidata)",
  agregado: "status.eq.publicado,status.eq.pendiente",
} as const;

export type ResultadoEnriquecer =
  /** Se guardó (con o sin foto/descripción). */
  | { estado: "listo"; conFoto: boolean; conTexto: boolean; sinFoto: string | null }
  /** El lugar cambió de estado mientras tanto: no se guardó nada. */
  | { estado: "sin-fila" }
  /** Falla pasajera: no se anotó, se reintenta después. */
  | { estado: "pasajero"; motivo: string }
  /** Falla sin arreglo: se anotó como revisado sin foto ni texto (para no trabar el botón). */
  | { estado: "permanente"; motivo: string };

export async function enriquecerSitio(db: Db, f: FilaEnriquecer, donde: keyof typeof ESTADOS, corte?: AbortSignal): Promise<ResultadoEnriquecer> {
  const bucket = db.storage.from("fotos-lugares");
  const anotar = (cambios: Record<string, unknown> = {}) =>
    db.from("city_spots").update({ ...cambios, enriched_at: new Date().toISOString() }).eq("id", f.id).or(ESTADOS[donde]).select("id");
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
    const textos = { ...(foto ?? {}), ...(r.descripcion ? { description: r.descripcion.texto, description_source: r.descripcion.fuente } : {}) };
    let res = await anotar({ wikidata: r.wikidata ?? f.wikidata, ...textos });
    let filtrado = false;
    // El filtro de palabras de la base (0020) rechazó el texto o el autor: el lugar se queda sin foto ni descripción
    if (res.error?.message?.includes("texto_no_permitido")) {
      filtrado = true;
      res = await anotar({ wikidata: r.wikidata ?? f.wikidata });
    }
    if (res.error) throw new ErrorWikimedia("No se pudo guardar");
    // Sin fila actualizada o rechazado por el filtro: la foto no queda suelta en el bucket
    if (subida && (filtrado || !res.data?.length)) await bucket.remove([subida]);
    if (!res.data?.length) return { estado: "sin-fila" };
    const conFoto = !!foto && !filtrado;
    const conTexto = !!r.descripcion && !filtrado;
    console.log(JSON.stringify({ evento: "foto_guia", sitio: f.id, wikidata: r.wikidata, foto: conFoto, descripcion: conTexto, filtrado, nada: r.nada }));
    return { estado: "listo", conFoto, conTexto, sinFoto: filtrado ? "el filtro de palabras rechazó el texto o el autor" : sinFoto };
  } catch (e) {
    if (subida) await bucket.remove([subida]);
    const motivo = e instanceof ErrorWikimedia ? e.message : "inesperado o tiempo agotado";
    const permanente = e instanceof ErrorWikimedia && e.permanente;
    console.log(JSON.stringify({ evento: "foto_guia_falla", sitio: f.id, permanente, error: motivo }));
    if (!permanente) return { estado: "pasajero", motivo };
    await anotar();
    return { estado: "permanente", motivo };
  }
}
