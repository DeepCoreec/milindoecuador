"use client";

import { useActionState } from "react";
import { cambiarPlan, type EstadoAdmin } from "@/acciones/admin";
import { clasesBoton } from "@/components/ui/Boton";
import { claseAyuda } from "@/components/ui/clasesFormulario";
import { Insignia } from "@/components/ui/Insignia";
import { fechaLarga } from "@/lib/enlaces";

const inicial: EstadoAdmin = { estado: "inicio" };

/** Planes pagados de la ficha: Destacado (por días) y Verificado. Se activan después de confirmar el pago. */
export function PlanLugar({ lugar, vigente, destacadoHasta, verificado }: { lugar: string; vigente: boolean; destacadoHasta: string | null; verificado: boolean }) {
  const [estado, accion, cambiando] = useActionState(cambiarPlan, inicial);
  const boton = (valor: string, texto: string, variante: "secundario" | "texto" = "secundario") => (
    <button type="submit" name="accion" value={valor} disabled={cambiando} className={clasesBoton(variante, "chico")}>
      {texto}
    </button>
  );
  return (
    <section aria-labelledby="t-plan" className="grid gap-4 rounded-xl border border-linea bg-papel-alto p-6">
      <div className="grid gap-1">
        <h2 id="t-plan" className="m-0 text-xl leading-[26px] font-semibold">
          Plan
        </h2>
        <p className={`m-0 ${claseAyuda}`}>Actívalo solo después de confirmar el pago por transferencia o DeUna.</p>
      </div>
      <form action={accion} className="grid gap-4">
        <input type="hidden" name="lugar" value={lugar} />
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Insignia variante={vigente ? "destacado" : "neutra"}>{vigente ? "Destacado" : "Sin destacar"}</Insignia>
            {vigente && destacadoHasta && <span className="text-sm leading-5 text-rio-suave">hasta el {fechaLarga(destacadoHasta)}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {boton("destacar-semana", vigente ? "+ 7 días (1 $)" : "Destacar 7 días (1 $)")}
            {boton("destacar-seis-semanas", vigente ? "+ 6 semanas (5 $)" : "Destacar 6 semanas (5 $)")}
            {vigente && boton("quitar-destacado", "Quitar destacado", "texto")}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-linea pt-4">
          <Insignia variante={verificado ? "verificado" : "neutra"}>{verificado ? "Verificado" : "Sin verificar"}</Insignia>
          {verificado ? boton("quitar-verificado", "Quitar verificado", "texto") : boton("verificar", "Marcar como verificado (2 $)")}
        </div>
      </form>
      {estado.estado !== "inicio" && (
        <p role={estado.estado === "error" ? "alert" : "status"} className={`m-0 text-sm leading-5 font-semibold ${estado.estado === "error" ? "text-error" : "text-exito"}`}>
          {estado.mensaje}
        </p>
      )}
    </section>
  );
}
