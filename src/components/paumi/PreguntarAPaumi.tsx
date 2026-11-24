"use client";

import { clasesBoton } from "@/components/ui/Boton";
import { EVENTO_PREGUNTAR_PAUMI, type PreguntarPaumi } from "@/lib/paumi/evento";

/** Botón «Pregúntale a Paumi»: abre su ventana con la pregunta ya escrita (no la envía). */
export function PreguntarAPaumi({ pregunta, className = "" }: { pregunta: string; className?: string }) {
  return (
    <button
      type="button"
      className={clasesBoton("secundario", "normal", className)}
      onClick={() => window.dispatchEvent(new CustomEvent<PreguntarPaumi>(EVENTO_PREGUNTAR_PAUMI, { detail: { texto: pregunta } }))}
    >
      Pregúntale a Paumi
    </button>
  );
}
