"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { useState } from "react";
import { IconoCerrar } from "@/components/ui/iconos";
import type { Foto } from "@/lib/datos/tipos";

/**
 * Fotos de la ficha (versión 4): se acomodan según cuántas haya (sin cuadros vacíos de relleno) y al tocar una se
 * abre el visor a pantalla completa, con anterior y siguiente (también con las flechas del teclado).
 *  - 0 fotos: un espacio con el color de la categoría · 1: una grande · 2: dos lado a lado
 *  - 3 o más: una grande y dos chicas; en la última, "+N" si hay más. En el celular, la grande y "Ver las N fotos".
 */
export function Galeria({ fotos, tono }: { fotos: Foto[]; tono: "celeste" | "mango" }) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const fondo = tono === "mango" ? "bg-mango-suave" : "bg-celeste-suave";

  if (fotos.length === 0)
    return (
      <div className={`grid aspect-[3/2] place-items-center rounded-[20px] ${fondo} p-2 text-center text-[13px] font-medium text-rio-suave min-[900px]:aspect-auto min-[900px]:h-[360px]`}>
        Foto principal del lugar
      </div>
    );

  const visibles = fotos.slice(0, 3);
  const resto = fotos.length - visibles.length;
  const disposicion =
    fotos.length === 1
      ? "min-[900px]:h-[480px]"
      : fotos.length === 2
        ? "min-[900px]:h-[440px] min-[900px]:grid-cols-2"
        : "min-[900px]:h-[440px] min-[900px]:grid-cols-[2fr_1fr] min-[900px]:grid-rows-2";

  return (
    <>
      <div className={`relative grid gap-2 ${disposicion}`}>
        {visibles.map((f, i) => {
          const ultima = i === visibles.length - 1 && resto > 0;
          return (
            <button
              key={f.src}
              type="button"
              onClick={() => setAbierta(i)}
              aria-label={ultima ? `Ver las ${fotos.length} fotos` : `Ver la foto en grande: ${f.alt}`}
              className={`group relative aspect-[3/2] cursor-zoom-in overflow-hidden border-0 bg-transparent p-0 ${fondo} ${
                i === 0
                  ? `rounded-[20px] ${fotos.length >= 3 ? "min-[900px]:row-span-2 min-[900px]:rounded-[20px_12px_12px_20px]" : ""}`
                  : "hidden rounded-xl min-[900px]:block"
              } min-[900px]:aspect-auto min-[900px]:h-full`}
            >
              <Image
                src={f.src}
                alt={f.alt}
                fill
                preload={i === 0}
                sizes={i === 0 && fotos.length > 1 ? "(min-width: 900px) 760px, 100vw" : i === 0 ? "(min-width: 1280px) 1200px, 100vw" : "380px"}
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              {ultima && <span className="absolute inset-0 grid place-items-center bg-[#0e2e40]/55 text-xl font-semibold text-white">+{resto}</span>}
            </button>
          );
        })}
        {fotos.length > 1 && (
          <button
            type="button"
            onClick={() => setAbierta(0)}
            className="absolute right-3 bottom-3 min-h-11 cursor-pointer rounded-md border-0 bg-papel-alto px-4 text-sm font-semibold text-rio shadow-flotante min-[900px]:hidden"
          >
            Ver las {fotos.length} fotos
          </button>
        )}
      </div>
      <Visor fotos={fotos} indice={abierta} alCambiar={setAbierta} />
    </>
  );
}

/** Visor a pantalla completa: la foto entera (sin recortar), contador y botones grandes para el dedo. */
function Visor({ fotos, indice, alCambiar }: { fotos: Foto[]; indice: number | null; alCambiar: (i: number | null) => void }) {
  const f = indice == null ? null : fotos[indice];
  const ir = (paso: number) => indice != null && alCambiar((indice + paso + fotos.length) % fotos.length);
  const boton = "grid size-12 cursor-pointer place-items-center rounded-full border-0 bg-white/15 text-2xl text-white hover:bg-white/25";
  return (
    <Dialog.Root open={f != null} onOpenChange={(a) => !a && alCambiar(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="mle-velo fixed inset-0 z-50 bg-[#0b1d28]/95" />
        <Dialog.Content
          aria-describedby={undefined}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") ir(1);
            if (e.key === "ArrowLeft") ir(-1);
          }}
          className="fixed inset-0 z-50 grid grid-rows-[auto_minmax(0,1fr)_auto] text-white"
        >
          <div className="flex items-center justify-between gap-4 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2">
            <Dialog.Title className="m-0 text-sm font-semibold">
              Foto {(indice ?? 0) + 1} de {fotos.length}
            </Dialog.Title>
            <Dialog.Close aria-label="Cerrar" className={`${boton} [&_svg]:size-6`}>
              <IconoCerrar />
            </Dialog.Close>
          </div>
          <div className="relative mx-2 min-h-0 sm:mx-16">{f && <Image src={f.src} alt={f.alt} fill sizes="100vw" className="object-contain" />}</div>
          <div className="flex items-center justify-between gap-4 px-4 pt-2 pb-[max(16px,env(safe-area-inset-bottom))]">
            {fotos.length > 1 ? (
              <button type="button" onClick={() => ir(-1)} aria-label="Foto anterior" className={boton}>
                ‹
              </button>
            ) : (
              <span />
            )}
            <p className="m-0 line-clamp-2 flex-1 text-center text-sm text-white/80">{f?.alt}</p>
            {fotos.length > 1 ? (
              <button type="button" onClick={() => ir(1)} aria-label="Foto siguiente" className={boton}>
                ›
              </button>
            ) : (
              <span />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
