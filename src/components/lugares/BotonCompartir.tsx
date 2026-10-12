"use client";

import { useState } from "react";
import { clasesBoton } from "@/components/ui/Boton";
import { IconoCompartir } from "@/components/ui/iconos";

/**
 * Compartir la ficha. En el celular abre el menú de compartir del teléfono (WhatsApp, Instagram…);
 * donde no existe, copia el enlace y lo avisa.
 */
export function BotonCompartir({ titulo, texto, compacto = false }: { titulo: string; texto: string; compacto?: boolean }) {
  const [aviso, setAviso] = useState("");

  async function compartir() {
    const url = window.location.href.split("?")[0];
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, text: texto, url });
      } catch {
        // la persona cerró el menú: no pasa nada
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setAviso("Enlace copiado");
    } catch {
      setAviso("No se pudo copiar. Copia la dirección de arriba.");
    }
    setTimeout(() => setAviso(""), 4000);
  }

  return (
    <span className={compacto ? "contents" : "inline-flex items-center gap-2"}>
      <button type="button" onClick={compartir} aria-label={compacto ? "Compartir" : undefined} className={clasesBoton(compacto ? "secundario" : "texto", "normal", compacto ? "w-12 flex-none px-0!" : "")}>
        <IconoCompartir />
        {!compacto && "Compartir"}
      </button>
      <span role="status" className={compacto ? "sr-only" : "text-sm leading-5 text-rio-suave"}>
        {aviso}
      </span>
    </span>
  );
}
