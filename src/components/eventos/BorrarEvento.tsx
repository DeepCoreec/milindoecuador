"use client";

import { useActionState } from "react";
import { borrarEvento, type EstadoEvento } from "@/acciones/eventos";
import { clasesBoton } from "@/components/ui/Boton";

const inicial: EstadoEvento = { estado: "inicio" };

/** Botón "Borrar" de "Mis eventos": pide confirmar antes de borrar el evento y su afiche. */
export function BorrarEvento({ id, titulo }: { id: string; titulo: string }) {
  const [estado, accion, enviando] = useActionState(borrarEvento, inicial);
  return (
    <form
      action={accion}
      onSubmit={(e) => {
        if (!window.confirm(`¿Borrar "${titulo}"? No se puede deshacer.`)) e.preventDefault();
      }}
      className="inline-flex items-center gap-3"
    >
      <input type="hidden" name="evento" value={id} />
      <button type="submit" disabled={enviando} aria-label={`Borrar ${titulo}`} className={clasesBoton("texto", "chico", "text-error")}>
        {enviando ? "Borrando…" : "Borrar"}
      </button>
      {estado.estado === "error" && (
        <span role="alert" className="text-sm text-error">
          {estado.mensaje}
        </span>
      )}
    </form>
  );
}
