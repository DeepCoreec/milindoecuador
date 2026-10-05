import type { Filtros } from "@/lib/validacion/filtros";
import type { LugarResumen, Plan } from "./tipos";

/*
 * Filtrar y ordenar lugares. Con Supabase esto lo hará la consulta;
 * mientras tanto se hace aquí, con las mismas reglas.
 */

const PESO_PLAN: Record<Plan, number> = { destacado: 2, verificado: 1, gratis: 0 };

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
        : (a: LugarResumen, b: LugarResumen) => PESO_PLAN[b.plan] - PESO_PLAN[a.plan] || porCalificacion(a, b);
  return quedan.sort(orden);
}

export function sectoresDe(lugares: LugarResumen[]): string[] {
  return [...new Set(lugares.map((l) => l.sector))].sort((a, b) => a.localeCompare(b, "es"));
}
