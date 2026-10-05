import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Estrellas } from "./Estrellas";

const PRECIOS = { 1: ["$", "Precio económico"], 2: ["$$", "Precio medio"], 3: ["$$$", "Precio alto"] } as const;

export type DatosTarjeta = {
  href: string;
  nombre: string;
  /** Qué es y dónde, en una frase: "Restaurante en Urdesa". */
  datos: string;
  foto?: { src: string; alt: string } | null;
  promedio: number | null;
  cantidad: number;
  precio?: 1 | 2 | 3 | null;
  /** Hasta dos insignias, arriba a la izquierda de la foto. */
  insignias?: ReactNode;
  /** Dato útil a la derecha cuando no hay precio (por ejemplo "Entrada libre"). */
  extra?: ReactNode;
  tono?: "celeste" | "mango";
};

/** Un lugar en una lista: toda la tarjeta es un enlace a su ficha. Sin sombra ni borde: la foto hace de borde. */
export function TarjetaLugar(t: DatosTarjeta) {
  const precio = t.precio ? PRECIOS[t.precio] : null;
  return (
    <Link href={t.href} className="group grid min-w-0 gap-3 rounded-md text-rio no-underline">
      <div
        className={`relative grid aspect-[4/3] place-items-center overflow-hidden rounded-md p-2 text-center text-[13px] font-medium text-rio-suave ${
          t.tono === "mango" ? "bg-mango-suave" : "bg-celeste-suave"
        }`}
      >
        {t.foto ? (
          <Image src={t.foto.src} alt={t.foto.alt} fill sizes="(min-width: 1000px) 25vw, (min-width: 600px) 50vw, 100vw" className="object-cover" />
        ) : (
          <span>Foto del lugar</span>
        )}
        {t.insignias && <div className="absolute top-3 right-3 left-3 flex flex-wrap gap-2">{t.insignias}</div>}
      </div>
      <h3 className="m-0 text-lg leading-6 font-semibold group-hover:underline group-hover:underline-offset-[3px]">{t.nombre}</h3>
      <p className="m-0 -mt-2 text-sm leading-5 text-rio-suave">{t.datos}</p>
      <div className="flex items-center justify-between gap-2">
        <Estrellas promedio={t.promedio} cantidad={t.cantidad} corto />
        {precio ? (
          <span className="text-sm leading-5 font-semibold" aria-label={precio[1]}>
            {precio[0]}
          </span>
        ) : (
          t.extra
        )}
      </div>
    </Link>
  );
}
