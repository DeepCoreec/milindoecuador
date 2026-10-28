"use server";

import { revalidatePath } from "next/cache";
import type { EstadoAdmin } from "@/acciones/admin";
import { requireAdmin } from "@/lib/auth";
import { buscarRepetido, leerExistentes } from "@/lib/guia/duplicados";
import { leerEnlace } from "@/lib/guia/enlace";
import { enriquecerSitio } from "@/lib/guia/enriquecer";
import { aSitios, urlOverpass } from "@/lib/osm";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { esquemaAgregarSitio } from "@/lib/validacion/admin";
import { buscarCandidatosWikidata } from "@/lib/wikidata-lugares";
import { ErrorWikimedia, qidDeWikipedia } from "@/lib/wikimedia";

/*
 * "Agregar un lugar" en /admin/guia (versión 7, fase 30.3; plan en docs/PLAN-V7.md): el admin pega el enlace de
 * Wikipedia, Wikidata u OpenStreetMap de un lugar que encontró. Entra "por revisar" (nunca publicado), sin duplicar,
 * y en el mismo clic se buscan su foto y su descripción. Con Wikipedia/Wikidata vale la misma regla de calidad que al
 * traer de Wikidata (foto, artículo en español, ubicación en Guayaquil, lugar turístico); con OpenStreetMap, que sea
 * de un tipo de la guía, con nombre y dentro de Guayaquil.
 * Orden: Zod → requireAdmin → admin.ts (después de requireAdmin).
 */

const AGENTE = "MiLindoEcuador/1.0 (https://milindoecuador.vercel.app; guia de Guayaquil)";
type Fila = { id: string; name: string; latitude: number; longitude: number; wikidata: string | null; wikipedia: string | null };
const NO_CUMPLE =
  "Ese lugar no cumple lo que pide la guía: tiene que estar en Guayaquil, ser un lugar para visitar y tener foto y artículo en Wikipedia en español.";

export async function agregarSitio(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaAgregarSitio.safeParse({ enlace: datos.get("enlace") });
  if (!r.success) return { estado: "error", mensaje: r.error.issues[0]?.message ?? "Enlace inválido" };
  await requireAdmin();
  const enlace = leerEnlace(r.data.enlace);
  if (!enlace) return { estado: "error", mensaje: "Pega un enlace de Wikipedia, Wikidata u OpenStreetMap (los de Google Maps o redes sociales no sirven: no podemos usar sus datos)." };

  const db = crearClienteAdmin();
  const { data: ciudad } = await db.from("cities").select("id").eq("slug", "guayaquil").single();
  if (!ciudad) return { estado: "error", mensaje: "No se encontró la ciudad" };

  // 1. Qué lugar es, con los datos de su fuente
  let fila: Record<string, unknown>;
  let nuevo: { nombre: string; tipo: string; lat: number; lng: number; qid: string | null };
  try {
    if (enlace.fuente === "osm") {
      const r2 = await fetch(urlOverpass(), {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": AGENTE },
        body: new URLSearchParams({ data: `[out:json][timeout:20];${enlace.tipo}(${enlace.id});out center tags;` }),
        signal: AbortSignal.timeout(25_000),
        redirect: "error",
      });
      if (!r2.ok) return { estado: "error", mensaje: `OpenStreetMap no respondió (código ${r2.status}). Inténtalo en unos minutos.` };
      const texto = await r2.text();
      if (texto.length > 1_000_000) return { estado: "error", mensaje: "La respuesta de OpenStreetMap fue demasiado grande." };
      const s = aSitios(JSON.parse(texto))[0];
      if (!s) return { estado: "error", mensaje: "Ese lugar de OpenStreetMap no tiene nombre, no es de un tipo de la guía o está fuera de Guayaquil." };
      fila = { ...s, city_id: ciudad.id };
      nuevo = { nombre: s.name, tipo: s.tipo, lat: s.latitude, lng: s.longitude, qid: s.wikidata };
    } else {
      const qid = enlace.fuente === "wikidata" ? enlace.qid : await qidDeWikipedia(enlace.idioma, enlace.titulo);
      if (!qid) return { estado: "error", mensaje: "No se encontró ese artículo de Wikipedia, o no tiene ficha en Wikidata." };
      const c = (await buscarCandidatosWikidata(fetch, qid))[0];
      if (!c) return { estado: "error", mensaje: NO_CUMPLE };
      fila = { city_id: ciudad.id, osm_type: "wikidata", osm_id: Number(c.qid.slice(1)), grupo: "visitar", tipo: c.tipo, name: c.nombre, latitude: c.lat, longitude: c.lng, wikidata: c.qid };
      nuevo = c;
    }
  } catch (e) {
    return { estado: "error", mensaje: `No se pudo consultar la fuente (${e instanceof ErrorWikimedia ? e.message : "error de conexión"}). Inténtalo en unos minutos.` };
  }

  // 2. ¿Ya está?
  const ya = await leerExistentes(db, nuevo.qid ? [nuevo.qid] : []);
  if (!ya) return { estado: "error", mensaje: "No se pudo leer la guía" };
  const repetido = buscarRepetido(nuevo, ya);
  if (repetido) {
    const estado = { publicado: "publicado", pendiente: "por revisar", descartado: "descartado" }[repetido.status] ?? repetido.status;
    return { estado: "error", mensaje: `Ya está en la guía como «${repetido.name}» (${estado}).` };
  }

  // 3. Guardar por revisar y buscar su foto y descripción
  const { data: guardado, error } = await db
    .from("city_spots")
    .upsert(fila, { onConflict: "osm_type,osm_id", ignoreDuplicates: true })
    .select("id, name, latitude, longitude, wikidata, wikipedia")
    .returns<Fila[]>();
  if (error) return { estado: "error", mensaje: error.message.includes("texto_no_permitido") ? "El nombre del lugar no pasa el filtro de palabras." : "No se pudo guardar" };
  const f = guardado?.[0];
  if (!f) return { estado: "error", mensaje: "Ese lugar ya estaba en la guía." };
  const e = await enriquecerSitio(db, f, "agregado", AbortSignal.timeout(25_000));
  revalidatePath("/admin/guia");
  const detalle =
    e.estado === "listo"
      ? e.conFoto && e.conTexto
        ? "con foto y descripción"
        : e.conFoto
          ? "con foto, sin descripción"
          : e.conTexto
            ? `con descripción, sin foto (${e.sinFoto ?? "sin foto"})`
            : `sin foto ni descripción (${e.sinFoto ?? "no hay en Wikipedia"})`
      : e.estado === "pasajero"
        ? "la foto se buscará con «Buscar fotos y descripción» (Wikimedia no respondió)"
        : e.estado === "permanente"
          ? `sin foto ni descripción (${e.motivo})`
          : "";
  return { estado: "ok", mensaje: `Agregado por revisar: «${f.name}», ${detalle}. Pide la revisión al agente o publícalo desde «Por revisar».` };
}
