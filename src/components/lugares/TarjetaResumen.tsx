import { Insignia } from "@/components/ui/Insignia";
import { rutaLugar } from "@/lib/datos/lugares";
import type { LugarResumen } from "@/lib/datos/tipos";
import { TarjetaLugar } from "./TarjetaLugar";

/** Tarjeta de un lugar a partir de sus datos: pone las insignias según el plan y si es de ejemplo. */
export function TarjetaResumen({ ciudad, lugar: l, tono }: { ciudad: string; lugar: LugarResumen; tono?: "celeste" | "mango" }) {
  const insignias =
    l.plan !== "gratis" || l.ejemplo ? (
      <>
        {l.plan === "destacado" && <Insignia variante="destacado">Destacado</Insignia>}
        {l.plan === "verificado" && <Insignia variante="verificado">Verificado</Insignia>}
        {l.ejemplo && <Insignia variante="ejemplo">Ejemplo</Insignia>}
      </>
    ) : undefined;
  return (
    <TarjetaLugar
      href={rutaLugar(ciudad, l)}
      nombre={l.nombre}
      datos={l.datos}
      promedio={l.promedio}
      cantidad={l.cantidad}
      precio={l.precio}
      tono={tono}
      insignias={insignias}
      extra={l.extra ? <Insignia>{l.extra}</Insignia> : undefined}
    />
  );
}
