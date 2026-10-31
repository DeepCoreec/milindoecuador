import Link from "next/link";
import type { ReactNode } from "react";
import { Panorama } from "@/components/arte/Panorama";
import { Buscador } from "@/components/busqueda/Buscador";
import { IconoUbicacion } from "@/components/ui/iconos";
import { BarraCategorias } from "@/components/categorias/BarraCategorias";
import { Cabecera } from "@/components/layout/Cabecera";
import { Pie } from "@/components/layout/Pie";
import { TarjetaEvento } from "@/components/eventos/TarjetaEvento";
import { FranjaGuiaUtil } from "@/components/guia/FranjaGuiaUtil";
import { TarjetaResumen } from "@/components/lugares/TarjetaResumen";
import { getEventos } from "@/lib/datos/eventos";
import { deEstaSemana } from "@/lib/eventos";
import { getCategoriasBarra, getSeccionesInicio } from "@/lib/datos/lugares";
import type { LugarResumen } from "@/lib/datos/tipos";

/** Fila de tarjetas: se desliza de lado en celular y es una cuadrícula de 4 en escritorio. */
function Fila({ lugares, tono }: { lugares: LugarResumen[]; tono?: "mango" }) {
  return (
    <div className="sin-barra grid auto-cols-[minmax(240px,72%)] grid-flow-col gap-4 overflow-x-auto pb-1 min-[1000px]:grid-flow-row min-[1000px]:grid-cols-4 min-[1000px]:gap-6 min-[1000px]:overflow-visible">
      {lugares.map((l) => (
        <TarjetaResumen key={l.slug} ciudad="guayaquil" lugar={l} tono={tono} />
      ))}
    </div>
  );
}

function CabezaSeccion({ id, titulo, children }: { id: string; titulo: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 md:mb-8">
      <h2 id={id} className="m-0 font-rotulo text-[26px] leading-8 font-normal text-balance md:text-4xl md:leading-[44px]">
        {titulo}
      </h2>
      {children}
    </div>
  );
}

// La portada se vuelve a generar cada 5 minutos con los lugares nuevos
export const revalidate = 300;

const ancho = "mx-auto w-full max-w-[1280px] px-4 md:px-8";
const seccion = "py-12 min-[900px]:py-16";

export default async function Inicio() {
  const [categorias, { recomendados }, eventos] = await Promise.all([
    getCategoriasBarra("guayaquil"),
    getSeccionesInicio(),
    getEventos().catch(() => []),
  ]);
  // Versión 5: lo que pasa en los próximos 7 días
  const estaSemana = deEstaSemana(eventos);

  return (
    <>
      <Cabecera />
      <main className="flex-1 text-rio">
        {/* Entrada de noche (versión 4, opción B): mismos colores del modo oscuro, el Panorama a todo lo ancho */}
        <section data-theme="dark" className="bg-papel text-rio" aria-labelledby="t-inicio">
          <div className={`${ancho} grid grid-cols-[minmax(0,1fr)] gap-6 pt-10 md:pt-16`}>
            <h1
              id="t-inicio"
              className="m-0 max-w-[16ch] font-rotulo text-[40px] leading-[46px] font-normal tracking-[-0.01em] text-balance md:text-[64px] md:leading-[70px] min-[1200px]:text-[80px] min-[1200px]:leading-[86px]"
            >
              Guayaquil, de punta a punta
            </h1>
            <div className="grid items-center gap-5 min-[1000px]:grid-cols-[minmax(0,1fr)_minmax(0,560px)] min-[1000px]:gap-10">
              <p className="m-0 max-w-[48ch] text-lg leading-7 text-rio-suave">
                Dónde comer, dónde dormir y qué visitar, recomendado por la gente de aquí. Escríbele directo al negocio por WhatsApp.
              </p>
              <div className="grid justify-items-start gap-3">
                <Buscador />
                {/* Versión 8 (34.2): lugares, eventos y cosas para visitar cerca de donde estás */}
                <Link href="/buscar?cerca=1" className="inline-flex min-h-11 items-center gap-2 font-semibold [&_svg]:size-5">
                  <IconoUbicacion />
                  Cerca de mí
                </Link>
              </div>
            </div>
          </div>
          <div className="mx-auto mt-10 w-full max-w-[1600px] md:mt-14">
            <Panorama />
          </div>
        </section>

        <section className={`${ancho} ${seccion}`} aria-labelledby="t-cat">
          <CabezaSeccion id="t-cat" titulo="¿Qué buscas hoy?" />
          <BarraCategorias categorias={categorias} grande />
        </section>

        {/* Versión 8 (32.1): solo negocios con el plan Destacado pagado; sin ninguno, la sección no aparece */}
        {recomendados.length > 0 && (
          <section className="bg-mango text-on-color" aria-labelledby="t-recomendados">
            <div className={`${ancho} ${seccion}`}>
              <CabezaSeccion id="t-recomendados" titulo="Recomendados en Guayaquil" />
              <div className="rounded-[20px] bg-papel-alto p-4 text-rio md:p-6">
                <Fila lugares={recomendados} />
              </div>
            </div>
          </section>
        )}

        <section className={`${ancho} ${seccion}`} aria-labelledby="t-eventos">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 md:mb-8">
            <h2 id="t-eventos" className="m-0 font-rotulo text-[26px] leading-8 font-normal text-balance md:text-4xl md:leading-[44px]">
              Esta semana en Guayaquil
            </h2>
            <Link href="/guayaquil/eventos" className="inline-flex min-h-11 items-center font-semibold">
              Ver todos los eventos
            </Link>
          </div>
          {estaSemana.length > 0 ? (
            <div className="sin-barra grid auto-cols-[minmax(240px,72%)] grid-flow-col gap-4 overflow-x-auto pb-1 min-[1000px]:grid-flow-row min-[1000px]:grid-cols-4 min-[1000px]:gap-6 min-[1000px]:overflow-visible">
              {estaSemana.map((e) => (
                <TarjetaEvento key={e.id} e={e} />
              ))}
            </div>
          ) : (
            <p className="m-0 max-w-[60ch] rounded-[20px] bg-mango-suave p-6 text-[17px] leading-7">
              Todavía no hay eventos esta semana. ¿Organizas un concierto, una feria o la fiesta del barrio?{" "}
              <Link href="/guayaquil/eventos/nuevo" className="font-semibold">
                Publícalo gratis
              </Link>
              .
            </p>
          )}
        </section>

        <div className={`${ancho} pb-12 min-[900px]:pb-16`}>
          <FranjaGuiaUtil />
        </div>

        <section data-theme="dark" className="bg-papel text-rio" aria-labelledby="t-neg">
          <div className={`${ancho} ${seccion} grid items-center gap-6 min-[900px]:grid-cols-[minmax(0,1fr)_auto]`}>
            <div>
              <h2 id="t-neg" className="m-0 max-w-[20ch] font-rotulo text-[28px] leading-9 font-normal text-balance md:text-[40px] md:leading-[48px]">
                ¿Tienes un negocio? Ponlo en el mapa.
              </h2>
              <p className="mt-3 mb-0 max-w-[56ch] text-rio-suave">
                Publica tu ficha gratis con fotos, horario y tu WhatsApp. Si quieres salir primero, destácala desde 1 $ por semana.
              </p>
            </div>
            <Link
              href="/negocios/registro"
              className="inline-flex min-h-12 items-center justify-center justify-self-start rounded-md bg-mango px-6 font-semibold text-on-color no-underline"
            >
              Registrar mi negocio gratis
            </Link>
          </div>
        </section>
      </main>
      <Pie />
    </>
  );
}
