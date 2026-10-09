"use client";

import { useRef } from "react";
import { avisar } from "./Estadisticas";

/**
 * El video del negocio en su ficha (versión 3, paso 11.4). No se descarga nada hasta tocar "play"
 * (`preload="none"`; antes se ve la portada), así no gasta los datos de quien solo mira la ficha.
 * Cuenta una reproducción por visita para las estadísticas del dueño.
 */
export function VideoFicha({ lugar, src, portada, duracion, nombre }: { lugar?: string; src: string; portada: string | null; duracion: number; nombre: string }) {
  const contado = useRef(false);
  return (
    <video
      controls
      playsInline
      preload="none"
      poster={portada ?? undefined}
      src={src}
      onPlay={() => {
        if (lugar && !contado.current) {
          contado.current = true;
          avisar(lugar, "video");
        }
      }}
      aria-label={`Video de ${nombre} (${Math.round(duracion)} segundos)`}
      className="max-h-[70vh] w-full rounded-xl bg-celeste-suave object-contain"
    />
  );
}
