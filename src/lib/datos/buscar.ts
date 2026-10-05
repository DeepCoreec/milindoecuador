import { normalizar } from "@/lib/validacion/busqueda";
import type { LugarResumen } from "./tipos";

/**
 * Busca palabra por palabra en nombre, datos, sector y categoría: un lugar aparece si contiene
 * todas las palabras. Los que coinciden en el nombre van primero.
 * Con Supabase esto lo hará la base (búsqueda de texto completo en español).
 */
export function buscarEn(lugares: (LugarResumen & { textoCategoria: string })[], q: string): LugarResumen[] {
  const palabras = normalizar(q).split(/\s+/).filter(Boolean);
  const puntaje = (l: LugarResumen & { textoCategoria: string }) => {
    const nombre = normalizar(l.nombre);
    const todo = normalizar([l.nombre, l.datos, l.sector, l.textoCategoria, l.extra ?? ""].join(" "));
    if (!palabras.every((p) => todo.includes(p))) return -1;
    return palabras.filter((p) => nombre.includes(p)).length;
  };
  return lugares
    .map((l) => ({ l, p: puntaje(l) }))
    .filter((x) => x.p >= 0)
    .sort((a, b) => b.p - a.p || a.l.nombre.localeCompare(b.l.nombre, "es"))
    .map(({ l }) => {
      const { textoCategoria: _, ...resto } = l; // eslint-disable-line @typescript-eslint/no-unused-vars
      return resto;
    });
}
