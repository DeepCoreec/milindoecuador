import Image from "next/image";
import type { Sitio } from "@/lib/datos/sitios";
import { horarioLegible, TIPOS_SITIO, type TipoSitio } from "@/lib/osm";
import { enlaceRutaGoogle } from "@/lib/ubicacion";

const MOSTRAR = 9;

/**
 * Un lugar de referencia de la Guía útil: nombre, frase o dirección, horario, y Cómo llegar. Sin ficha (no es un negocio).
 * Versión 7 (29.4): si tiene foto de Wikimedia Commons, va arriba con su crédito; la frase del admin manda sobre la
 * descripción de Wikipedia, y esta sobre la dirección.
 */
export function FilaSitio({ s }: { s: Sitio }) {
  const telefono = s.telefono?.split(/[;,/]/)[0]!.replace(/[^\d+]/g, "");
  const texto = s.nota ?? s.descripcion?.texto ?? s.direccion;
  const usaWikipedia = !s.nota && !!s.descripcion;
  return (
    // Diseño de prueba 1 "Postales": con foto, la tarjeta es una postal (marco blanco y el nombre en letra de rótulo)
    <li className={`grid content-start gap-1 overflow-hidden border border-linea bg-papel-alto ${s.foto ? "rounded-sm p-2.5 pb-4" : "rounded-xl p-4"}`}>
      {s.foto && (
        <div className="relative mb-2 aspect-[4/3] overflow-hidden rounded-[2px] bg-celeste-suave">
          <Image src={s.foto.src} alt={`Foto de ${s.nombre}`} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        </div>
      )}
      <b className={s.foto ? "px-1.5 font-rotulo text-[17px] leading-6 font-normal" : "text-base leading-6"}>{s.nombre}</b>
      {texto && <span className={`text-[15px] leading-[22px] text-rio-suave ${s.foto ? "px-1.5" : ""}`}>{texto}</span>}
      {s.horario && <span className={`text-sm leading-5 text-rio-suave ${s.foto ? "px-1.5" : ""}`}>Horario: {horarioLegible(s.horario)}</span>}
      <span className={`mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[15px] ${s.foto ? "px-1.5" : ""}`}>
        <a href={enlaceRutaGoogle(s.ubicacion)} target="_blank" rel="noopener noreferrer" aria-label={`Cómo llegar a ${s.nombre}`}>
          Cómo llegar
        </a>
        {telefono && telefono.length >= 7 && <a href={`tel:${telefono}`}>Llamar</a>}
        {s.web && (
          <a href={s.web} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Página web de ${s.nombre}`}>
            Página web
          </a>
        )}
      </span>
      {(s.foto || usaWikipedia) && (
        <small className={`mt-1 text-[13px] leading-[18px] text-rio-suave ${s.foto ? "px-1.5" : ""}`}>
          {s.foto && (
            <>
              Foto: {s.foto.credito},{" "}
              <a href={s.foto.fuente} target="_blank" rel="noopener noreferrer" className="text-rio-suave">
                {s.foto.licencia}
              </a>
              {usaWikipedia ? ". " : ""}
            </>
          )}
          {usaWikipedia && (
            <a href={s.descripcion!.fuente} target="_blank" rel="noopener noreferrer" className="text-rio-suave">
              Extracto de Wikipedia (CC BY-SA 4.0)
            </a>
          )}
        </small>
      )}
    </li>
  );
}

/**
 * Lugares de la Guía útil separados por tipo, en el orden de `tipos`. Los primeros 9 de cada tipo a la vista y el
 * resto al tocar "Ver más". Si no hay ninguno, muestra `vacio` (o nada).
 */
export function SitiosPorTipo({ sitios, tipos, nivel = 3, vacio }: { sitios: Sitio[]; tipos: readonly TipoSitio[]; nivel?: 3 | 4; vacio?: string }) {
  const H = nivel === 3 ? "h3" : "h4";
  const hay = tipos
    .map((tipo) => ({ t: TIPOS_SITIO.find((x) => x.tipo === tipo)!, lista: sitios.filter((s) => s.tipo === tipo) }))
    .filter((x) => x.lista.length > 0);
  if (!hay.length) return vacio ? <p className="m-0 text-rio-suave">{vacio}</p> : null;
  return (
    <div className="grid gap-8">
      {hay.map(({ t, lista }) => (
        <section key={t.tipo} aria-labelledby={`t-sitio-${t.tipo}`} className="grid gap-3">
          <H id={`t-sitio-${t.tipo}`} className="m-0 text-xl leading-7 font-semibold">
            {t.plural} <span className="text-base font-normal text-rio-suave">({lista.length})</span>
          </H>
          <ul className="m-0 grid list-none items-start gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {lista.slice(0, MOSTRAR).map((s) => (
              <FilaSitio key={s.id} s={s} />
            ))}
          </ul>
          {lista.length > MOSTRAR && (
            <details className="grid gap-3">
              <summary className="cursor-pointer font-semibold">Ver {lista.length - MOSTRAR} más</summary>
              <ul className="m-0 mt-3 grid list-none items-start gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {lista.slice(MOSTRAR).map((s) => (
                  <FilaSitio key={s.id} s={s} />
                ))}
              </ul>
            </details>
          )}
        </section>
      ))}
    </div>
  );
}
