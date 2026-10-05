"use client";

import Form from "next/form";
import { useRef, useSyncExternalStore } from "react";
import type { Filtros as DatosFiltros } from "@/lib/validacion/filtros";

const PRECIOS = [
  { valor: 1, texto: "$", etiqueta: "Económico" },
  { valor: 2, texto: "$$", etiqueta: "Medio" },
  { valor: 3, texto: "$$$", etiqueta: "Alto" },
] as const;

const sinSuscripcion = () => () => {};

const entrada =
  "mle-select min-h-12 w-full rounded-sm border border-linea-fuerte bg-papel-alto py-2.5 pr-10 pl-3.5 text-base leading-6 text-rio";
const etiqueta = "text-sm leading-5 font-semibold text-rio";

/**
 * Filtros por sector, precio y orden. Es un formulario GET: los filtros quedan en la dirección,
 * así se pueden compartir. Con JavaScript se aplican solos al cambiar; sin JavaScript, con el botón.
 */
export function Filtros({ accion, sectores, filtros }: { accion: string; sectores: string[]; filtros: DatosFiltros }) {
  const ref = useRef<HTMLFormElement>(null);
  // false al dibujarse en el servidor (sin JavaScript), true ya en el navegador
  const conJs = useSyncExternalStore(sinSuscripcion, () => true, () => false);

  return (
    <Form
      ref={ref}
      action={accion}
      scroll={false}
      aria-label="Filtros"
      onChange={() => ref.current?.requestSubmit()}
      className="mt-6 mb-8 flex flex-wrap items-end gap-4"
    >
      <div className="grid min-w-0 flex-[1_1_100%] gap-1.5 sm:max-w-[260px] sm:flex-[1_1_200px]">
        <label htmlFor="f-sector" className={etiqueta}>
          Sector
        </label>
        <select id="f-sector" name="sector" defaultValue={filtros.sector ?? ""} className={entrada}>
          <option value="">Todos los sectores</option>
          {sectores.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="m-0 grid min-w-0 gap-1.5 border-0 p-0">
        <legend className={`${etiqueta} mb-1.5 p-0`}>Precio</legend>
        <div className="flex flex-wrap gap-2">
          {PRECIOS.map((p) => (
            <label
              key={p.valor}
              className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-linea-fuerte bg-papel-alto px-4 text-[15px] leading-5 font-medium text-rio has-checked:border-celeste-tinta has-checked:bg-celeste-suave has-checked:font-bold has-checked:text-celeste-tinta has-focus-visible:shadow-[var(--anillo-foco)]"
            >
              <input
                type="checkbox"
                name="precio"
                value={p.valor}
                defaultChecked={filtros.precios.includes(p.valor)}
                aria-label={`Precio ${p.etiqueta.toLowerCase()}`}
                className="sr-only"
              />
              <span aria-hidden="true">{p.texto}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid min-w-0 flex-[1_1_100%] gap-1.5 sm:max-w-[260px] sm:flex-[1_1_200px] min-[900px]:ml-auto">
        <label htmlFor="f-orden" className={etiqueta}>
          Ordenar
        </label>
        <select id="f-orden" name="orden" defaultValue={filtros.orden} className={entrada}>
          <option value="destacados">Destacados primero</option>
          <option value="calificacion">Mejor calificados</option>
          <option value="resenas">Más reseñas</option>
        </select>
      </div>

      {!conJs && (
        <button type="submit" className="min-h-12 cursor-pointer rounded-md border border-linea-fuerte bg-papel-alto px-6 font-semibold text-rio">
          Aplicar filtros
        </button>
      )}
    </Form>
  );
}
