"use client";

import { useActionState } from "react";
import type { EstadoAdmin } from "@/acciones/admin";
import { editarDatosSitio } from "@/acciones/fotos-guia";
import { clasesBoton } from "@/components/ui/Boton";
import { claseAyuda, claseEntrada, claseEtiqueta } from "@/components/ui/clasesFormulario";

const inicial: EstadoAdmin = { estado: "inicio" };

/** Horario, página web y teléfono de un lugar de la guía (2026-10-31): se ven en "Antes de ir" de su página. */
export function DatosSitio({ sitio, horario, web, telefono }: { sitio: string; horario: string | null; web: string | null; telefono: string | null }) {
  const [r, accion, ocupado] = useActionState(editarDatosSitio, inicial);
  return (
    <section aria-labelledby="t-datos" className="grid gap-4 rounded-xl border border-linea bg-papel-alto p-6">
      <div className="grid gap-1">
        <h2 id="t-datos" className="m-0 text-xl leading-[26px] font-semibold">
          Horario, web y teléfono
        </h2>
        <p className={`m-0 ${claseAyuda}`}>Se ven en «Antes de ir». Pon solo datos de fuentes oficiales (la página del lugar o del Municipio). Deja vacío lo que no sepas.</p>
      </div>
      <form action={accion} className="grid gap-3 sm:max-w-[560px]">
        <input type="hidden" name="sitio" value={sitio} />
        <label className="grid gap-1.5">
          <span className={claseEtiqueta}>Horario</span>
          <input name="horario" defaultValue={horario ?? ""} maxLength={200} placeholder="Todos los días de 07:00 a 24:00" className={claseEntrada} />
        </label>
        <label className="grid gap-1.5">
          <span className={claseEtiqueta}>Página web oficial</span>
          <input name="web" type="url" defaultValue={web ?? ""} maxLength={300} placeholder="https://…" className={claseEntrada} />
        </label>
        <label className="grid gap-1.5">
          <span className={claseEtiqueta}>Teléfono</span>
          <input name="telefono" type="tel" defaultValue={telefono ?? ""} maxLength={40} placeholder="04 259 9100" className={claseEntrada} />
        </label>
        <span className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={ocupado} className={clasesBoton("secundario", "chico")}>
            Guardar datos
          </button>
          <span role="status" className={`text-sm ${r.estado === "error" ? "text-error" : "text-exito"}`}>
            {r.mensaje}
          </span>
        </span>
      </form>
    </section>
  );
}
