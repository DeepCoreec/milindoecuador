import type { ReactNode } from "react";
import { IconoVisto } from "./iconos";

type Variante = "destacado" | "verificado" | "neutra" | "ejemplo";

const variantes: Record<Variante, string> = {
  destacado: "bg-mango border-mango text-on-color",
  verificado: "bg-celeste-suave border-celeste-suave text-celeste-tinta",
  neutra: "bg-papel-alto border-linea text-rio",
  ejemplo: "bg-papel border-linea-fuerte border-dashed text-rio-suave",
};

/** Etiqueta corta. Destacado y Verificado solo para negocios que tienen ese plan. */
export function Insignia({ variante = "neutra", children }: { variante?: Variante; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-2 py-0.5 text-[13px] font-semibold leading-4 [&_svg]:size-3.5 ${variantes[variante]}`}
    >
      {variante === "verificado" && <IconoVisto />}
      {children}
    </span>
  );
}
