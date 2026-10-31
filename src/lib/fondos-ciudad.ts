import { urlPublicaFoto } from "@/lib/fotos";

/*
 * Diseño de prueba 2 "Ciudad de fondo": lo que va detrás del título de la portada en cada ciudad.
 * - "ilustracion": un dibujo propio en el estilo de los afiches (docs/arte/ciudad.py). Es lo que usa Guayaquil hoy.
 * - "foto": una foto (propia, de un banco de fotos o de Wikimedia Commons, con su crédito si la licencia lo pide).
 * Para cambiar el dibujo por una foto profesional, o sumar otra ciudad de Ecuador, basta con cambiar esta lista.
 */

type FotoCiudad = { tipo: "foto"; camino: string; alt: string; credito?: string; licencia?: string; fuente?: string };
type Fondo = { tipo: "ilustracion" } | FotoCiudad;

const FONDOS: Record<string, Fondo> = {
  guayaquil: { tipo: "ilustracion" },
  // Ejemplo de foto (la del Malecón 2000 de la Guía útil):
  // guayaquil: { tipo: "foto", camino: "guia/7bfef9a0-4d04-4447-ad8b-0d364e91a5cc.jpg", alt: "El Malecón 2000 junto al río Guayas",
  //   credito: "Freddy eduardo", licencia: "CC BY-SA 4.0", fuente: "https://commons.wikimedia.org/wiki/File:Vista_del_Malec%C3%B3n_2000.jpg" },
};

export type FondoCiudad = { tipo: "ilustracion" } | (FotoCiudad & { src: string });

/** El fondo de una ciudad, o null si todavía no tiene (entonces se usa el fondo de noche de siempre). */
export function fondoDeCiudad(ciudad: string): FondoCiudad | null {
  const f = FONDOS[ciudad];
  if (!f) return null;
  if (f.tipo === "ilustracion") return f;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? { ...f, src: urlPublicaFoto(base, f.camino) } : null;
}
