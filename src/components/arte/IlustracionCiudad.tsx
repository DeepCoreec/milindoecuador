import { ILUSTRACIONES_CIUDAD } from "./ciudades";

/** Ilustración de una ciudad a todo lo ancho, para el fondo de la portada. Decorativa: el texto va encima, aparte. */
export function IlustracionCiudad({ ciudad, className = "" }: { ciudad: string; className?: string }) {
  const Dibujo = ILUSTRACIONES_CIUDAD[ciudad];
  if (!Dibujo) return null;
  return (
    <span className={`mle-afiche block ${className}`} aria-hidden="true">
      <Dibujo />
    </span>
  );
}
