"use client";

import { useActionState } from "react";
import { acreditarGuia, type EstadoAdmin } from "@/acciones/admin";
import { clasesBoton } from "@/components/ui/Boton";
import { claseAyuda } from "@/components/ui/clasesFormulario";
import { Insignia } from "@/components/ui/Insignia";
import { fechaLarga } from "@/lib/enlaces";
import { CATASTRO_MINTUR } from "@/lib/guias";

const inicial: EstadoAdmin = { estado: "inicio" };

/** Insignia "Guía acreditado" (versión 13, 41.3): se pone a mano, después de encontrar el número en el catastro. */
export function AcreditarGuia({ lugar, credencial, acreditadoDesde }: { lugar: string; credencial: string | null; acreditadoDesde: string | null }) {
  const [estado, accion, cambiando] = useActionState(acreditarGuia, inicial);
  return (
    <section aria-labelledby="t-acreditar" className="grid gap-4 rounded-xl border border-linea bg-papel-alto p-6">
      <div className="grid gap-1">
        <h2 id="t-acreditar" className="m-0 text-xl leading-[26px] font-semibold">
          Guía acreditado
        </h2>
        <p className={`m-0 ${claseAyuda}`}>
          Busca el número en el{" "}
          <a href={CATASTRO_MINTUR} target="_blank" rel="noopener noreferrer" className="font-semibold text-celeste-tinta underline underline-offset-2">
            catastro turístico del MINTUR ↗
          </a>{" "}
          y comprueba que el nombre coincida con el de la ficha. Solo entonces pon la insignia. No es un plan pagado.
        </p>
      </div>
      <p className="m-0 text-[15px] leading-5">
        Número de credencial: {credencial ? <b className="font-mono">{credencial}</b> : <span className="text-rio-suave">todavía no lo escribió</span>}
      </p>
      <form action={accion} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="lugar" value={lugar} />
        <Insignia variante={acreditadoDesde ? "acreditado" : "neutra"}>{acreditadoDesde ? "Guía acreditado" : "Sin acreditar"}</Insignia>
        {acreditadoDesde && <span className="text-sm leading-5 text-rio-suave">desde el {fechaLarga(acreditadoDesde)}</span>}
        {acreditadoDesde ? (
          <button type="submit" name="acreditar" value="no" disabled={cambiando} className={clasesBoton("texto", "chico")}>
            Quitar la insignia
          </button>
        ) : (
          <button type="submit" name="acreditar" value="si" disabled={cambiando || !credencial} className={clasesBoton("secundario", "chico")}>
            Lo encontré en el catastro: poner la insignia
          </button>
        )}
      </form>
      {estado.estado !== "inicio" && (
        <p role={estado.estado === "error" ? "alert" : "status"} className={`m-0 text-sm leading-5 font-semibold ${estado.estado === "error" ? "text-error" : "text-exito"}`}>
          {estado.mensaje}
        </p>
      )}
    </section>
  );
}
