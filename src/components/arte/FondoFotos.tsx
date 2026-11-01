"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { FotoFondo } from "@/lib/fondos-ciudad";

const CADA = 8000; // ms que se queda cada foto

/**
 * Fondo de la portada con fotos que se van turnando (pedido del usuario, 2026-10-31): un fundido suave cada 8 s,
 * difuminadas y con un velo de noche para que el título se lea. Quieto con "reducir movimiento" y pausado cuando la
 * pestaña no se ve. Las fotos son decorativas (alt vacío); el crédito de la que se ve va abajo a la derecha.
 */
export function FondoFotos({ fotos }: { fotos: FotoFondo[] }) {
  const [actual, setActual] = useState(0);

  useEffect(() => {
    if (fotos.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setActual((n) => (n + 1) % fotos.length);
    }, CADA);
    return () => window.clearInterval(id);
  }, [fotos.length]);

  const foto = fotos[actual]!;
  return (
    <>
      <div className="absolute inset-0 -z-20 overflow-hidden" aria-hidden="true">
        {fotos.map((f, i) => (
          <Image
            key={f.src}
            src={f.src}
            alt=""
            fill
            priority={i === 0}
            quality={60}
            sizes="100vw"
            className={`scale-105 object-cover blur-[2px] transition-opacity duration-[1500ms] ease-in-out motion-reduce:transition-none ${i === actual ? "opacity-100" : "opacity-0"}`}
          />
        ))}
      </div>
      {/* Velo de noche: más oscuro abajo, donde suben las categorías */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-papel/55 via-papel/25 to-papel/90" aria-hidden="true" />
      <small className="absolute right-3 bottom-[76px] text-xs leading-4 text-rio-suave md:right-6 md:bottom-[100px]">
        Foto: {foto.credito},{" "}
        <a href={foto.fuente} target="_blank" rel="noopener noreferrer" className="text-rio-suave">
          {foto.licencia}
        </a>
      </small>
    </>
  );
}
