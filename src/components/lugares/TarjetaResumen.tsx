import { Insignia } from "@/components/ui/Insignia";
import { InsigniasLugar } from "./InsigniasLugar";
import { rutaLugar } from "@/lib/datos/lugares";
import type { LugarResumen } from "@/lib/datos/tipos";
import { TarjetaLugar } from "./TarjetaLugar";

/** Tarjeta de un lugar a partir de sus datos: pone las insignias según el plan y si es de ejemplo. */
export function TarjetaResumen({ ciudad, lugar: l, tono }: { ciudad: string; lugar: LugarResumen; tono?: "celeste" | "mango" }) {
  const tiene = l.destacado || l.verificado || l.ejemplo;
  return (
    <TarjetaLugar
      href={rutaLugar(ciudad, l)}
      nombre={l.nombre}
      datos={l.datos}
      promedio={l.promedio}
      cantidad={l.cantidad}
      precio={l.precio}
      tono={tono}
      foto={l.foto ?? null}
      categoria={l.categoria}
      insignias={tiene ? <InsigniasLugar lugar={l} /> : undefined}
      extra={l.extra ? <Insignia>{l.extra}</Insignia> : undefined}
    />
  );
}
