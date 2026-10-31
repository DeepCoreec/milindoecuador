import { urlPublicaFoto } from "@/lib/fotos";

/*
 * Diseño de prueba 2 "Ciudad de fondo": la foto de cada ciudad detrás del título de la portada. Hoy solo Guayaquil;
 * cuando la guía llegue a otras ciudades de Ecuador, cada una suma aquí su foto (con licencia libre y su crédito).
 * Las fotos están en nuestro almacenamiento (copiadas de Wikimedia Commons por la Guía útil, versión 7).
 */

export type FondoCiudad = { camino: string; alt: string; credito: string; licencia: string; fuente: string };

const FONDOS: Record<string, FondoCiudad> = {
  guayaquil: {
    camino: "guia/7bfef9a0-4d04-4447-ad8b-0d364e91a5cc.jpg",
    alt: "El Malecón 2000 de Guayaquil junto al río Guayas",
    credito: "Freddy eduardo",
    licencia: "CC BY-SA 4.0",
    fuente: "https://commons.wikimedia.org/wiki/File:Vista_del_Malec%C3%B3n_2000.jpg",
  },
};

/** La foto de fondo de una ciudad, o null si todavía no tiene (entonces se usa el fondo de noche de siempre). */
export function fondoDeCiudad(ciudad: string): (FondoCiudad & { src: string }) | null {
  const f = FONDOS[ciudad];
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!f || !base) return null;
  return { ...f, src: urlPublicaFoto(base, f.camino) };
}
