"use client";

import { useActionState } from "react";
import type { EstadoAdmin } from "@/acciones/admin";
import { agregarSitio } from "@/acciones/agregar-sitio";
import { clasesBoton } from "@/components/ui/Boton";
import { claseEntrada, claseEtiqueta } from "@/components/ui/clasesFormulario";

const inicial: EstadoAdmin = { estado: "inicio" };

/** "Agregar un lugar" pegando su enlace de Wikipedia, Wikidata u OpenStreetMap (versión 7, fase 30.3). */
export function AgregarSitio() {
  const [r, accion, ocupado] = useActionState(agregarSitio, inicial);
  return (
    <form action={accion} className="grid gap-2">
      <label htmlFor="enlace-sitio" className={claseEtiqueta}>
        Enlace de Wikipedia, Wikidata u OpenStreetMap
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          id="enlace-sitio"
          name="enlace"
          type="text"
          inputMode="url"
          required
          maxLength={300}
          placeholder="https://es.wikipedia.org/wiki/Parque_Seminario"
          aria-describedby="enlace-sitio-ayuda"
          className={`${claseEntrada} min-w-0 flex-1 basis-72`}
        />
        <button type="submit" disabled={ocupado} className={clasesBoton("secundario", "chico")}>
          {ocupado ? "Agregando…" : "Agregar lugar"}
        </button>
      </div>
      <p id="enlace-sitio-ayuda" className="m-0 text-sm text-rio-suave">
        Entra por revisar, con su foto y descripción si las hay. Los enlaces de Google Maps o de redes sociales no sirven: no podemos usar sus datos.
      </p>
      {r.estado !== "inicio" && (
        <p role={r.estado === "error" ? "alert" : "status"} className={`m-0 text-sm font-semibold ${r.estado === "error" ? "text-error" : "text-exito"}`}>
          {r.mensaje}
        </p>
      )}
    </form>
  );
}
