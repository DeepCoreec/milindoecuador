"use client";

import { useState } from "react";
import { claseAyuda, claseEtiqueta } from "@/components/ui/clasesFormulario";
import { DIAS, NOMBRE_DIA, leerHorario, type Dia, type Horario } from "@/lib/horario";

const claseHora = "min-h-11 rounded-sm border border-linea-fuerte bg-papel-alto px-2 text-base leading-6 text-rio disabled:opacity-40";

/**
 * Horario por día para "Abierto ahora / Cerrado" (versión 2, paso 10.1). Se envía como JSON en `horarioDias`;
 * el servidor lo vuelve a validar. Cierre antes que apertura = cierra después de medianoche; iguales = 24 horas.
 */
export function CampoHorario({ valor }: { valor: string }) {
  const [h, setH] = useState<Horario>(() => {
    try {
      return leerHorario(JSON.parse(valor || "null")) ?? {};
    } catch {
      return {};
    }
  });
  const poner = (d: Dia, r: [string, string] | undefined) => setH((ant) => ({ ...ant, [d]: r }));
  const copiarLunes = () => setH((ant) => (ant.lun ? Object.fromEntries(DIAS.map((d) => [d, d === "sab" || d === "dom" ? ant[d] : ant.lun])) : ant));
  const json = Object.values(h).some(Boolean) ? JSON.stringify(Object.fromEntries(DIAS.filter((d) => h[d]).map((d) => [d, h[d]]))) : "";

  return (
    <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0">
      <legend className={`${claseEtiqueta} mb-1.5 p-0`}>Horario por día (opcional)</legend>
      <input type="hidden" name="horarioDias" value={json} />
      <div className="grid gap-2">
        {DIAS.map((d) => {
          const r = h[d];
          return (
            <div key={d} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <label className="flex w-[132px] cursor-pointer items-center gap-2 text-[15px] leading-[22px]">
                <input
                  type="checkbox"
                  checked={!!r}
                  onChange={(e) => poner(d, e.target.checked ? ["08:00", "18:00"] : undefined)}
                  className="size-5 accent-celeste-tinta"
                />
                {NOMBRE_DIA[d]}
              </label>
              {r ? (
                <span className="flex items-center gap-2">
                  <input
                    type="time"
                    aria-label={`${NOMBRE_DIA[d]}: abre`}
                    value={r[0]}
                    onChange={(e) => e.target.value && poner(d, [e.target.value, r[1]])}
                    className={claseHora}
                  />
                  <span aria-hidden="true">a</span>
                  <input
                    type="time"
                    aria-label={`${NOMBRE_DIA[d]}: cierra`}
                    value={r[1]}
                    onChange={(e) => e.target.value && poner(d, [r[0], e.target.value])}
                    className={claseHora}
                  />
                </span>
              ) : (
                <span className="text-sm leading-5 text-rio-suave">Cerrado</span>
              )}
            </div>
          );
        })}
      </div>
      {h.lun && (
        <button type="button" onClick={copiarLunes} className="justify-self-start text-sm leading-5 font-semibold text-rio underline underline-offset-4">
          Copiar el horario del lunes de lunes a viernes
        </button>
      )}
      <p className={`m-0 ${claseAyuda}`}>
        Con esto la ficha dice «Abierto ahora» o «Cerrado». Si cierras después de medianoche, pon la hora de cierre aunque sea menor (por ejemplo, de 18:00 a
        02:00). Abre y cierra a la misma hora = 24 horas.
      </p>
    </fieldset>
  );
}
