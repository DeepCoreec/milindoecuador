"use client";

import { useEffect, useRef } from "react";

/**
 * Pausa las animaciones de su contenedor mientras no se ve en pantalla (pone `data-pausa`), para no gastar batería.
 * No dibuja nada visible: es una marca vacía dentro del contenedor.
 */
export function PausaFueraDePantalla() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const caja = ref.current?.parentElement;
    if (!caja || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) caja.removeAttribute("data-pausa");
      else caja.setAttribute("data-pausa", "");
    });
    obs.observe(caja);
    return () => obs.disconnect();
  }, []);
  return <span ref={ref} hidden />;
}
