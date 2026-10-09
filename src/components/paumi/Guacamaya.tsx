"use client";

import { useEffect, useMemo, useState } from "react";
import { caminos, componer, LADO, POSE_QUIETA, poseDe, type EstadoPaumi, type Pose } from "./sprite";

const CUADROS_POR_SEGUNDO = 8;

/** Recortes del dibujo: el ave entera (32 x 32) o solo la cabeza (24 x 16, para el botón). */
const RECORTES = {
  entera: [0, 0, LADO, LADO],
  cabeza: [5, 1, 24, 16],
} as const;

/** Sin movimiento, cada estado igual se nota en la cara. */
function poseQuieta(estado: EstadoPaumi): Pose {
  if (estado === "contento") return { ...POSE_QUIETA, ojos: "felices" };
  if (estado === "pensando") return { ...POSE_QUIETA, ojos: "arriba", puntos: 3 };
  if (estado === "escuchando") return { ...POSE_QUIETA, cabeza: [1, 1] };
  return POSE_QUIETA;
}

/**
 * Paumi en pixel art, animada según su estado (versión 3, paso 15.1):
 *  esperando: respira y parpadea · escuchando: se inclina hacia ti · pensando: mira arriba con "…"
 *  hablando: abre y cierra el pico (si se pasa `pico`, lo maneja quien habla, palabra por palabra) · contento: aletea.
 * Decorativa (aria-hidden): su nombre y lo que dice siempre van escritos al lado.
 * Con "reducir movimiento" queda quieta, y no gasta nada si la pestaña está escondida.
 * `escala` es un número entero de pixeles de pantalla por cuadrito, para que no se vea borrosa.
 */
export function Guacamaya({
  estado = "esperando",
  pico,
  escala = 2,
  recorte = "entera",
  animada = true,
  className = "",
}: {
  estado?: EstadoPaumi;
  /** false = imagen fija (el botón flotante: el Panorama es la única animación que corre sola en la página) */
  animada?: boolean;
  pico?: boolean;
  escala?: number;
  recorte?: keyof typeof RECORTES;
  className?: string;
}) {
  const [t, setT] = useState(0);
  const [quieta, setQuieta] = useState(true); // empieza quieta (igual en el servidor y en el navegador)

  useEffect(() => {
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)");
    const leer = () => setQuieta(!animada || reducir.matches);
    leer();
    reducir.addEventListener("change", leer);
    return () => reducir.removeEventListener("change", leer);
  }, [animada]);

  useEffect(() => {
    if (quieta) return;
    const id = setInterval(() => {
      if (!document.hidden) setT((n) => (n + 1) % 1680);
    }, 1000 / CUADROS_POR_SEGUNDO);
    return () => clearInterval(id);
  }, [quieta]);

  // Si nadie maneja el pico, al hablar se abre y se cierra solo
  const picoAbierto = pico ?? t % 3 !== 0;
  const pose = quieta ? poseQuieta(estado) : poseDe(estado, t, picoAbierto);
  const clave = JSON.stringify(pose);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- la clave resume la pose
  const trazos = useMemo(() => caminos(componer(pose)), [clave]);
  const [x, y, ancho, alto] = RECORTES[recorte];

  return (
    <svg
      viewBox={`${x} ${y} ${ancho} ${alto}`}
      width={ancho * escala}
      height={alto * escala}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      data-estado={estado}
      className={`mle-paumi ${className}`}
    >
      {trazos.map(({ color, d }) => (
        <path key={color} d={d} style={{ fill: color }} />
      ))}
    </svg>
  );
}
