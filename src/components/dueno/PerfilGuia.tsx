"use client";

import { useActionState } from "react";
import { guardarPerfilGuia, type EstadoDueno } from "@/acciones/dueno";
import { clasesBoton } from "@/components/ui/Boton";
import { claseEntrada } from "@/components/ui/clasesFormulario";
import type { PerfilGuiaPrivado } from "@/lib/datos/dueno";
import { ESPECIALIDADES, IDIOMAS } from "@/lib/guias";

const inicial: EstadoDueno = { estado: "inicio" };

function Opciones({ nombre, leyenda, ayuda, opciones, marcadas }: { nombre: string; leyenda: string; ayuda: string; opciones: Record<string, string>; marcadas: string[] }) {
  return (
    <fieldset className="m-0 grid gap-2 border-0 p-0">
      <legend className="p-0 text-[15px] leading-5 font-semibold">{leyenda}</legend>
      <p className="m-0 text-sm leading-5 text-rio-suave">{ayuda}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {Object.entries(opciones).map(([codigo, texto]) => (
          <label key={codigo} className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] leading-5">
            <input type="checkbox" name={nombre} value={codigo} defaultChecked={marcadas.includes(codigo)} className="size-5 flex-none accent-celeste-tinta" />
            {texto}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * "Tu perfil de guía" en «Mi negocio» (versión 13, 41.2). La foto, la presentación y el WhatsApp son los de la ficha;
 * aquí van los idiomas, las especialidades, las zonas y el número de credencial del MINTUR (no se publica).
 */
export function PerfilGuia({ lugar, perfil }: { lugar: string; perfil: PerfilGuiaPrivado }) {
  const [r, accion, guardando] = useActionState(guardarPerfilGuia, inicial);
  return (
    <section aria-labelledby="t-guia" className="grid gap-5 rounded-xl border border-linea bg-papel-alto p-6">
      <div className="grid gap-1">
        <h2 id="t-guia" className="m-0 text-xl leading-[26px] font-semibold">
          Tu perfil de guía
        </h2>
        <p className="m-0 text-[15px] leading-[22px] text-rio-suave">
          Tu foto, tu presentación y tu WhatsApp son los de tu ficha. Aquí cuentas en qué idiomas guías y qué recorridos haces.
        </p>
      </div>

      <form action={accion} className="grid gap-5">
        <input type="hidden" name="lugar" value={lugar} />
        <Opciones nombre="idiomas" leyenda="Idiomas" ayuda="En los que puedes guiar un recorrido." opciones={IDIOMAS} marcadas={perfil.idiomas} />
        <Opciones nombre="especialidades" leyenda="Especialidades" ayuda="Hasta 6." opciones={ESPECIALIDADES} marcadas={perfil.especialidades} />

        <div className="grid gap-1.5">
          <label htmlFor="g-zonas" className="text-[15px] leading-5 font-semibold">
            Zonas donde trabajas
          </label>
          <input id="g-zonas" name="zonas" maxLength={160} defaultValue={perfil.zonas ?? ""} placeholder="Centro, Las Peñas, Isla Santay" className={claseEntrada} />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="g-credencial" className="text-[15px] leading-5 font-semibold">
            Número de credencial de guía (MINTUR)
          </label>
          <input
            id="g-credencial"
            name="credencial"
            maxLength={40}
            defaultValue={perfil.credencial ?? ""}
            autoComplete="off"
            aria-describedby="g-credencial-ayuda"
            className={claseEntrada}
          />
          <p id="g-credencial-ayuda" className="m-0 text-sm leading-5 text-rio-suave">
            No se publica. Lo buscamos en el catastro turístico del Ministerio de Turismo y, si está, tu ficha lleva la insignia
            «Guía acreditado». Si lo cambias, lo revisamos otra vez.
          </p>
        </div>

        <p className="m-0 text-[15px] leading-5">
          {perfil.acreditado ? (
            <b className="text-exito">✓ Eres guía acreditado.</b>
          ) : perfil.credencial ? (
            "Tu acreditación está en revisión."
          ) : (
            "Sin número de credencial, tu ficha sale sin la insignia de acreditado."
          )}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={guardando} className={clasesBoton("principal")}>
            {guardando ? "Guardando…" : "Guardar mi perfil de guía"}
          </button>
        </div>
        {r.estado !== "inicio" && r.mensaje && (
          <div role={r.estado === "error" ? "alert" : "status"} className={`grid gap-1 text-sm leading-5 font-semibold ${r.estado === "error" ? "text-error" : "text-exito"}`}>
            <p className="m-0">{r.mensaje}</p>
            {r.errores?.map((e) => (
              <p key={e} className="m-0 font-normal">
                {e}
              </p>
            ))}
          </div>
        )}
      </form>
    </section>
  );
}
