"use client";

import { useActionState, useState } from "react";
import { aprobarSolicitud, rechazarSolicitud, type EstadoAdmin } from "@/acciones/admin";
import { clasesBoton } from "@/components/ui/Boton";
import { claseEntrada } from "@/components/ui/clasesFormulario";

const inicial: EstadoAdmin = { estado: "inicio" };

/** Botones Aprobar y Rechazar de una solicitud. Rechazar pide una nota opcional. */
export function DecisionSolicitud({ id, negocio }: { id: string; negocio: string }) {
  const [aprobada, aprobar, aprobando] = useActionState(aprobarSolicitud, inicial);
  const [rechazada, rechazar, rechazando] = useActionState(rechazarSolicitud, inicial);
  const [conNota, setConNota] = useState(false);
  const resultado = [aprobada, rechazada].find((e) => e.estado !== "inicio");

  return (
    <div className="grid gap-2">
      {!conNota ? (
        <div className="flex flex-nowrap gap-2">
          <form action={aprobar}>
            <input type="hidden" name="solicitud" value={id} />
            <button type="submit" disabled={aprobando} className={clasesBoton("secundario", "chico")} aria-label={`Aprobar ${negocio}`}>
              {aprobando ? "Aprobando…" : "Aprobar"}
            </button>
          </form>
          <button type="button" onClick={() => setConNota(true)} className={clasesBoton("texto", "chico")} aria-label={`Rechazar ${negocio}`}>
            Rechazar
          </button>
        </div>
      ) : (
        <form action={rechazar} className="grid min-w-[240px] gap-2">
          <input type="hidden" name="solicitud" value={id} />
          <label htmlFor={`nota-${id}`} className="text-[13px] leading-[18px] font-semibold">
            Motivo (opcional, solo lo ves tú)
          </label>
          <input id={`nota-${id}`} name="nota" maxLength={1000} className={`${claseEntrada} min-h-10 py-1.5 text-[15px]`} />
          <div className="flex gap-2">
            <button type="submit" disabled={rechazando} className={clasesBoton("secundario", "chico", "border-error! text-error!")}>
              {rechazando ? "Rechazando…" : "Rechazar"}
            </button>
            <button type="button" onClick={() => setConNota(false)} className={clasesBoton("texto", "chico")}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      {resultado && (
        <p role={resultado.estado === "error" ? "alert" : "status"} className={`m-0 text-[13px] leading-[18px] ${resultado.estado === "error" ? "text-error" : "text-exito"}`}>
          {resultado.mensaje}
        </p>
      )}
    </div>
  );
}
