"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FotoGaleria } from "@/lib/datos/sitios";

/*
 * Galería de un lugar para visitar (versión 12, 40.4): una foto grande a la vez, con flechas para pasar a la siguiente
 * o volver, "2 de 6", deslizar con el dedo (desplazamiento con imán, sin librerías) y flechas del teclado. Debajo, el
 * crédito de la foto que se ve y las miniaturas para saltar a cualquiera. Sin movimiento automático.
 */

function Flecha({ lado, onClick, oculta }: { lado: "antes" | "despues"; onClick: () => void; oculta: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lado === "antes" ? "Foto anterior" : "Foto siguiente"}
      className={`absolute top-1/2 z-10 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-linea bg-papel-alto/90 text-2xl leading-none text-rio shadow-flotante transition-opacity motion-reduce:transition-none ${
        lado === "antes" ? "left-3" : "right-3"
      } ${oculta ? "pointer-events-none opacity-0" : "opacity-100"}`}
      tabIndex={oculta ? -1 : 0}
      aria-hidden={oculta}
    >
      <span aria-hidden="true">{lado === "antes" ? "‹" : "›"}</span>
    </button>
  );
}

export function GaleriaSitio({ nombre, fotos }: { nombre: string; fotos: FotoGaleria[] }) {
  const pista = useRef<HTMLDivElement>(null);
  const [actual, setActual] = useState(0);
  const total = fotos.length;

  const ir = useCallback(
    (i: number) => {
      const el = pista.current;
      if (!el) return;
      const n = Math.max(0, Math.min(total - 1, i));
      const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ left: n * el.clientWidth, behavior: suave ? "smooth" : "auto" });
    },
    [total],
  );

  // La foto que se ve se calcula del desplazamiento (así funciona igual con el dedo, las flechas o el teclado)
  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    let pedido = 0;
    const alMover = () => {
      cancelAnimationFrame(pedido);
      pedido = requestAnimationFrame(() => setActual(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1))));
    };
    el.addEventListener("scroll", alMover, { passive: true });
    return () => {
      el.removeEventListener("scroll", alMover);
      cancelAnimationFrame(pedido);
    };
  }, []);

  const foto = fotos[actual] ?? fotos[0]!;
  return (
    <div className="grid gap-2">
      <div
        className="relative overflow-hidden rounded-[20px] bg-celeste-suave"
        role="region"
        aria-roledescription="galería"
        aria-label={`Fotos de ${nombre}`}
      >
        <div
          ref={pista}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault();
              ir(actual + 1);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              ir(actual - 1);
            }
          }}
          className="sin-barra flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto overscroll-x-contain focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-celeste-tinta sm:aspect-[16/9] lg:aspect-[21/9]"
        >
          {fotos.map((f, i) => (
            <div key={f.src} className="relative h-full w-full flex-none snap-center" role="group" aria-roledescription="foto" aria-label={`${i + 1} de ${total}`}>
              <Image src={f.src} alt={f.alt} fill priority={i === 0} sizes="(min-width: 1280px) 1216px, 100vw" className="object-cover" />
            </div>
          ))}
        </div>
        {total > 1 && (
          <>
            <Flecha lado="antes" onClick={() => ir(actual - 1)} oculta={actual === 0} />
            <Flecha lado="despues" onClick={() => ir(actual + 1)} oculta={actual === total - 1} />
            <span className="absolute right-3 bottom-3 rounded-full bg-papel-alto/90 px-3 py-1 text-sm leading-5 font-semibold text-rio" aria-live="polite">
              {actual + 1} de {total}
            </span>
          </>
        )}
      </div>

      <p className="m-0 text-[13px] leading-[18px] text-rio-suave">
        {foto.fuente ? (
          <>
            Foto: {foto.credito ?? "Autor en Wikimedia Commons"},{" "}
            <a href={foto.fuente} target="_blank" rel="noopener noreferrer" className="text-rio-suave">
              {foto.licencia}
            </a>
          </>
        ) : (
          "Foto de Mi Lindo Ecuador"
        )}
      </p>

      {total > 1 && (
        <ul className="sin-barra m-0 flex list-none gap-2 overflow-x-auto p-0 pb-1" aria-label="Elegir foto">
          {fotos.map((f, i) => (
            <li key={f.src} className="flex-none">
              <button
                type="button"
                onClick={() => ir(i)}
                aria-label={`Ver foto ${i + 1} de ${total}`}
                aria-current={i === actual ? "true" : undefined}
                className={`relative block h-14 w-20 cursor-pointer overflow-hidden rounded-md border-2 p-0 md:h-16 md:w-24 ${i === actual ? "border-celeste-tinta" : "border-transparent opacity-80"}`}
              >
                <Image src={f.src} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
