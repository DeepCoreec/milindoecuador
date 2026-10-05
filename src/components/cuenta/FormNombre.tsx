"use client";

import { useActionState } from "react";
import { cambiarNombre, type EstadoFormulario } from "@/acciones/cuenta";
import { clasesBoton } from "@/components/ui/Boton";
import { claseAyuda, claseEntrada, claseEtiqueta } from "@/components/ui/clasesFormulario";

const inicial: EstadoFormulario = { estado: "inicio" };

/** Cambiar el nombre que se ve junto a las reseñas. */
export function FormNombre({ nombre }: { nombre: string }) {
  const [estado, accion, guardando] = useActionState(cambiarNombre, inicial);
  const hayError = estado.estado === "error";
  return (
    <form action={accion} className="grid gap-3">
      <div className="grid gap-1.5">
        <label htmlFor="nombre" className={claseEtiqueta}>
          Nombre visible
        </label>
        <input
          id="nombre"
          name="nombre"
          defaultValue={estado.valor ?? nombre}
          required
          minLength={2}
          maxLength={40}
          autoComplete="nickname"
          aria-invalid={hayError || undefined}
          aria-describedby="nombre-aviso"
          className={claseEntrada}
        />
        <p id="nombre-aviso" role={estado.estado === "inicio" ? undefined : "status"} className={`m-0 ${hayError ? "text-sm leading-5 text-error" : claseAyuda}`}>
          {estado.mensaje ?? "Así te verán los demás en tus reseñas. Por ejemplo: Ana M."}
        </p>
      </div>
      <button type="submit" disabled={guardando} className={clasesBoton("secundario", "chico", "justify-self-start")}>
        {guardando ? "Guardando…" : "Guardar nombre"}
      </button>
    </form>
  );
}
