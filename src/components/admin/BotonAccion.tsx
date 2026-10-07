"use client";

import { useActionState } from "react";
import type { EstadoAdmin } from "@/acciones/admin";
import { clasesBoton } from "@/components/ui/Boton";

const inicial: EstadoAdmin = { estado: "inicio" };

type Props = {
  accion: (previo: EstadoAdmin, datos: FormData) => Promise<EstadoAdmin>;
  campos: Record<string, string>;
  texto: string;
  /** Texto para lectores de pantalla cuando el botón solo no dice sobre qué actúa. */
  etiqueta?: string;
  variante?: "principal" | "secundario" | "peligro";
};

/** Un botón del panel que ejecuta una acción y muestra su resultado al lado. */
export function BotonAccion({
  accion,
  campos,
  texto,
  etiqueta,
  variante = "secundario",
}: Props) {
  const [r, ejecutar, ocupado] = useActionState(accion, inicial);
  return (
    <form
      action={ejecutar}
      className="inline-flex flex-wrap items-center gap-2"
    >
      {Object.entries(campos).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        disabled={ocupado}
        aria-label={etiqueta}
        className={clasesBoton(
          variante === "peligro" ? "secundario" : variante,
          "chico",
          variante === "peligro" ? "text-error!" : "",
        )}
      >
        {ocupado ? "…" : texto}
      </button>
      {r.estado !== "inicio" && (
        <span
          role={r.estado === "error" ? "alert" : "status"}
          className={`text-sm leading-5 ${r.estado === "error" ? "text-error" : "text-exito font-semibold"}`}
        >
          {r.mensaje}
        </span>
      )}
    </form>
  );
}
