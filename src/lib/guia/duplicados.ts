import "server-only";
import { distancia, MISMO_PUNTO_M, nombresParecidos } from "@/lib/agente/reglas";
import type { crearClienteAdmin } from "@/lib/supabase/admin";

/*
 * ¿Ya está este lugar en la guía? (versión 7: traer de Wikidata, 30.1, y agregar por enlace, 30.3).
 * Cuenta cualquier estado, también lo descartado (si se descartó, no vuelve a entrar).
 */

type Db = ReturnType<typeof crearClienteAdmin>;
export type Existente = { name: string; tipo: string; status: string; latitude: number; longitude: number; wikidata: string | null };
export type Nuevo = { nombre: string; tipo: string; lat: number; lng: number; qid: string | null };

const CERCA_M = 300;
const COLUMNAS = "name, tipo, status, latitude, longitude, wikidata";

/** Lo que ya hay: los que tienen alguno de estos Q (cualquier grupo) y todos los "para visitar", por páginas. */
export async function leerExistentes(db: Db, qids: string[]): Promise<Existente[] | null> {
  const ya: Existente[] = [];
  for (let i = 0; i < qids.length; i += 200) {
    const { data, error } = await db.from("city_spots").select(COLUMNAS).in("wikidata", qids.slice(i, i + 200)).returns<Existente[]>();
    if (error) return null;
    ya.push(...(data ?? []));
  }
  for (let desde = 0; desde < 10_000; desde += 1000) {
    const { data, error } = await db.from("city_spots").select(COLUMNAS).eq("grupo", "visitar").order("id").range(desde, desde + 999).returns<Existente[]>();
    if (error) return null;
    ya.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return ya;
}

/**
 * El lugar existente que es el mismo que `c`, o undefined: mismo Q; nombre parecido a menos de 300 m; o del mismo tipo
 * a menos de 25 m aunque se llame distinto ("A. José de Sucre" y "Monumento a Sucre"; 30.2e).
 */
export function buscarRepetido(c: Nuevo, ya: Existente[]): Existente | undefined {
  return ya.find((e) => {
    if (c.qid && e.wikidata === c.qid) return true;
    const d = distancia({ lat: c.lat, lng: c.lng }, { lat: e.latitude, lng: e.longitude });
    return (d < CERCA_M && nombresParecidos(c.nombre, e.name)) || (d < MISMO_PUNTO_M && e.tipo === c.tipo);
  });
}
