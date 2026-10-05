import type { Metadata } from "next";

/*
 * Dirección pública del sitio, para enlaces absolutos (tarjetas al compartir, sitemap).
 * Sale de NEXT_PUBLIC_SITE_URL; si falta o no es una dirección válida, se usa la local.
 */
export function urlSitio(): URL {
  try {
    const u = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "");
    if (u.protocol === "https:" || u.hostname === "localhost") return new URL(u.origin);
  } catch {}
  return new URL("http://localhost:3000");
}

export const NOMBRE_SITIO = "Mi Lindo Ecuador";

/** Metadatos para compartir de una página: título, descripción y su dirección canónica. */
export function paraCompartir(titulo: string, descripcion: string, ruta: string): Pick<Metadata, "openGraph" | "alternates" | "twitter"> {
  return {
    alternates: { canonical: ruta },
    openGraph: { title: titulo, description: descripcion, url: ruta, siteName: NOMBRE_SITIO, locale: "es_EC", type: "website" },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion },
  };
}
