"use client";

import { useActionState } from "react";
import { decidirSitios, editarSitio, type EstadoAdmin } from "@/acciones/admin";
import { clasesBoton } from "@/components/ui/Boton";
import { claseEntrada, claseEtiqueta } from "@/components/ui/clasesFormulario";
import type { SitioAdmin } from "@/lib/datos/admin";
import { enlaceOSM, NOMBRE_TIPO, type TipoSitio } from "@/lib/osm";

const inicial: EstadoAdmin = { estado: "inicio" };

function Resultado({ r }: { r: EstadoAdmin }) {
  if (r.estado === "inicio") return null;
  return (
    <span role={r.estado === "error" ? "alert" : "status"} className={`text-sm font-semibold ${r.estado === "error" ? "text-error" : "text-exito"}`}>
      {r.mensaje}
    </span>
  );
}

function Corregir({ s }: { s: SitioAdmin }) {
  const [r, accion, ocupado] = useActionState(editarSitio, inicial);
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-rio-suave">Corregir</summary>
      <form action={accion} className="mt-2 grid gap-2">
        <input type="hidden" name="sitio" value={s.id} />
        <label className={claseEtiqueta} htmlFor={`n-${s.id}`}>
          Nombre
        </label>
        <input id={`n-${s.id}`} name="nombre" defaultValue={s.nombre} maxLength={120} className={claseEntrada} />
        <label className={claseEtiqueta} htmlFor={`d-${s.id}`}>
          Una frase para la guía (opcional)
        </label>
        <input id={`d-${s.id}`} name="nota" defaultValue={s.nota ?? ""} maxLength={300} placeholder="Ej.: Ideal para ver iguanas al atardecer" className={claseEntrada} />
        <span className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={ocupado} className={clasesBoton("secundario", "chico")}>
            Guardar
          </button>
          <Resultado r={r} />
        </span>
      </form>
    </details>
  );
}

/** Lista de lugares de OpenStreetMap con casillas para publicar o descartar varios a la vez. */
export function SitiosGuia({ sitios, estado }: { sitios: SitioAdmin[]; estado: string }) {
  const [r, accion, ocupado] = useActionState(decidirSitios, inicial);
  return (
    <div className="grid gap-4">
      <form id="f-lote" action={accion} className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-linea bg-papel py-3">
        <button
          type="button"
          onClick={() => document.querySelectorAll<HTMLInputElement>('input[form="f-lote"][name="sitio"]').forEach((c) => (c.checked = true))}
          className={clasesBoton("texto", "chico")}
        >
          Marcar todos
        </button>
        {estado !== "publicado" && (
          <button type="submit" name="decision" value="publicado" disabled={ocupado} className={clasesBoton("principal", "chico")}>
            Publicar marcados
          </button>
        )}
        {estado !== "descartado" && (
          <button type="submit" name="decision" value="descartado" disabled={ocupado} className={clasesBoton("secundario", "chico", "text-error!")}>
            Descartar marcados
          </button>
        )}
        {estado !== "pendiente" && (
          <button type="submit" name="decision" value="pendiente" disabled={ocupado} className={clasesBoton("secundario", "chico")}>
            Devolver a revisión
          </button>
        )}
        <Resultado r={r} />
      </form>
      <ul className="m-0 grid list-none gap-3 p-0">
        {sitios.map((s) => {
          const [tipoOsm, idOsm] = s.osm.split("/");
          return (
            <li key={s.id} className="grid gap-2 rounded-xl border border-linea bg-papel-alto p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" form="f-lote" name="sitio" value={s.id} className="mt-1 size-5 flex-none accent-celeste-tinta" />
                <span className="grid gap-0.5">
                  <b className="text-base">{s.nombre}</b>
                  <span className="text-sm text-rio-suave">
                    {NOMBRE_TIPO[s.tipo as TipoSitio] ?? s.tipo}
                    {s.direccion ? `, ${s.direccion}` : ""}
                  </span>
                  {s.nota && <span className="text-sm">{s.nota}</span>}
                </span>
              </label>
              <span className="flex flex-wrap gap-4 pl-8 text-sm">
                <a href={enlaceOSM(tipoOsm!, idOsm!)} target="_blank" rel="noopener noreferrer">
                  Ver en OpenStreetMap
                </a>
              </span>
              <div className="pl-8">
                <Corregir s={s} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
