import type { MetadataRoute } from "next";
import { urlSitio } from "@/lib/sitio";

/** Qué pueden recorrer los buscadores: todo lo público, nada privado ni de pruebas. */
export default function robots(): MetadataRoute.Robots {
  const base = urlSitio();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dev/", "/admin", "/cuenta", "/mi-negocio", "/auth/", "/api/", "/buscar", "/entrar", "/crear-cuenta", "/recuperar"] },
    sitemap: new URL("/sitemap.xml", base).toString(),
  };
}
