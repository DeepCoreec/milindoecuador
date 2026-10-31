import { ILUSTRACIONES_CIUDAD } from "./ciudades";
import { PausaFueraDePantalla } from "./PausaFueraDePantalla";

/**
 * Ilustración de una ciudad a todo lo ancho, para el fondo de la portada. Decorativa: el texto va encima, aparte.
 * Se mueve despacio (estilos "mle-ciudad" en globals.css) y se pausa cuando sale de la pantalla.
 */
export function IlustracionCiudad({ ciudad, className = "" }: { ciudad: string; className?: string }) {
  const Dibujo = ILUSTRACIONES_CIUDAD[ciudad];
  if (!Dibujo) return null;
  return (
    <span className={`mle-afiche mle-ciudad block ${className}`} aria-hidden="true">
      <Dibujo />
      <PausaFueraDePantalla />
    </span>
  );
}
