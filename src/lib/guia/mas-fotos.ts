import "server-only";
import { z } from "zod";
import type { crearClienteAdmin } from "@/lib/supabase/admin";
import { firmaDeDatos } from "@/lib/firmaArchivo";
import { buscarMasEnWikimedia, descargarFoto, ErrorWikimedia } from "@/lib/wikimedia";

/*
 * Más fotos, párrafo y datos rápidos de UN lugar de la Guía útil (versión 12, fase 40.2). Lo usa "Traer más fotos" del
 * panel; vive aquí (no en "use server") porque quien lo llama ya pasó Zod y requireAdmin.
 * Cada foto se copia a NUESTRO bucket (guia/<lugar>/<uuid>.<ext>) y se guarda con su autor, licencia y enlace. Si el
 * filtro de palabras rechaza el autor de una foto, esa foto se borra y se sigue con las demás.
 */

type Db = ReturnType<typeof crearClienteAdmin>;
export type FilaMas = { id: string; name: string; wikidata: string; photo_source: string | null; description_source: string | null };

/** Lo que se guarda en `facts`: solo estas claves y textos cortos (además de lo que exige la base). */
const esquemaDatos = z
  .object({ inaugurado: z.string().regex(/^\d{3,4}$/).optional(), superficie: z.string().max(40).optional(), patrimonio: z.string().max(120).optional() })
  .strict();

export type ResultadoMas = { estado: "listo"; fotos: number; parrafo: boolean; datos: boolean } | { estado: "pasajero"; motivo: string } | { estado: "sin-fila" };

export async function traerMasDeUnSitio(db: Db, f: FilaMas, maximo: number, corte?: AbortSignal): Promise<ResultadoMas> {
  const bucket = db.storage.from("fotos-lugares");
  let r;
  try {
    r = await buscarMasEnWikimedia(f.wikidata, f.photo_source, maximo, fetch, corte);
  } catch (e) {
    const motivo = e instanceof ErrorWikimedia ? e.message : "inesperado o tiempo agotado";
    console.log(JSON.stringify({ evento: "mas_fotos_falla", sitio: f.id, error: motivo }));
    // Falla de Wikimedia: no se anota, se reintenta en otro clic (salvo que sea permanente)
    if (!(e instanceof ErrorWikimedia && e.permanente)) return { estado: "pasajero", motivo };
    r = { fotos: [], parrafo: null, datos: {}, web: null };
  }

  // Cuántas tiene ya (para el orden y el tope de 8)
  const { data: ya } = await db.from("city_spot_photos").select("source, sort_order").eq("spot_id", f.id).order("sort_order", { ascending: false });
  const fuentes = new Set((ya ?? []).map((x) => x.source));
  let orden = (ya?.[0]?.sort_order ?? 0) + 1;
  let guardadas = 0;
  for (const foto of r.fotos) {
    if ((ya?.length ?? 0) + guardadas >= 8) break;
    if (fuentes.has(foto.fuente)) continue;
    let camino: string | null = null;
    try {
      const d = await descargarFoto(foto.url, fetch, corte);
      // Que de verdad sea una foto (no solo lo que dice el servidor)
      if (!firmaDeDatos(d.datos, [d.extension === "jpg" ? "jpeg" : d.extension])) throw new ErrorWikimedia("el archivo no es una foto", true);
      camino = `guia/${f.id}/${crypto.randomUUID()}.${d.extension}`;
      const { error: e } = await bucket.upload(camino, d.datos, { contentType: d.tipo, cacheControl: "604800" });
      if (e) throw new ErrorWikimedia("no se pudo guardar en el bucket");
      const { error } = await db.from("city_spot_photos").insert({
        spot_id: f.id,
        storage_path: camino,
        alt_text: `Foto de ${f.name}`.slice(0, 160),
        credit: foto.credito,
        license: foto.licencia,
        source: foto.fuente,
        sort_order: orden,
      });
      if (error) throw new ErrorWikimedia(error.message.includes("texto_no_permitido") ? "filtro de palabras" : "no se pudo guardar la foto", true);
      guardadas++;
      orden++;
    } catch (e) {
      if (camino) await bucket.remove([camino]);
      console.log(JSON.stringify({ evento: "mas_fotos_foto", sitio: f.id, error: e instanceof Error ? e.message.slice(0, 80) : "?" }));
      // Si se acabó el tiempo, se para aquí; lo demás se intenta en otro clic
      if (corte?.aborted) break;
    }
  }

  const datos = esquemaDatos.safeParse(r.datos);
  const cambios: Record<string, unknown> = { photos_at: new Date().toISOString() };
  // El párrafo va con la fuente de Wikipedia que el lugar ya tiene (el mismo artículo de su ficha); sin ella, no se pone
  if (r.parrafo && f.description_source) cambios.description_long = r.parrafo.texto;
  if (datos.success && Object.keys(datos.data).length) cambios.facts = datos.data;
  const anotar = (c: Record<string, unknown>) => db.from("city_spots").update(c).eq("id", f.id).eq("status", "publicado").select("id");
  let res = await anotar(cambios);
  // El filtro de palabras rechazó el párrafo o los datos: se guarda solo la fecha
  if (res.error?.message?.includes("texto_no_permitido")) {
    delete cambios.description_long;
    delete cambios.facts;
    res = await anotar(cambios);
  }
  // La página oficial, solo si el lugar no tiene una
  if (r.web) await db.from("city_spots").update({ website: r.web }).eq("id", f.id).is("website", null);
  if (!res.data?.length) return { estado: "sin-fila" };
  console.log(JSON.stringify({ evento: "mas_fotos", sitio: f.id, fotos: guardadas, parrafo: !!cambios.description_long, datos: !!cambios.facts }));
  return { estado: "listo", fotos: guardadas, parrafo: !!cambios.description_long, datos: !!cambios.facts };
}
