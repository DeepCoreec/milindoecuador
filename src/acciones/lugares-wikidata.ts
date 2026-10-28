"use server";

import { revalidatePath } from "next/cache";
import type { EstadoAdmin } from "@/acciones/admin";
import { distancia, nombresParecidos } from "@/lib/agente/reglas";
import { requireAdmin } from "@/lib/auth";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { esquemaBuscarFotosGuia } from "@/lib/validacion/admin";
import { buscarCandidatosWikidata, type CandidatoWikidata } from "@/lib/wikidata-lugares";
import { ErrorWikimedia } from "@/lib/wikimedia";

/*
 * "Traer lugares turísticos de Wikidata" en /admin/guia (versión 7, fase 30.1; plan en docs/PLAN-V7.md).
 * Trae solo lugares con foto, artículo en Wikipedia en español y coordenadas, de clases turísticas, y los guarda
 * "por revisar" (nunca publicados). No duplica: se salta lo que ya está en la guía con el mismo Q o con nombre parecido
 * a menos de 300 m, en cualquier estado (también lo descartado: si se descartó, no vuelve).
 * Orden: Zod → requireAdmin → admin.ts (después de requireAdmin).
 */

const CERCA_M = 300;
type Existente = { name: string; latitude: number; longitude: number; wikidata: string | null };

export async function importarWikidata(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  if (!esquemaBuscarFotosGuia.safeParse(Object.fromEntries(datos)).success) return { estado: "error", mensaje: "Datos inválidos" };
  await requireAdmin();
  let candidatos: CandidatoWikidata[];
  try {
    candidatos = await buscarCandidatosWikidata();
  } catch (e) {
    return { estado: "error", mensaje: `No se pudo consultar Wikidata (${e instanceof ErrorWikimedia ? e.message : "error"}). Inténtalo en unos minutos.` };
  }
  if (!candidatos.length) return { estado: "error", mensaje: "Wikidata no devolvió lugares." };

  const db = crearClienteAdmin();
  const [{ data: ciudad }, { data: existentes, error }] = await Promise.all([
    db.from("cities").select("id").eq("slug", "guayaquil").single(),
    db.from("city_spots").select("name, latitude, longitude, wikidata").eq("grupo", "visitar").limit(5000).returns<Existente[]>(),
  ]);
  if (!ciudad || error) return { estado: "error", mensaje: "No se pudo leer la guía" };

  const ya = [...(existentes ?? [])];
  const nuevos: CandidatoWikidata[] = [];
  let repetidos = 0;
  for (const c of candidatos) {
    const igual = ya.some(
      (e) => e.wikidata === c.qid || (distancia({ lat: c.lat, lng: c.lng }, { lat: e.latitude, lng: e.longitude }) < CERCA_M && nombresParecidos(c.nombre, e.name)),
    );
    if (igual) {
      repetidos++;
      continue;
    }
    nuevos.push(c);
    ya.push({ name: c.nombre, latitude: c.lat, longitude: c.lng, wikidata: c.qid });
  }

  let guardados = 0;
  let rechazados = 0;
  const nombres: string[] = [];
  for (const c of nuevos) {
    const { data, error: e } = await db
      .from("city_spots")
      .upsert(
        { city_id: ciudad.id, osm_type: "wikidata", osm_id: Number(c.qid.slice(1)), grupo: "visitar", tipo: c.tipo, name: c.nombre, latitude: c.lat, longitude: c.lng, wikidata: c.qid },
        { onConflict: "osm_type,osm_id", ignoreDuplicates: true },
      )
      .select("id");
    if (e) rechazados++; // por ejemplo, el filtro de palabras
    else if (data?.length) {
      guardados++;
      if (nombres.length < 12) nombres.push(c.nombre);
    }
  }
  console.log(JSON.stringify({ evento: "wikidata_guia", candidatos: candidatos.length, repetidos, guardados, rechazados }));
  revalidatePath("/admin/guia");
  return {
    estado: "ok",
    mensaje:
      `Wikidata tiene ${candidatos.length} lugares turísticos con foto y artículo: ${guardados} nuevos por revisar, ${repetidos} ya estaban en la guía` +
      `${rechazados ? ` y ${rechazados} saltados por el filtro de palabras` : ""}.` +
      (nombres.length ? ` Nuevos: ${nombres.join(" · ")}${guardados > nombres.length ? "…" : ""}` : ""),
  };
}
