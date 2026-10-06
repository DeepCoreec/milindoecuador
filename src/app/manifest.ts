import type { MetadataRoute } from "next";

/** Datos para instalar la guía como app en el teléfono (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mi Lindo Ecuador",
    short_name: "Mi Lindo Ecuador",
    description: "La guía de Guayaquil hecha por su gente: dónde comer, dormir, pasear y qué visitar.",
    lang: "es-EC",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0B1D28",
    theme_color: "#0B1D28",
    categories: ["travel", "food", "lifestyle"],
    icons: [
      { src: "/iconos/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
