import type { MetadataRoute } from "next";
import { getCategorias, getCiudades, getLugaresDeCiudad, rutaLugar } from "@/lib/datos/lugares";
import { getEventos } from "@/lib/datos/eventos";
import { getSitios, rutaSitio } from "@/lib/datos/sitios";
import { urlSitio } from "@/lib/sitio";

/** Mapa del sitio para Google: inicio, ciudades, categorías y lugares reales (nunca los de ejemplo). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlSitio();
  const url = (ruta: string) => new URL(ruta, base).toString();
  const [ciudades, categorias] = await Promise.all([getCiudades(), getCategorias()]);

  const paginas: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/negocios/registro"), changeFrequency: "monthly", priority: 0.5 },
    { url: url("/negocios/planes"), changeFrequency: "monthly", priority: 0.5 },
    { url: url("/legal/terminos"), changeFrequency: "yearly", priority: 0.2 },
    { url: url("/legal/privacidad"), changeFrequency: "yearly", priority: 0.2 },
  ];
  for (const ciudad of ciudades) {
    paginas.push({ url: url(`/${ciudad.slug}`), changeFrequency: "weekly", priority: 0.8 });
    for (const c of categorias) paginas.push({ url: url(`/${ciudad.slug}/${c.slug}`), changeFrequency: "daily", priority: 0.7 });
    const lugares = await getLugaresDeCiudad(ciudad.slug);
    for (const l of lugares.filter((l) => !l.ejemplo)) {
      paginas.push({ url: url(rutaLugar(ciudad.slug, l)), changeFrequency: "weekly", priority: 0.6 });
    }
  }
  // Versión 5: eventos vigentes de Guayaquil
  paginas.push({ url: url("/guayaquil/eventos"), changeFrequency: "daily", priority: 0.7 });
  paginas.push({ url: url("/guayaquil/guia-util"), changeFrequency: "weekly", priority: 0.6 });
  // Versión 11 (39.3): lugares para visitar con foto o descripción (los demás no se ofrecen a Google)
  for (const s of await getSitios().catch(() => [])) {
    if (s.grupo === "visitar" && (s.foto || s.descripcion || s.nota)) paginas.push({ url: url(rutaSitio(s)), changeFrequency: "monthly", priority: 0.5 });
  }
  for (const e of await getEventos().catch(() => [])) paginas.push({ url: url(`/guayaquil/eventos/${e.slug}`), changeFrequency: "daily", priority: 0.5 });
  return paginas;
}
