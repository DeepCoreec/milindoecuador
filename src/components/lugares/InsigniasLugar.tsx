import { Insignia } from "@/components/ui/Insignia";
import type { LugarResumen } from "@/lib/datos/tipos";

/** Insignias de un lugar según su plan y si es de ejemplo. Nada si no tiene ninguna. */
export function InsigniasLugar({ lugar: l, className = "" }: { lugar: Pick<LugarResumen, "destacado" | "verificado" | "ejemplo">; className?: string }) {
  if (!l.destacado && !l.verificado && !l.ejemplo) return null;
  const contenido = (
    <>
      {l.destacado && <Insignia variante="destacado">Destacado</Insignia>}
      {l.verificado && <Insignia variante="verificado">Verificado</Insignia>}
      {l.ejemplo && <Insignia variante="ejemplo">Ejemplo</Insignia>}
    </>
  );
  return className ? <div className={className}>{contenido}</div> : contenido;
}
