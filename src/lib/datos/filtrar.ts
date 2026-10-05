import type { Filtros } from "@/lib/validacion/filtros";
import type { LugarResumen } from "./tipos";

/*
 * Filtrar y ordenar lugares. Con Supabase esto lo hará la consulta;
 * mientras tanto se hace aquí, con las mismas reglas.
 */

/** Destacado pesa más que verificado; los dos juntos, más que cualquiera solo. */
const peso = (l: LugarResumen) => (l.destacado ? 2 : 0) + (l.verificado ? 1 : 0);

/** Mejor calificado primero; los que no tienen reseñas van al final. */
function porCalificacion(a: LugarResumen, b: LugarResumen) {
  return (b.promedio ?? -1) - (a.promedio ?? -1) || b.cantidad - a.cantidad;
}

export function filtrarLugares(lugares: LugarResumen[], f: Filtros): LugarResumen[] {
  const quedan = lugares.filter(
    (l) => (!f.sector || l.sector === f.sector) && (f.precios.length === 0 || (l.precio !== null && f.precios.includes(l.precio))),
  );
  const orden =
    f.orden === "resenas"
      ? (a: LugarResumen, b: LugarResumen) => b.cantidad - a.cantidad || porCalificacion(a, b)
      : f.orden === "calificacion"
        ? porCalificacion
        : (a: LugarResumen, b: LugarResumen) => peso(b) - peso(a) || porCalificacion(a, b);
  return quedan.sort(orden);
}

export function sectoresDe(lugares: LugarResumen[]): string[] {
  return [...new Set(lugares.map((l) => l.sector))].sort((a, b) => a.localeCompare(b, "es"));
}
