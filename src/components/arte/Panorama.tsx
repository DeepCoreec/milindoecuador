"use client";

import { useEffect, useRef } from "react";
import { crearEscena } from "./panorama-escena";

const CUADRO_FIJO = 25; // instante con la balandra a mitad del río

/**
 * El Cerro Santa Ana en pixel art, siempre de noche. La única animación que corre sola:
 * 24 cuadros por segundo, se pausa fuera de pantalla y queda fija con "reducir movimiento".
 * Primero se dibuja un cuadro fijo y la animación arranca cuando el navegador queda libre,
 * para no competir con la carga de la página.
 */
export function Panorama({ quieto = false, className = "" }: { quieto?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const escena = crearEscena(cv);
    escena.leerColores();

    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    let ultimo = 0;
    let pedido = 0;
    let cancelarEspera = () => {};
    let t0 = performance.now();

    const cuadro = (ahora: number) => {
      if (visible && ahora - ultimo > 1000 / 24) {
        ultimo = ahora;
        escena.pintar((ahora - t0) / 1000 + 11);
      }
      pedido = requestAnimationFrame(cuadro);
    };
    const animar = () => {
      t0 = performance.now() - (CUADRO_FIJO - 11) * 1000; // sigue desde el cuadro fijo, sin saltos
      pedido = requestAnimationFrame(cuadro);
    };
    const arrancar = () => {
      cancelAnimationFrame(pedido);
      escena.pintar(CUADRO_FIJO);
      if (quieto || reducir.matches) return;
      cancelarEspera();
      if (typeof window.requestIdleCallback === "function") {
        const id = window.requestIdleCallback(animar, { timeout: 4000 });
        cancelarEspera = () => window.cancelIdleCallback(id);
      } else {
        const id = setTimeout(animar, 2500);
        cancelarEspera = () => clearTimeout(id);
      }
    };

    const observador = new IntersectionObserver((e) => {
      visible = e[0]?.isIntersecting ?? true;
    });
    observador.observe(cv);
    reducir.addEventListener("change", arrancar);
    arrancar();

    return () => {
      cancelAnimationFrame(pedido);
      cancelarEspera();
      observador.disconnect();
      reducir.removeEventListener("change", arrancar);
    };
  }, [quieto]);

  return (
    <canvas
      ref={ref}
      width={240}
      height={100}
      data-theme="dark"
      role="img"
      aria-label="Ilustración animada del Cerro Santa Ana de noche: casas de colores, la escalinata, el faro que gira y una balandra que cruza el río Guayas"
      className={`mle-panorama bg-[#0b1d28] ${className}`}
    />
  );
}
