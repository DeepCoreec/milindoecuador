"use client";

import { useActionState } from "react";
import { alternarFavorito, type EstadoFavorito } from "@/acciones/favoritos";
import { clasesBoton } from "@/components/ui/Boton";
import { IconoCorazon } from "@/components/ui/iconos";

/** "Guardar" un lugar en favoritos (versión 2, paso 10.3). Se ven en "Mi cuenta". */
export function BotonGuardar({ lugar, ruta, guardado }: { lugar: string; ruta: string; guardado: boolean }) {
  const [estado, accion, ocupado] = useActionState(alternarFavorito, { estado: "inicio" } as EstadoFavorito);
  const ahora = estado.estado === "ok" ? !!estado.guardado : guardado;
  return (
    <form action={accion} className="contents">
      <input type="hidden" name="lugar" value={lugar} />
      <input type="hidden" name="ruta" value={ruta} />
      <input type="hidden" name="guardar" value={ahora ? "no" : "si"} />
      <button type="submit" disabled={ocupado} aria-pressed={ahora} className={clasesBoton("secundario")}>
        <IconoCorazon lleno={ahora} />
        {ahora ? "Guardado" : "Guardar"}
      </button>
      {estado.estado === "error" && (
        <span role="alert" className="self-center text-sm leading-5 text-error">
          {estado.mensaje}
        </span>
      )}
    </form>
  );
}
