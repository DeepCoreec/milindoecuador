import type { MetadataRoute } from "next";
import { getCategorias, getCiudades, getLugaresDeCiudad, rutaLugar } from "@/lib/datos/lugares";
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
  return paginas;
}
