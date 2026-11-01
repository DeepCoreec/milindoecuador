import { urlPublicaFoto } from "@/lib/fotos";

/*
 * Diseño de prueba 2 "Ciudad de fondo": lo que va detrás del título de la portada en cada ciudad.
 * - "ilustracion": un dibujo propio en el estilo de los afiches (docs/arte/ciudad.py). Es lo que usa Guayaquil hoy.
 * - "foto": una foto (propia, de un banco de fotos o de Wikimedia Commons, con su crédito si la licencia lo pide).
 * Para cambiar el dibujo por una foto profesional, o sumar otra ciudad de Ecuador, basta con cambiar esta lista.
 */

type FotoCiudad = { tipo: "foto"; camino: string; alt: string; credito?: string; licencia?: string; fuente?: string };
/** Una foto de un banco de fotos libre para el fondo que va cambiando (src: su dirección exacta, permitida en next.config). */
export type FotoFondo = { src: string; alt: string; credito: string; licencia: string; fuente: string; /** Qué parte de la foto se ve al recortarla (en el celular). */ enfoque?: string };
type Fondo = { tipo: "ilustracion" } | FotoCiudad | { tipo: "fotos"; fotos: FotoFondo[] };

/*
 * Pedido del usuario (2026-10-31): Guayaquil de noche desde lo alto, con La Perla, difuminada como en el ejemplo, y que
 * cambie de foto cada rato. Fotos de Jose Garcia (@jg_creative) en Unsplash, "uso gratuito bajo la Licencia Unsplash".
 * Para agregar otra: su dirección de images.unsplash.com (sin "?…") aquí y en FOTOS_PORTADA de next.config.ts.
 */
export const FOTOS_GUAYAQUIL: FotoFondo[] = [
  {
    src: "https://images.unsplash.com/photo-1574570120297-2836722938eb",
    alt: "Guayaquil de noche desde lo alto: La Perla, el Malecón 2000 y el río Guayas",
    enfoque: "22% 55%", // La Perla está a la izquierda
    credito: "Jose Garcia",
    licencia: "Unsplash",
    fuente: "https://unsplash.com/es/fotos/foto-aerea-de-la-ciudad-iEPBfZbpn9g",
  },
  {
    src: "https://images.unsplash.com/photo-1574570119220-01b7e3dfcc8d",
    alt: "La Perla, la noria del Malecón 2000, iluminada de azul por la noche",
    credito: "Jose Garcia",
    licencia: "Unsplash",
    fuente: "https://unsplash.com/es/fotos/rueda-de-la-fortuna-iluminada-de-azul-durante-la-noche-03EpxB-WpUc",
  },
];

const FONDOS: Record<string, Fondo> = {
  guayaquil: { tipo: "fotos", fotos: FOTOS_GUAYAQUIL },
  // Antes (hasta el 2026-10-31): la ilustración animada → guayaquil: { tipo: "ilustracion" },
  // Ejemplo de foto (la del Malecón 2000 de la Guía útil):
  // guayaquil: { tipo: "foto", camino: "guia/7bfef9a0-4d04-4447-ad8b-0d364e91a5cc.jpg", alt: "El Malecón 2000 junto al río Guayas",
  //   credito: "Freddy eduardo", licencia: "CC BY-SA 4.0", fuente: "https://commons.wikimedia.org/wiki/File:Vista_del_Malec%C3%B3n_2000.jpg" },
};

export type FondoCiudad = { tipo: "ilustracion" } | (FotoCiudad & { src: string }) | { tipo: "fotos"; fotos: FotoFondo[] };

/** El fondo de una ciudad, o null si todavía no tiene (entonces se usa el fondo de noche de siempre). */
export function fondoDeCiudad(ciudad: string): FondoCiudad | null {
  const f = FONDOS[ciudad];
  if (!f) return null;
  if (f.tipo === "ilustracion" || f.tipo === "fotos") return f;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? { ...f, src: urlPublicaFoto(base, f.camino) } : null;
}
