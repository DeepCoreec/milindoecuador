import type { ReactNode } from "react";
import { Panorama } from "@/components/arte/Panorama";
import { Buscador } from "@/components/busqueda/Buscador";
import { BarraCategorias } from "@/components/categorias/BarraCategorias";
import { Cabecera } from "@/components/layout/Cabecera";
import { Pie } from "@/components/layout/Pie";
import { TarjetaResumen } from "@/components/lugares/TarjetaResumen";
import { Boton } from "@/components/ui/Boton";
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
    <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
      <h2 id={id} className="m-0 font-rotulo text-xl leading-[26px] font-normal text-balance md:text-2xl md:leading-[30px]">
        {titulo}
      </h2>
      {children}
    </div>
  );
}

// La portada se vuelve a generar cada 5 minutos con los lugares nuevos
export const revalidate = 300;

const ancho = "mx-auto w-full max-w-[1200px] px-4 md:px-8";
const seccion = "py-12 min-[900px]:py-16";

export default async function Inicio() {
  const [categorias, { encebollados, imperdibles, tituloComer }] = await Promise.all([getCategoriasBarra("guayaquil"), getSeccionesInicio()]);

  return (
    <>
      <Cabecera />
      <main className="flex-1 text-rio">
        <section className={`${ancho} grid grid-cols-[minmax(0,1fr)] gap-5 pt-10 pb-6`}>
          <h1 className="m-0 font-rotulo text-[30px] leading-[34px] font-normal tracking-[-0.01em] text-balance md:text-[40px] md:leading-[44px]">
            Guayaquil, de punta a punta
          </h1>
          <p className="m-0 max-w-[60ch] text-rio-suave">
            Dónde comer, dónde dormir y qué visitar, recomendado por la gente de aquí. Escríbele directo al negocio por WhatsApp.
          </p>
          <Buscador />
        </section>

        <div className={`${ancho} pb-2`}>
          <Panorama className="rounded-[20px]" />
        </div>

        <section className={`${ancho} pt-12 pb-4 min-[900px]:pt-16`} aria-labelledby="t-cat">
          <CabezaSeccion id="t-cat" titulo="¿Qué buscas hoy?" />
          <BarraCategorias categorias={categorias} />
        </section>

        {encebollados.length > 0 && (
          <section className={`${ancho} pt-6 pb-12 min-[900px]:pb-16`} aria-labelledby="t-ence">
            <CabezaSeccion id="t-ence" titulo={tituloComer}>
              <Boton href="/guayaquil/restaurantes" variante="texto">
                Ver todos
              </Boton>
            </CabezaSeccion>
            <Fila lugares={encebollados} tono="mango" />
          </section>
        )}

        {imperdibles.length > 0 && (
          <section className="border-y border-linea bg-papel-alto">
            <div className={`${ancho} ${seccion}`} aria-labelledby="t-imp">
              <CabezaSeccion id="t-imp" titulo="Imperdibles de Guayaquil">
                <Boton href="/guayaquil/turismo" variante="texto">
                  Ver lugares turísticos
                </Boton>
              </CabezaSeccion>
              <Fila lugares={imperdibles} />
            </div>
          </section>
        )}

        <section className={`${ancho} ${seccion}`} aria-labelledby="t-neg">
          <div className="grid items-center gap-6 rounded-[20px] bg-celeste-suave px-6 py-8 min-[900px]:grid-cols-[minmax(0,1fr)_auto] min-[900px]:px-12 min-[900px]:py-10">
            <div>
              <h2 id="t-neg" className="m-0 font-rotulo text-xl leading-[26px] font-normal text-balance md:text-2xl md:leading-[30px]">
                ¿Tienes un negocio en Guayaquil?
              </h2>
              <p className="mt-2 mb-0 max-w-[56ch] text-rio-suave">
                Publica tu ficha gratis con fotos, horario y tu WhatsApp. Si quieres salir primero, destácala desde 1 $ por semana.
              </p>
            </div>
            <Boton href="/negocios/registro" variante="principal">
              Registrar mi negocio
            </Boton>
          </div>
        </section>
      </main>
      <Pie />
    </>
  );
}
