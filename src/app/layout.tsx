import type { Metadata } from "next";
import { fuenteHistoria, fuenteRotulo, fuenteSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mi Lindo Ecuador",
  description: "La guía de Guayaquil hecha por su gente: dónde comer, dormir, pasear y qué visitar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${fuenteRotulo.variable} ${fuenteSans.variable} ${fuenteHistoria.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
