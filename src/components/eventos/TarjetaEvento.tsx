import Image from "next/image";
import Link from "next/link";
import type { Evento } from "@/lib/datos/eventos";
import { diaGye, textoPrecio, TIPO_SINGULAR } from "@/lib/eventos";

const fmtMes = new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", month: "short" });
const fmtHora = new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", hour: "2-digit", minute: "2-digit", hour12: false });
const fmtDia = new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", weekday: "short", day: "numeric", month: "short" });

/**
 * Un evento en una lista (versión 5): toda la tarjeta lleva a su ficha. Arriba, el afiche (o, si no tiene, un bloque de color con
 * el tipo de evento) y la hoja de calendario con el día; abajo, nombre, cuándo, dónde y precio.
 */
export function TarjetaEvento({ e, ciudad = "guayaquil" }: { e: Evento; ciudad?: string }) {
  const inicio = new Date(e.inicio);
  const dia = Number(diaGye(inicio).slice(8));
  const mes = fmtMes.format(inicio).replace(".", "");
  const variosDias = diaGye(e.inicio) !== diaGye(e.fin);
  const cuando = variosDias ? `${fmtDia.format(inicio).replace(/\./g, "")} al ${fmtDia.format(new Date(e.fin)).replace(/\./g, "")}` : `${fmtDia.format(inicio).replace(/\./g, "")}, ${fmtHora.format(inicio)}`;
  return (
    <Link href={`/${ciudad}/eventos/${e.slug}`} className="group relative grid min-w-0 content-start gap-3 rounded-[20px] text-rio no-underline">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-mango-suave">
        {e.afiche ? (
          <Image
            src={e.afiche.src}
            alt={e.afiche.alt}
            fill
            sizes="(min-width: 1280px) 300px, (min-width: 600px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transition-none"
          />
        ) : (
          <span aria-hidden="true" className="absolute inset-0 grid place-items-center px-6 pt-10 text-center font-rotulo text-[28px] leading-[34px] text-balance text-rio/80">
            {TIPO_SINGULAR[e.tipo]}
          </span>
        )}
        <span aria-hidden="true" className="absolute top-3 left-3 grid min-w-14 justify-items-center rounded-md bg-papel-alto px-2 py-1.5 text-rio shadow-flotante">
          <span className="font-rotulo text-xl leading-6">{dia}</span>
          <span className="text-xs leading-4 font-semibold">{mes}</span>
        </span>
        <span aria-hidden="true" className="absolute right-3 bottom-3 rounded-full bg-papel-alto px-3 py-1 text-sm leading-5 font-bold text-rio shadow-flotante">
          {textoPrecio(e.precio)}
        </span>
      </div>
      <div className="grid gap-1">
        <h3 className="m-0 text-lg leading-6 font-semibold text-balance group-hover:underline">{e.titulo}</h3>
        <p className="m-0 text-[15px] leading-[22px] text-rio-suave first-letter:uppercase">{cuando}</p>
        <p className="m-0 text-[15px] leading-[22px] text-rio-suave">
          {TIPO_SINGULAR[e.tipo]} {e.enLinea ? "en línea" : `en ${e.lugar}`}
          <span className="sr-only">. {textoPrecio(e.precio)}</span>
        </p>
      </div>
    </Link>
  );
}
