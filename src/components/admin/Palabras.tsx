"use client";

import { useActionState } from "react";
import {
  agregarPalabra,
  quitarPalabra,
  type EstadoAdmin,
} from "@/acciones/admin";
import { clasesBoton } from "@/components/ui/Boton";
import {
  claseAyuda,
  claseEntrada,
  claseEtiqueta,
} from "@/components/ui/clasesFormulario";

const inicial: EstadoAdmin = { estado: "inicio" };

/** Agregar y quitar palabras prohibidas (paso 9.1). */
export function Palabras({ palabras }: { palabras: string[] }) {
  const [agregado, agregar, agregando] = useActionState(
    agregarPalabra,
    inicial,
  );
  const [quitado, quitar, quitando] = useActionState(quitarPalabra, inicial);
  const aviso = quitado.estado === "error" ? quitado : agregado;
  return (
    <div className="grid max-w-[760px] gap-6">
      <form
        key={agregado.estado === "ok" ? agregado.mensaje : "f"}
        action={agregar}
        className="grid gap-3 rounded-xl border border-linea bg-papel-alto p-6"
      >
        <label htmlFor="palabra" className={claseEtiqueta}>
          Agregar palabra o frase
        </label>
        <div className="flex flex-wrap gap-3">
          <input
            id="palabra"
            name="palabra"
            required
            minLength={2}
            maxLength={60}
            className={`${claseEntrada} max-w-[360px] flex-1`}
            aria-describedby="palabra-ayuda"
          />
          <button
            type="submit"
            disabled={agregando}
            className={clasesBoton("principal")}
          >
            {agregando ? "Agregando…" : "Agregar"}
          </button>
        </div>
        <p id="palabra-ayuda" className={`m-0 ${claseAyuda}`}>
          Se bloquea como palabra entera, sin importar tildes ni mayúsculas.
          «Pendejo» no bloquea «pendejos»: agrega también el plural.
        </p>
        {aviso.estado !== "inicio" && (
          <p
            role={aviso.estado === "error" ? "alert" : "status"}
            className={`m-0 text-sm leading-5 ${aviso.estado === "error" ? "text-error" : "text-exito font-semibold"}`}
          >
            {aviso.mensaje}
          </p>
        )}
      </form>
      <section aria-labelledby="t-lista" className="grid gap-3">
        <h2 id="t-lista" className="m-0 text-lg leading-6 font-semibold">
          En la lista ({palabras.length})
        </h2>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {palabras.map((p) => (
            <li key={p}>
              <form
                action={quitar}
                className="inline-flex items-center gap-1 rounded-full border border-linea bg-papel-alto py-1 pr-1 pl-3 text-sm leading-5"
              >
                <input type="hidden" name="palabra" value={p} />
                {p}
                <button
                  type="submit"
                  disabled={quitando}
                  aria-label={`Quitar «${p}»`}
                  className="grid size-7 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-rio-suave hover:text-error"
                >
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
