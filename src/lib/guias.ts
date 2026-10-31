/*
 * Guías turísticos (versión 13, fase 41). Listas fijas de idiomas y especialidades: son las mismas que acepta la base
 * (migración 0023), así nadie escribe lo que quiera y en la ficha se ven siempre igual.
 */

export const IDIOMAS = {
  es: "Español",
  en: "Inglés",
  fr: "Francés",
  de: "Alemán",
  pt: "Portugués",
  it: "Italiano",
  zh: "Chino",
  ja: "Japonés",
  ko: "Coreano",
  ru: "Ruso",
  kichwa: "Kichwa",
} as const;

export const ESPECIALIDADES = {
  historia: "Historia y cultura",
  naturaleza: "Naturaleza",
  aves: "Aves",
  gastronomia: "Comida típica",
  aventura: "Aventura",
  nocturno: "Recorridos de noche",
  fotografia: "Fotografía",
  arte: "Arte y museos",
  compras: "Artesanías y mercados",
} as const;

export type Idioma = keyof typeof IDIOMAS;
export type Especialidad = keyof typeof ESPECIALIDADES;

export const CODIGOS_IDIOMA = Object.keys(IDIOMAS) as [Idioma, ...Idioma[]];
export const CODIGOS_ESPECIALIDAD = Object.keys(ESPECIALIDADES) as [Especialidad, ...Especialidad[]];

/** Catastro turístico del MINTUR: ahí el admin busca el número de credencial antes de poner la insignia. */
export const CATASTRO_MINTUR = "https://servicios.turismo.gob.ec/catastro-turistico/";

/** Lo que se lee de la base, solo con los códigos conocidos y en el orden de la lista. */
export function leerLista<T extends string>(valor: unknown, nombres: Record<T, string>): T[] {
  if (!Array.isArray(valor)) return [];
  return (Object.keys(nombres) as T[]).filter((c) => valor.includes(c));
}

/** "Español, Inglés y Francés". */
export function enFrase(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}
