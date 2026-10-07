"use client";

import { useActionState } from "react";
import { responderComoDueno, type EstadoDueno } from "@/acciones/dueno";
import { clasesBoton } from "@/components/ui/Boton";
import { claseAyuda, claseEntrada, claseEtiqueta } from "@/components/ui/clasesFormulario";

const inicial: EstadoDueno = { estado: "inicio" };

/** Responder una reseña como dueño (paso 9.4). La respuesta sale al instante debajo de la reseña. */
export function RespuestaDueno({ resena, respuesta }: { resena: string; respuesta: string | null }) {
  const [r, accion, guardando] = useActionState(responderComoDueno, inicial);
  const id = `resp-${resena}`;
  return (
    <form action={accion} className="grid gap-2">
      <input type="hidden" name="resena" value={resena} />
      <label htmlFor={id} className={claseEtiqueta}>
        Tu respuesta
      </label>
      <textarea
        id={id}
        name="respuesta"
        rows={3}
        maxLength={1000}
        defaultValue={respuesta ?? ""}
        className={`${claseEntrada} resize-y`}
        aria-describedby={`${id}-ayuda`}
      />
      <p id={`${id}-ayuda`} className={`m-0 ${claseAyuda}`}>
        Agradece, explica o cuenta qué vas a mejorar. Sin enlaces ni teléfonos. Déjala vacía para quitarla.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={guardando} className={clasesBoton("secundario", "chico")}>
          {guardando ? "Guardando…" : respuesta ? "Cambiar respuesta" : "Responder"}
        </button>
        {r.estado !== "inicio" && (
          <span
            role={r.estado === "error" ? "alert" : "status"}
            className={`text-sm leading-5 ${r.estado === "error" ? "text-error" : "text-exito font-semibold"}`}
          >
            {r.mensaje}
          </span>
        )}
      </div>
    </form>
  );
}
