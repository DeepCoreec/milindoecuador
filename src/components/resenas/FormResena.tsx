"use client";

import { useActionState, useState } from "react";
import { borrarResena, guardarResena, type EstadoResena } from "@/acciones/resenas";
import { clasesBoton } from "@/components/ui/Boton";
import { Captcha } from "@/components/ui/Captcha";
import { claseEntrada, claseEtiqueta } from "@/components/ui/clasesFormulario";

const inicial: EstadoResena = { estado: "inicio" };
const NOMBRES = ["Muy malo", "Malo", "Normal", "Bueno", "Excelente"];

type Props = { lugar: string; ruta: string; actual: { estrellas: number; texto: string; visible: boolean } | null };

/** Escribir o editar la reseña propia: estrellas, texto y captcha. También permite borrarla. */
export function FormResena({ lugar, ruta, actual }: Props) {
  const [estado, accion, enviando] = useActionState(guardarResena, inicial);
  const [estrellas, setEstrellas] = useState(actual?.estrellas ?? 0);
  const [texto, setTexto] = useState(actual?.texto ?? "");

  const error = estado.estado === "error" ? estado : null;
  return (
    <div className="grid gap-4 rounded-xl border border-linea bg-papel-alto p-5">
      {actual && (
        <p className={`m-0 text-sm leading-5 font-semibold ${actual.visible ? "text-exito" : "text-rio-suave"}`}>
          {actual.visible ? "Tu reseña está publicada. Puedes cambiarla cuando quieras." : "Tu reseña está oculta por moderación."}
        </p>
      )}
      <form action={accion} className="grid gap-4">
        <input type="hidden" name="lugar" value={lugar} />
        <input type="hidden" name="ruta" value={ruta} />

        <fieldset className="m-0 grid gap-2 border-0 p-0" aria-describedby={error?.campo === "estrellas" ? "error-estrellas" : undefined}>
          <legend className={`${claseEtiqueta} mb-2 p-0`}>Tu calificación</legend>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <label
                key={n}
                className="grid size-11 cursor-pointer place-items-center rounded-md text-[28px] leading-none has-focus-visible:shadow-[var(--anillo-foco)]"
              >
                <input
                  type="radio"
                  name="estrellas"
                  value={n}
                  checked={estrellas === n}
                  onChange={() => setEstrellas(n)}
                  aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}: ${NOMBRES[n - 1]}`}
                  className="sr-only"
                />
                <span aria-hidden="true" className={n <= estrellas ? "text-estrella" : "text-linea-fuerte"}>
                  ★
                </span>
              </label>
            ))}
            <span className="ml-2 text-sm leading-5 text-rio-suave" aria-hidden="true">
              {estrellas ? NOMBRES[estrellas - 1] : "Toca una estrella"}
            </span>
          </div>
          {error?.campo === "estrellas" && (
            <p id="error-estrellas" role="alert" className="m-0 text-sm leading-5 text-error">
              {error.mensaje}
            </p>
          )}
        </fieldset>

        <div className="grid gap-1.5">
          <label htmlFor="texto" className={claseEtiqueta}>
            Tu reseña
          </label>
          <textarea
            id="texto"
            name="texto"
            rows={4}
            maxLength={1000}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="¿Qué pediste? ¿Cómo te atendieron? ¿Lo recomiendas?"
            aria-invalid={error?.campo === "texto" || undefined}
            aria-describedby="texto-aviso"
            className={`${claseEntrada} min-h-[120px] resize-y`}
          />
          <p id="texto-aviso" className={`m-0 text-[13px] leading-[18px] ${error?.campo === "texto" ? "text-error" : "text-rio-suave"}`}>
            {error?.campo === "texto" ? error.mensaje : `${texto.trim().length} de 1000 caracteres (mínimo 10)`}
          </p>
        </div>

        {/* Cada respuesta del captcha sirve una sola vez: con cada resultado se pide otra */}
        <Captcha reiniciar={estado} />

        {error && error.campo !== "estrellas" && error.campo !== "texto" && (
          <p role="alert" className="m-0 text-sm leading-5 text-error">
            {error.mensaje}
          </p>
        )}
        {estado.estado === "ok" && (
          <p role="status" className="m-0 text-sm leading-5 font-semibold text-exito">
            {estado.mensaje}
          </p>
        )}
        <button type="submit" disabled={enviando} className={clasesBoton("principal", "normal", "justify-self-start")}>
          {enviando ? "Enviando…" : actual ? "Guardar cambios" : "Publicar reseña"}
        </button>
      </form>
      {actual && <BorrarResena lugar={lugar} ruta={ruta} />}
    </div>
  );
}

/** Borrar en dos toques: primero pregunta, después borra. */
function BorrarResena({ lugar, ruta }: { lugar: string; ruta: string }) {
  const [estado, accion, borrando] = useActionState(borrarResena, inicial);
  const [preguntar, setPreguntar] = useState(false);
  if (!preguntar) {
    return (
      <button type="button" onClick={() => setPreguntar(true)} className={clasesBoton("texto", "chico", "justify-self-start text-error!")}>
        Borrar mi reseña
      </button>
    );
  }
  return (
    <form action={accion} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="lugar" value={lugar} />
      <input type="hidden" name="ruta" value={ruta} />
      <span className="text-sm leading-5">¿Seguro? No se puede deshacer.</span>
      <button type="submit" disabled={borrando} className={clasesBoton("secundario", "chico", "border-error! text-error!")}>
        Sí, borrar
      </button>
      <button type="button" onClick={() => setPreguntar(false)} className={clasesBoton("texto", "chico")}>
        No
      </button>
      {estado.estado === "error" && (
        <p role="alert" className="m-0 w-full text-sm leading-5 text-error">
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}
