"use client";

import { useActionState } from "react";
import { cambiarEstadoMiNegocio, type EstadoDueno } from "@/acciones/dueno";
import { clasesBoton } from "@/components/ui/Boton";

const inicial: EstadoDueno = { estado: "inicio" };

type Props = {
  lugar: string;
  estado: "borrador" | "publicado" | "oculto";
  listo: { descripcion: boolean; fotos: boolean };
  ruta: string;
};

/** Publicar o pausar la ficha, con lo que falta para poder publicarla. */
export function EstadoNegocio({ lugar, estado, listo, ruta }: Props) {
  const [r, accion, cambiando] = useActionState(
    cambiarEstadoMiNegocio,
    inicial,
  );
  return (
    <section
      aria-labelledby="t-estado"
      className="grid gap-3 rounded-xl border border-linea bg-papel-alto p-6"
    >
      <h2 id="t-estado" className="m-0 text-xl leading-[26px] font-semibold">
        {estado === "publicado"
          ? "Tu ficha se ve en la guía"
          : estado === "oculto"
            ? "Tu ficha está en revisión"
            : "Tu ficha todavía no se ve"}
      </h2>
      {estado === "oculto" && (
        <p className="m-0 text-rio-suave">
          La ocultamos para revisarla (por ejemplo, porque varias personas la
          reportaron). Escríbenos por WhatsApp para resolverlo.
        </p>
      )}
      {estado === "borrador" && (
        <ul className="m-0 grid list-none gap-1.5 p-0 text-[15px] leading-[22px]">
          <li>
            {listo.descripcion ? "✓" : "○"} Escribe la descripción de tu negocio
          </li>
          <li>{listo.fotos ? "✓" : "○"} Sube al menos una foto</li>
        </ul>
      )}
      {estado !== "oculto" && (
        <form action={accion} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="lugar" value={lugar} />
          <input
            type="hidden"
            name="estado"
            value={estado === "publicado" ? "borrador" : "publicado"}
          />
          <button
            type="submit"
            disabled={
              cambiando ||
              (estado === "borrador" && !(listo.descripcion && listo.fotos))
            }
            className={clasesBoton(
              estado === "publicado" ? "secundario" : "principal",
            )}
          >
            {cambiando
              ? "Un momento…"
              : estado === "publicado"
                ? "Pausar mi ficha"
                : "Publicar mi ficha"}
          </button>
          {estado === "publicado" && (
            <a href={ruta} target="_blank" className="text-[15px] leading-5">
              Ver mi ficha
            </a>
          )}
        </form>
      )}
      {r.estado !== "inicio" && r.mensaje && (
        <p
          role={r.estado === "error" ? "alert" : "status"}
          className={`m-0 text-sm leading-5 font-semibold ${r.estado === "error" ? "text-error" : "text-exito"}`}
        >
          {r.mensaje}
        </p>
      )}
    </section>
  );
}
