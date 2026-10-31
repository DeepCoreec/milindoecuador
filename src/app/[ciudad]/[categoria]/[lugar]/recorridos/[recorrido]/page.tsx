import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Cabecera } from "@/components/layout/Cabecera";
import { Migas } from "@/components/layout/Migas";
import { Pie } from "@/components/layout/Pie";
import { BotonCompartir } from "@/components/lugares/BotonCompartir";
import { PedirRecorrido } from "@/components/recorridos/PedirRecorrido";
import { clasesBoton } from "@/components/ui/Boton";
import { Insignia } from "@/components/ui/Insignia";
import { IconoUbicacion } from "@/components/ui/iconos";
import { getCategoria, getCiudad, getLugar } from "@/lib/datos/lugares";
import { getRecorrido } from "@/lib/datos/recorridos";
import { rutaSitio } from "@/lib/datos/sitios";
import { enlaceMapaRecorrido, textoPrecio } from "@/lib/recorridos";
import { paraCompartir } from "@/lib/sitio";
import { textoDuracion } from "@/lib/validacion/recorridos";

/*
 * Página de un recorrido de un guía (versión 13, 42.3): las paradas en orden con su foto, el mapa en Google Maps a pie
 * y el botón para pedirlo por WhatsApp con la fecha y las personas ya escritas.
 */

type Props = PageProps<"/[ciudad]/[categoria]/[lugar]/recorridos/[recorrido]">;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const cargar = cache(async (slugCiudad: string, slugCategoria: string, slugLugar: string, id: string) => {
  if (slugCategoria !== "guias" || !UUID.test(id)) notFound();
  const [ciudad, categoria, guia, recorrido] = await Promise.all([
    getCiudad(slugCiudad),
    getCategoria(slugCategoria),
    getLugar(slugCiudad, slugCategoria, slugLugar),
    getRecorrido(id),
  ]);
  // El recorrido tiene que ser de ESTE guía (si no, no existe en esta dirección)
  if (!ciudad || !categoria || !guia || !recorrido || recorrido.lugarId !== guia.id) notFound();
  return { ciudad, categoria, guia, recorrido };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const { ciudad, guia, recorrido } = await cargar(p.ciudad, p.categoria, p.lugar, p.recorrido);
  const titulo = `${recorrido.nombre} · con ${guia.nombre}`;
  const descripcion = recorrido.descripcion.length > 155 ? `${recorrido.descripcion.slice(0, 154).trimEnd()}…` : recorrido.descripcion;
  return {
    title: `${titulo} · ${ciudad.nombre}`,
    description: descripcion,
    ...paraCompartir(titulo, descripcion, `/${ciudad.slug}/guias/${guia.slug}/recorridos/${recorrido.id}`),
  };
}

export default async function PaginaRecorrido({ params }: Props) {
  const p = await params;
  const { ciudad, categoria, guia, recorrido } = await cargar(p.ciudad, p.categoria, p.lugar, p.recorrido);
  const rutaGuia = `/${ciudad.slug}/${categoria.slug}/${guia.slug}`;
  const mapa = enlaceMapaRecorrido(recorrido.paradas.map((s) => s.ubicacion));

  return (
    <>
      <Cabecera />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-6 pb-16 text-rio md:px-8">
        <Migas
          pasos={[
            { texto: ciudad.nombre, href: `/${ciudad.slug}` },
            { texto: categoria.nombre, href: `/${ciudad.slug}/${categoria.slug}` },
            { texto: guia.nombre, href: rutaGuia },
            { texto: recorrido.nombre },
          ]}
        />

        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 pt-6 min-[900px]:grid-cols-[minmax(0,1fr)_380px] min-[900px]:items-start min-[900px]:gap-x-16">
          <div className="grid min-w-0 gap-8">
            <header className="grid gap-3">
              <p className="m-0 text-sm leading-5 font-semibold tracking-[0.08em] text-rio-suave uppercase">Recorrido</p>
              <h1 className="m-0 font-rotulo text-[32px] leading-[38px] font-normal tracking-[-0.01em] text-balance md:text-[48px] md:leading-[54px]">{recorrido.nombre}</h1>
              <div className="flex flex-wrap items-center gap-2 text-base leading-6 text-rio-suave">
                <span>
                  con <Link href={rutaGuia} className="font-semibold text-celeste-tinta underline underline-offset-2">{guia.nombre}</Link>
                </span>
                {guia.acreditado && <Insignia variante="acreditado">Guía acreditado</Insignia>}
              </div>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                <li>
                  <Insignia>{textoDuracion(recorrido.duracion)}</Insignia>
                </li>
                <li>
                  <Insignia>{textoPrecio(recorrido.precio)}</Insignia>
                </li>
                <li>
                  <Insignia>{recorrido.paradas.length} paradas</Insignia>
                </li>
              </ul>
              <p className="m-0 max-w-[62ch] font-historia text-lg leading-[30px]">{recorrido.descripcion}</p>
            </header>

            <section aria-labelledby="t-paradas" className="grid gap-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 id="t-paradas" className="m-0 font-rotulo text-2xl leading-[30px] font-normal">
                  Las paradas
                </h2>
                {mapa && (
                  <a href={mapa} target="_blank" rel="noopener noreferrer" className={clasesBoton("secundario", "chico")}>
                    <IconoUbicacion />
                    Ver la ruta en Google Maps
                  </a>
                )}
              </div>
              <p className="m-0 text-[15px] leading-[22px]">
                <b>Punto de encuentro:</b> {recorrido.encuentro}
              </p>
              <ol className="m-0 grid list-none gap-3 p-0">
                {recorrido.paradas.map((s, i) => (
                  <li key={s.id} className="relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-xl border border-linea bg-papel-alto p-3">
                    <div className="relative size-20 overflow-hidden rounded-md bg-celeste-suave md:size-24">
                      {s.foto && <Image src={s.foto.src} alt="" fill sizes="96px" className="object-cover" />}
                      <span className="absolute top-1 left-1 grid size-7 place-items-center rounded-full bg-rio text-sm font-semibold text-papel-alto">{i + 1}</span>
                    </div>
                    <div className="grid gap-1">
                      <h3 className="m-0 text-base leading-[22px] font-semibold">
                        <Link href={rutaSitio(s)} className="text-rio no-underline after:absolute after:inset-0 hover:underline">
                          {s.nombre}
                        </Link>
                      </h3>
                      {s.nota && <p className="m-0 line-clamp-2 text-sm leading-5 text-rio-suave">{s.nota}</p>}
                    </div>
                  </li>
                ))}
              </ol>
              <p className="m-0 text-sm leading-5 text-rio-suave">Toca una parada para ver sus fotos, su horario y cómo llegar.</p>
            </section>
          </div>

          <aside aria-labelledby="t-pedir" className="grid gap-4 rounded-xl border border-linea bg-papel-alto p-6 min-[900px]:sticky min-[900px]:top-6">
            <h2 id="t-pedir" className="m-0 text-xl leading-[26px] font-semibold">
              Pide este recorrido
            </h2>
            {guia.whatsapp && guia.id ? (
              <PedirRecorrido lugar={guia.id} numero={guia.whatsapp} recorrido={recorrido.nombre} />
            ) : (
              <p className="m-0 text-rio-suave">
                Este guía todavía no puso su WhatsApp. Mira su <Link href={rutaGuia}>ficha</Link> para otras formas de contacto.
              </p>
            )}
            <BotonCompartir titulo={`${recorrido.nombre} · Mi Lindo Ecuador`} texto={`Mira este recorrido por ${ciudad.nombre} con ${guia.nombre}`} />
          </aside>
        </div>
      </main>
      <Pie />
    </>
  );
}
