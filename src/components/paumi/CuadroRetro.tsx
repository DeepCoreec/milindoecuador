"use client";

import { useEffect, useEffectEvent, useMemo, useState, type HTMLAttributes } from "react";
import { NOMBRE } from "@/lib/paumi/personaje";
import { partirEnPantallas, pausaDespuesDe, picoAbiertoEn, suenaEn } from "@/lib/paumi/pantallas";
import { blip } from "./blip";

/**
 * Cuadro de diálogo retro de Paumi (versión 3, paso 15.2): el texto sale letra por letra con un "blip", las respuestas
 * largas van en varias pantallas con ▼, y tocar el cuadro completa la pantalla o pasa a la siguiente.
 * Es solo para la vista: el lector de pantalla recibe la respuesta completa de una vez (ver Paumi.tsx).
 * Con "reducir movimiento" (`quieto`) el texto sale entero, sin escribirse.
 * Para empezar otra respuesta, quien lo usa le cambia la `key`.
 */
export function CuadroRetro({
  texto,
  sonido,
  quieto,
  alPico,
  alTerminar,
  ...resto
}: {
  texto: string;
  sonido: boolean;
  quieto: boolean;
  /** Avisa si el pico va abierto o cerrado en cada letra */
  alPico: (abierto: boolean) => void;
  /** Avisa cuando la última pantalla quedó completa */
  alTerminar: () => void;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">) {
  const pantallas = useMemo(() => partirEnPantallas(texto), [texto]);
  const [pagina, setPagina] = useState(0);
  const [escritas, setEscritas] = useState(quieto ? pantallas[0].length : 0);
  const actual = pantallas[pagina];
  const completa = quieto || escritas >= actual.length;
  const ultima = pagina === pantallas.length - 1;

  const pico = useEffectEvent((abierto: boolean) => alPico(abierto));
  const terminar = useEffectEvent(() => alTerminar());
  const sonar = useEffectEvent((i: number) => {
    if (sonido) blip(i);
  });

  useEffect(() => {
    if (completa) {
      pico(false);
      if (ultima) terminar();
      return;
    }
    pico(picoAbiertoEn(actual, escritas));
    if (suenaEn(actual, escritas)) sonar(escritas);
    const id = setTimeout(() => setEscritas((n) => n + 1), pausaDespuesDe(actual[escritas]));
    return () => clearTimeout(id);
  }, [actual, escritas, completa, ultima]);

  function avanzar() {
    if (!completa) setEscritas(actual.length);
    else if (!ultima) {
      setPagina((p) => p + 1);
      setEscritas(0);
    }
  }

  const visibles = completa ? actual.length : escritas;

  return (
    <div {...resto} onClick={avanzar} data-completo={completa && ultima} className={`mle-cuadro relative cursor-pointer px-4 pt-3 pb-4 ${resto.className ?? ""}`}>
      <p className="m-0 font-rotulo text-[13px] leading-4 text-celeste-tinta" aria-hidden="true">
        {NOMBRE}
      </p>
      {/* El resto del texto va invisible para que el cuadro no cambie de alto mientras escribe */}
      <p className="m-0 mt-1.5 min-h-[88px] pr-6 text-[15px] leading-[22px] break-words text-rio" aria-hidden="true">
        {actual.slice(0, visibles)}
        <span className="invisible">{actual.slice(visibles)}</span>
      </p>
      {pantallas.length > 1 && (
        <p className="m-0 mt-1 text-[13px] leading-4 text-rio-suave" aria-hidden="true">
          {pagina + 1} de {pantallas.length}
        </p>
      )}
      {!(completa && ultima) && (
        <button
          type="button"
          aria-label={completa ? "Siguiente parte" : "Mostrar todo el texto"}
          onClick={(e) => {
            e.stopPropagation();
            avanzar();
          }}
          className="absolute right-1 bottom-1 grid size-11 cursor-pointer place-items-center border-0 bg-transparent text-celeste-tinta"
        >
          <svg viewBox="0 0 7 4" width="14" height="8" shapeRendering="crispEdges" aria-hidden="true" className={completa ? "mle-parpadeo" : "opacity-40"}>
            <path d="M0 0h7v1H0zM1 1h5v1H1zM2 2h3v1H2zM3 3h1v1H3z" fill="currentColor" />
          </svg>
        </button>
      )}
    </div>
  );
}
