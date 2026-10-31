"use client";

import { useActionState } from "react";
import { borrarRecorrido, guardarRecorrido, type EstadoDueno } from "@/acciones/dueno";
import { clasesBoton } from "@/components/ui/Boton";
import { claseEntrada } from "@/components/ui/clasesFormulario";
import { Insignia } from "@/components/ui/Insignia";
import type { MiRecorrido } from "@/lib/datos/dueno";
import { DURACIONES, textoDuracion } from "@/lib/validacion/recorridos";

const inicial: EstadoDueno = { estado: "inicio" };
const etiqueta = "text-[15px] leading-5 font-semibold";
export type OpcionParada = { id: string; nombre: string };

function Aviso({ r }: { r: EstadoDueno }) {
  if (r.estado === "inicio" || !r.mensaje) return null;
  return (
    <div role={r.estado === "error" ? "alert" : "status"} className={`grid gap-1 text-sm leading-5 font-semibold ${r.estado === "error" ? "text-error" : "text-exito"}`}>
      <p className="m-0">{r.mensaje}</p>
      {r.errores?.map((e) => (
        <p key={e} className="m-0 font-normal">
          {e}
        </p>
      ))}
    </div>
  );
}

/** Formulario de un recorrido: nuevo (sin `recorrido`) o para cambiar uno. Las paradas van en el orden de las listas. */
function FormRecorrido({ lugar, recorrido, opciones }: { lugar: string; recorrido?: MiRecorrido; opciones: OpcionParada[] }) {
  const [r, accion, guardando] = useActionState(guardarRecorrido, inicial);
  const id = recorrido?.id ?? "nuevo";
  // Si hubo un error se conserva lo escrito (la key cambia en cada intento y vuelve a dibujar el formulario)
  const v = r.estado === "error" ? r.valores : undefined;
  const t = (campo: string, original: string) => v?.[campo] ?? original;
  return (
    <form key={r.intento ?? 0} action={accion} className="grid gap-4">
      <input type="hidden" name="lugar" value={lugar} />
      <input type="hidden" name="recorrido" value={recorrido?.id ?? ""} />
      <div className="grid gap-1.5">
        <label htmlFor={`rc-nombre-${id}`} className={etiqueta}>
          Nombre del recorrido
        </label>
        <input id={`rc-nombre-${id}`} name="nombre" required maxLength={80} defaultValue={t("nombre", recorrido?.nombre ?? "")} placeholder="Guayaquil histórico a pie" className={claseEntrada} />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={`rc-desc-${id}`} className={etiqueta}>
          Qué se hace
        </label>
        <textarea id={`rc-desc-${id}`} name="descripcion" required minLength={40} maxLength={800} rows={4} defaultValue={t("descripcion", recorrido?.descripcion ?? "")} className={`${claseEntrada} min-h-28 py-3`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor={`rc-dur-${id}`} className={etiqueta}>
            Duración
          </label>
          <select id={`rc-dur-${id}`} name="duracion" defaultValue={t("duracion", String(recorrido?.duracion ?? 120))} className={`mle-select ${claseEntrada} pr-10`}>
            {DURACIONES.map((d) => (
              <option key={d} value={d}>
                {textoDuracion(d)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor={`rc-precio-${id}`} className={etiqueta}>
            Precio por persona (dólares)
          </label>
          <input
            id={`rc-precio-${id}`}
            name="precio"
            inputMode="decimal"
            maxLength={7}
            defaultValue={t("precio", recorrido?.precio != null ? String(recorrido.precio) : "")}
            placeholder="Vacío = a convenir"
            className={claseEntrada}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={`rc-enc-${id}`} className={etiqueta}>
          Punto de encuentro
        </label>
        <input id={`rc-enc-${id}`} name="encuentro" required maxLength={160} defaultValue={t("encuentro", recorrido?.encuentro ?? "")} placeholder="Junto a la Torre Morisca, Malecón 2000" className={claseEntrada} />
      </div>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className={`p-0 ${etiqueta}`}>Paradas, en orden</legend>
        <p className="m-0 text-sm leading-5 text-rio-suave">De 2 a 8 lugares de la guía. Con ellas armamos el mapa del recorrido en Google Maps.</p>
        <ol className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="grid gap-1">
              <label htmlFor={`rc-p${i}-${id}`} className="text-sm leading-5 text-rio-suave">
                Parada {i + 1}
              </label>
              <select id={`rc-p${i}-${id}`} name="paradas" defaultValue={v?.paradas !== undefined ? (v.paradas.split(",")[i] ?? "") : (recorrido?.paradas[i] ?? "")} className={`mle-select ${claseEntrada} pr-10`}>
                <option value="">— Sin parada —</option>
                {opciones.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ol>
      </fieldset>
      <fieldset className="m-0 flex flex-wrap gap-x-6 gap-y-2 border-0 p-0">
        <legend className={`mb-2 p-0 ${etiqueta}`}>¿Se publica?</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
          <input type="radio" name="estado" value="publicado" defaultChecked={t("estado", recorrido?.estado ?? "publicado") === "publicado"} className="size-5 accent-celeste-tinta" />
          Sí, que se vea en mi ficha
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
          <input type="radio" name="estado" value="borrador" defaultChecked={t("estado", recorrido?.estado ?? "publicado") === "borrador"} className="size-5 accent-celeste-tinta" />
          No, dejarlo en borrador
        </label>
      </fieldset>
      <div>
        <button type="submit" disabled={guardando} className={clasesBoton("principal")}>
          {guardando ? "Guardando…" : recorrido ? "Guardar cambios" : "Crear recorrido"}
        </button>
      </div>
      <Aviso r={r} />
    </form>
  );
}

function BorrarRecorrido({ lugar, recorrido }: { lugar: string; recorrido: string }) {
  const [r, accion, borrando] = useActionState(borrarRecorrido, inicial);
  return (
    <form action={accion} className="grid gap-2">
      <input type="hidden" name="lugar" value={lugar} />
      <input type="hidden" name="recorrido" value={recorrido} />
      <button type="submit" disabled={borrando} className={`${clasesBoton("texto", "chico")} justify-self-start text-error`}>
        {borrando ? "Borrando…" : "Borrar este recorrido"}
      </button>
      <Aviso r={r} />
    </form>
  );
}

/** "Tus recorridos" en «Mi negocio» (versión 13, 42.2): solo para guías turísticos. */
export function RecorridosGuia({ lugar, recorridos, opciones }: { lugar: string; recorridos: MiRecorrido[]; opciones: OpcionParada[] }) {
  return (
    <section aria-labelledby="t-recorridos" className="grid gap-4 rounded-xl border border-linea bg-papel-alto p-6">
      <div className="grid gap-1">
        <h2 id="t-recorridos" className="m-0 text-xl leading-[26px] font-semibold">
          Tus recorridos ({recorridos.length} de 10)
        </h2>
        <p className="m-0 text-[15px] leading-[22px] text-rio-suave">
          Cada recorrido tiene su página con las paradas, el mapa y un botón para que te lo pidan por WhatsApp con la fecha y el número de personas.
        </p>
      </div>
      {recorridos.map((rc) => (
        <details key={rc.id} className="group rounded-lg border border-linea bg-papel p-4">
          <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-2 [&::-webkit-details-marker]:hidden">
            <b className="mr-auto">{rc.nombre}</b>
            <Insignia variante={rc.estado === "publicado" ? "acreditado" : "neutra"}>{rc.estado === "publicado" ? "Publicado" : "Borrador"}</Insignia>
            <span aria-hidden="true" className="text-xl transition-transform group-open:rotate-180 motion-reduce:transition-none">
              ⌄
            </span>
          </summary>
          <div className="grid gap-4 pt-4">
            <FormRecorrido lugar={lugar} recorrido={rc} opciones={opciones} />
            <BorrarRecorrido lugar={lugar} recorrido={rc.id} />
          </div>
        </details>
      ))}
      {recorridos.length < 10 && (
        <details className="group rounded-lg border border-dashed border-linea-fuerte p-4" open={recorridos.length === 0}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-semibold [&::-webkit-details-marker]:hidden">
            + Nuevo recorrido
            <span aria-hidden="true" className="text-xl transition-transform group-open:rotate-180 motion-reduce:transition-none">
              ⌄
            </span>
          </summary>
          <div className="pt-4">
            <FormRecorrido lugar={lugar} opciones={opciones} />
          </div>
        </details>
      )}
    </section>
  );
}
