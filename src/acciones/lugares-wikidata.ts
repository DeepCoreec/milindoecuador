"use server";

import { revalidatePath } from "next/cache";
import type { EstadoAdmin } from "@/acciones/admin";
import { distancia, MISMO_PUNTO_M, nombresParecidos } from "@/lib/agente/reglas";
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
type Existente = { name: string; tipo: string; latitude: number; longitude: number; wikidata: string | null };

/** Espera entre importaciones, para cuidar el servicio público de Wikidata (revisión del 2026-10-28, hallazgo 3). */
const ESPERA_MS = 10 * 60_000;
const LIMITE_MS = 50_000;

export async function importarWikidata(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  if (!esquemaBuscarFotosGuia.safeParse(Object.fromEntries(datos)).success) return { estado: "error", mensaje: "Datos inválidos" };
  await requireAdmin();
  const inicio = Date.now();
  const db = crearClienteAdmin();
  const { data: ultimo } = await db
    .from("city_spots")
    .select("imported_at")
    .eq("osm_type", "wikidata")
    .order("imported_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ imported_at: string }>();
  if (ultimo && Date.now() - Date.parse(ultimo.imported_at) < ESPERA_MS) return { estado: "error", mensaje: "Ya se trajeron lugares de Wikidata hace poco. Espera 10 minutos." };

  let candidatos: CandidatoWikidata[];
  try {
    candidatos = await buscarCandidatosWikidata();
  } catch (e) {
    return { estado: "error", mensaje: `No se pudo consultar Wikidata (${e instanceof ErrorWikimedia ? e.message : "error"}). Inténtalo en unos minutos.` };
  }
  if (!candidatos.length) return { estado: "error", mensaje: "Wikidata no devolvió lugares." };

  // Lo que ya hay, para no duplicar: los que tienen alguno de estos Q (cualquier grupo) y todos los "para visitar",
  // leídos por páginas (la API entrega como mucho 1000 filas por pedido; hallazgo 2)
  const { data: ciudad } = await db.from("cities").select("id").eq("slug", "guayaquil").single();
  if (!ciudad) return { estado: "error", mensaje: "No se encontró la ciudad" };
  const ya: Existente[] = [];
  for (let i = 0; i < candidatos.length; i += 200) {
    const { data, error } = await db.from("city_spots").select("name, tipo, latitude, longitude, wikidata").in("wikidata", candidatos.slice(i, i + 200).map((c) => c.qid)).returns<Existente[]>();
    if (error) return { estado: "error", mensaje: "No se pudo leer la guía" };
    ya.push(...(data ?? []));
  }
  for (let desde = 0; desde < 10_000; desde += 1000) {
    const { data, error } = await db
      .from("city_spots")
      .select("name, tipo, latitude, longitude, wikidata")
      .eq("grupo", "visitar")
      .order("id")
      .range(desde, desde + 999)
      .returns<Existente[]>();
    if (error) return { estado: "error", mensaje: "No se pudo leer la guía" };
    ya.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }

  const nuevos: CandidatoWikidata[] = [];
  let repetidos = 0;
  for (const c of candidatos) {
    const igual = ya.some((e) => {
      if (e.wikidata === c.qid) return true;
      const d = distancia({ lat: c.lat, lng: c.lng }, { lat: e.latitude, lng: e.longitude });
      // Nombre parecido cerca, o del mismo tipo casi en el mismo punto aunque se llame distinto (fase 30)
      return (d < CERCA_M && nombresParecidos(c.nombre, e.name)) || (d < MISMO_PUNTO_M && e.tipo === c.tipo);
    });
    if (igual) {
      repetidos++;
      continue;
    }
    nuevos.push(c);
    ya.push({ name: c.nombre, tipo: c.tipo, latitude: c.lat, longitude: c.lng, wikidata: c.qid });
  }

  // Se guardan por lotes, como en OpenStreetMap; si un nombre no pasa el filtro de palabras, ese lote va uno por uno.
  // Antes de cada lote se mira el reloj para no pasar los 60 s de Vercel (hallazgo 1): lo que falte, en otro clic.
  const fila = (c: CandidatoWikidata) => ({
    city_id: ciudad.id,
    osm_type: "wikidata",
    osm_id: Number(c.qid.slice(1)),
    grupo: "visitar",
    tipo: c.tipo,
    name: c.nombre,
    latitude: c.lat,
    longitude: c.lng,
    wikidata: c.qid,
  });
  let guardados = 0;
  let rechazados = 0;
  let cortado = false;
  const nombres: string[] = [];
  for (let i = 0; i < nuevos.length; i += 100) {
    if (Date.now() - inicio > LIMITE_MS) {
      cortado = true;
      break;
    }
    const lote = nuevos.slice(i, i + 100);
    const { data, error } = await db.from("city_spots").upsert(lote.map(fila), { onConflict: "osm_type,osm_id", ignoreDuplicates: true }).select("name");
    if (!error) {
      guardados += data?.length ?? 0;
      for (const x of data ?? []) if (nombres.length < 12) nombres.push(x.name as string);
      continue;
    }
    for (const c of lote) {
      const r = await db.from("city_spots").upsert(fila(c), { onConflict: "osm_type,osm_id", ignoreDuplicates: true }).select("name");
      if (r.error) rechazados++;
      else if (r.data?.length) {
        guardados++;
        if (nombres.length < 12) nombres.push(c.nombre);
      }
    }
  }
  console.log(JSON.stringify({ evento: "wikidata_guia", candidatos: candidatos.length, repetidos, guardados, rechazados, cortado }));
  revalidatePath("/admin/guia");
  return {
    estado: "ok",
    mensaje:
      `Wikidata tiene ${candidatos.length} lugares turísticos con foto y artículo: ${guardados} nuevos por revisar, ${repetidos} ya estaban en la guía` +
      `${rechazados ? ` y ${rechazados} saltados por el filtro de palabras` : ""}.` +
      (cortado ? " Se acabó el tiempo antes de guardar todos: vuelve a tocar el botón en 10 minutos." : "") +
      (nombres.length ? ` Nuevos: ${nombres.join(" · ")}${guardados > nombres.length ? "…" : ""}` : ""),
  };
}
