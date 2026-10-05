import Image from "next/image";
import type { Foto } from "@/lib/datos/tipos";

const hueco = "grid place-items-center p-2 text-center text-[13px] font-medium text-rio-suave";

/**
 * Fotos de la ficha: una grande y dos chicas en escritorio; en celular solo la grande.
 * Mientras un lugar no tenga fotos se muestran espacios con el mismo tamaño.
 */
export function Galeria({ fotos, tono }: { fotos: Foto[]; tono: "celeste" | "mango" }) {
  const fondo = tono === "mango" ? "bg-mango-suave" : "bg-celeste-suave";
  const huecos: (Foto | null)[] = [0, 1, 2].map((i) => fotos[i] ?? null);
  return (
    <div className="grid gap-2 min-[900px]:h-[440px] min-[900px]:grid-cols-[2fr_1fr] min-[900px]:grid-rows-2">
      {huecos.map((f, i) => (
        <div
          key={i}
          className={`relative aspect-[3/2] overflow-hidden ${fondo} ${
            i === 0
              ? "rounded-[20px] min-[900px]:row-span-2 min-[900px]:rounded-[20px_12px_12px_20px]"
              : "hidden rounded-xl min-[900px]:block"
          } min-[900px]:aspect-auto min-[900px]:h-full`}
        >
          {f ? (
            <Image
              src={f.src}
              alt={f.alt}
              fill
              priority={i === 0}
              sizes={i === 0 ? "(min-width: 900px) 760px, 100vw" : "380px"}
              className="object-cover"
            />
          ) : (
            <span className={`${hueco} h-full`}>{i === 0 ? "Foto principal del lugar" : "Foto del lugar"}</span>
          )}
        </div>
      ))}
    </div>
  );
}
