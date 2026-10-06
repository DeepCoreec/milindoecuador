"use client";

import Link from "next/link";
import { useActionState } from "react";
import { moderarResena, responderResena, type EstadoAdmin } from "@/acciones/admin";
import { clasesBoton } from "@/components/ui/Boton";
import { claseEntrada, claseEtiqueta } from "@/components/ui/clasesFormulario";
import { Insignia } from "@/components/ui/Insignia";
import type { ResenaAdmin as Datos } from "@/lib/datos/admin";
import { fechaLarga } from "@/lib/enlaces";

const inicial: EstadoAdmin = { estado: "inicio" };

/**
 * Una reseña en el panel. `modo="reporte"`: ocultar o mantener (cierra los reportes).
 * `modo="lugar"`: ocultar o volver a mostrar, y responder como el negocio.
 */
export function ResenaAdmin({ resena: r, modo }: { resena: Datos; modo: "reporte" | "lugar" }) {
  const [moderado, moderar, moderando] = useActionState(moderarResena, inicial);
  const [respondido, responder, respondiendo] = useActionState(responderResena, inicial);
  const aviso = [moderado, respondido].find((e) => e.estado !== "inicio");

  const boton = (decision: "ocultar" | "mantener" | "mostrar", texto: string, peligro = false) => (
    <form action={moderar}>
      <input type="hidden" name="resena" value={r.id} />
      <input type="hidden" name="decision" value={decision} />
      <button type="submit" disabled={moderando} className={clasesBoton("secundario", "chico", peligro ? "border-error! text-error!" : "")}>
        {texto}
      </button>
    </form>
  );

  return (
    <article className="grid gap-3 rounded-xl border border-linea bg-papel-alto p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <b>{r.autor}</b>
          <span className="tracking-[0.1em] text-estrella" role="img" aria-label={`${r.estrellas} de 5 estrellas`}>
            {"★".repeat(r.estrellas)}
          </span>
          {!r.visible && <Insignia>Oculta</Insignia>}
        </div>
        <time dateTime={r.fecha} className="text-sm leading-5 text-rio-suave">
          {fechaLarga(r.fecha)}
        </time>
      </div>
      {modo === "reporte" && r.lugar && (
        <p className="m-0 text-sm leading-5 text-rio-suave">
          En <Link href={`/admin/lugares/${r.lugar.id}`}>{r.lugar.nombre}</Link>
        </p>
      )}
      {/* Texto de usuario: React lo escapa, nunca se inserta como HTML */}
      <p className="m-0">{r.texto}</p>
      {r.motivos.length > 0 && (
        <div className="grid gap-1 rounded-md border border-dashed border-linea-fuerte p-3 text-sm leading-5">
          <b>{r.motivos.length === 1 ? "1 reporte" : `${r.motivos.length} reportes`}</b>
          <ul className="m-0 grid gap-0.5 pl-5">
            {r.motivos.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {modo === "reporte" ? (
          <>
            {boton("ocultar", "Ocultar reseña", true)}
            {boton("mantener", "Mantener")}
          </>
        ) : r.visible ? (
          boton("ocultar", "Ocultar", true)
        ) : (
          boton("mostrar", "Mostrar otra vez")
        )}
      </div>
      {modo === "lugar" && (
        <form action={responder} className="grid gap-2 border-t border-linea pt-3">
          <input type="hidden" name="resena" value={r.id} />
          <label htmlFor={`resp-${r.id}`} className={claseEtiqueta}>
            Respuesta del negocio
          </label>
          <textarea id={`resp-${r.id}`} name="respuesta" rows={2} maxLength={1000} defaultValue={r.respuesta ?? ""} className={`${claseEntrada} resize-y`} />
          <button type="submit" disabled={respondiendo} className={clasesBoton("secundario", "chico", "justify-self-start")}>
            {respondiendo ? "Guardando…" : "Guardar respuesta"}
          </button>
        </form>
      )}
      {aviso && (
        <p role={aviso.estado === "error" ? "alert" : "status"} className={`m-0 text-sm leading-5 font-semibold ${aviso.estado === "error" ? "text-error" : "text-exito"}`}>
          {aviso.mensaje}
        </p>
      )}
    </article>
  );
}
