"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useActionState } from "react";
import { reportarLugar, type EstadoReporte } from "@/acciones/reportes";
import { clasesBoton } from "@/components/ui/Boton";
import { claseEntrada, claseEtiqueta } from "@/components/ui/clasesFormulario";
import { IconoCerrar } from "@/components/ui/iconos";
import { motivosDe } from "@/lib/validacion/resenas";

const inicial: EstadoReporte = { estado: "inicio" };
const botonChico = "cursor-pointer border-0 bg-transparent p-0 text-[13px] leading-5 font-medium text-rio-suave underline underline-offset-2";

/**
 * "Reportar este lugar" (versión 2, paso 9.7): abre un panel con el motivo. Con 3 reportes se oculta solo.
 * `objetivo="video"` (versión 3): reporta solo el video del negocio.
 */
export function ReportarLugar({ lugar, ruta, nombre, objetivo = "lugar" }: { lugar: string; ruta: string; nombre: string; objetivo?: "lugar" | "video" | "evento" }) {
  const [estado, accion, enviando] = useActionState(reportarLugar, inicial);
  const video = objetivo === "video";
  const cosa = video ? "video" : objetivo === "evento" ? "evento" : "lugar";
  const motivos = motivosDe(objetivo);
  return (
    <Dialog.Root>
      <Dialog.Trigger className={`${botonChico} justify-self-start`}>{`Reportar este ${cosa}`}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="mle-velo fixed inset-0 z-40 bg-[#0b1d28]/55" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 grid max-h-[90vh] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl border border-linea bg-papel-alto p-6 text-rio shadow-flotante">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="m-0 text-lg leading-6 font-semibold">{video ? `Reportar el video de ${nombre}` : `Reportar ${nombre}`}</Dialog.Title>
            <Dialog.Close
              aria-label="Cerrar"
              className="-mt-2 -mr-2 inline-grid size-11 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-rio [&_svg]:size-5"
            >
              <IconoCerrar />
            </Dialog.Close>
          </div>
          {estado.estado === "ok" ? (
            <>
              <Dialog.Description role="status" className="m-0 text-rio-suave">
                {estado.mensaje}
              </Dialog.Description>
              <Dialog.Close className={clasesBoton("secundario", "chico", "justify-self-start")}>Listo</Dialog.Close>
            </>
          ) : (
            <>
              <Dialog.Description className="m-0 text-sm leading-5 text-rio-suave">
                {video
                  ? "Lo revisaremos. Si varias personas lo reportan, el video se oculta mientras tanto."
                  : "Lo revisaremos. Si varias personas lo reportan, se oculta mientras tanto."}
              </Dialog.Description>
              <form action={accion} className="grid gap-4">
                <input type="hidden" name="lugar" value={lugar} />
                <input type="hidden" name="ruta" value={ruta} />
                <input type="hidden" name="objetivo" value={objetivo} />
                <fieldset className="m-0 grid gap-2 border-0 p-0">
                  <legend className={`${claseEtiqueta} mb-2 p-0`}>{`¿Qué pasa con este ${cosa}?`}</legend>
                  {Object.entries(motivos).map(([valor, texto]) => (
                    <label key={valor} className="flex cursor-pointer items-start gap-3 text-[15px] leading-[22px]">
                      <input
                        type="radio"
                        name="motivo"
                        value={valor}
                        required
                        defaultChecked={estado.motivo === valor}
                        className="mt-0.5 size-5 flex-none accent-celeste-tinta"
                      />
                      {texto}
                    </label>
                  ))}
                </fieldset>
                <div className="grid gap-1.5">
                  <label htmlFor={`detalle-${objetivo}-${lugar}`} className={claseEtiqueta}>
                    Detalle (opcional)
                  </label>
                  <textarea
                    id={`detalle-${objetivo}-${lugar}`}
                    name="detalle"
                    rows={3}
                    maxLength={400}
                    defaultValue={estado.detalle}
                    className={`${claseEntrada} resize-y`}
                  />
                </div>
                {estado.estado === "error" && (
                  <p role="alert" className="m-0 text-sm leading-5 text-error">
                    {estado.mensaje}
                  </p>
                )}
                <button type="submit" disabled={enviando} className={clasesBoton("principal", "normal", "justify-self-start")}>
                  {enviando ? "Enviando…" : "Enviar reporte"}
                </button>
              </form>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
