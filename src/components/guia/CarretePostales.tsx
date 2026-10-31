import Image from "next/image";
import type { Sitio } from "@/lib/datos/sitios";

/*
 * Diseño de prueba 1 "Postales": un carrete de postales de los lugares de la guía que tienen foto, que se desliza solo y
 * despacio debajo del título de la categoría. Es el único movimiento automático de la página; se detiene al pasar el
 * dedo o el ratón, y con "reducir movimiento" queda quieto (estilos en globals.css). Los créditos de cada foto están en
 * la tarjeta del lugar, más abajo en la misma página.
 */

const GIROS = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];

function Postal({ s, i }: { s: Sitio; i: number }) {
  return (
    <li className={`w-[168px] flex-none md:w-[208px] ${GIROS[i % GIROS.length]}`}>
      <div className="rounded-sm bg-rio p-2 pb-3 text-papel">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2px] bg-celeste-suave">
          <Image src={s.foto!.src} alt={`Foto de ${s.nombre}`} fill sizes="208px" className="object-cover" />
        </div>
        <p className="mt-2 mb-0 line-clamp-2 font-rotulo text-[13px] leading-[18px]">{s.nombre}</p>
      </div>
    </li>
  );
}

export function CarretePostales({ sitios }: { sitios: Sitio[] }) {
  const conFoto = sitios.filter((s) => s.foto).slice(0, 12);
  if (conFoto.length < 4) return null;
  return (
    <div className="mle-carrete sin-barra overflow-hidden py-4" role="region" aria-label="Postales de los lugares de la guía">
      <div className="mle-carrete-pista flex w-max">
        <ul className="m-0 flex list-none gap-6 p-0 pr-6">
          {conFoto.map((s, i) => (
            <Postal key={s.id} s={s} i={i} />
          ))}
        </ul>
        {/* Copia para que el carrete no tenga corte; los lectores de pantalla la saltan */}
        <ul className="mle-carrete-copia m-0 flex list-none gap-6 p-0 pr-6" aria-hidden="true">
          {conFoto.map((s, i) => (
            <Postal key={s.id} s={s} i={i} />
          ))}
        </ul>
      </div>
    </div>
  );
}
