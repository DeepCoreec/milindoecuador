"use client";

import { useActionState } from "react";
import { borrarCuenta, type EstadoFormulario } from "@/acciones/cuenta";
import { claseEntrada, claseEtiqueta } from "@/components/ui/clasesFormulario";

const inicial: EstadoFormulario = { estado: "inicio" };

/** Borrar la cuenta para siempre. Pide escribir BORRAR para que no pase por un toque sin querer. */
export function FormBorrarCuenta() {
  const [estado, accion, borrando] = useActionState(borrarCuenta, inicial);
  const hayError = estado.estado === "error";
  return (
    <form action={accion} className="grid gap-3">
      <div className="grid gap-1.5">
        <label htmlFor="confirmacion" className={claseEtiqueta}>
          Escribe BORRAR para confirmar
        </label>
        <input
          id="confirmacion"
          name="confirmacion"
          autoComplete="off"
          autoCapitalize="characters"
          aria-invalid={hayError || undefined}
          aria-describedby={hayError ? "borrar-error" : undefined}
          className={`${claseEntrada} max-w-[240px]`}
        />
        {hayError && (
          <p id="borrar-error" role="alert" className="m-0 text-sm leading-5 text-error">
            {estado.mensaje}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={borrando}
        className="inline-flex min-h-10 cursor-pointer items-center justify-self-start rounded-md border border-error bg-transparent px-4 text-[15px] leading-5 font-semibold text-error disabled:opacity-50"
      >
        {borrando ? "Borrando…" : "Borrar mi cuenta para siempre"}
      </button>
    </form>
  );
}
