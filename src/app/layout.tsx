import type { Metadata, Viewport } from "next";
import { fuenteHistoria, fuenteRotulo, fuenteSans } from "./fonts";
import "./globals.css";
import { Paumi } from "@/components/paumi/Paumi";
import { paumiActivo } from "@/lib/paumi/config";
import { NOMBRE_SITIO, paraCompartir, urlSitio } from "@/lib/sitio";

const descripcion = "La guía de Guayaquil hecha por su gente: dónde comer, dormir, pasear y qué visitar.";

export const metadata: Metadata = {
  metadataBase: urlSitio(),
  title: NOMBRE_SITIO,
  description: descripcion,
  ...paraCompartir(NOMBRE_SITIO, descripcion, "/"),
};

/** Color de la barra del navegador en el teléfono, según el modo claro u oscuro. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F8FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1D28" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${fuenteRotulo.variable} ${fuenteSans.variable} ${fuenteHistoria.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        {/* Paumi (versión 3): solo con el interruptor PAUMI_ACTIVO=si y la clave de Anthropic en el servidor */}
        {paumiActivo() && <Paumi />}
      </body>
    </html>
  );
}
