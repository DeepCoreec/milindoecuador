import type { Metadata } from "next";
import Link from "next/link";
import { Buscador } from "@/components/busqueda/Buscador";
import { CercaDeMi } from "@/components/busqueda/CercaDeMi";
import { BarraCategorias } from "@/components/categorias/BarraCategorias";
import { Cabecera } from "@/components/layout/Cabecera";
import { Pie } from "@/components/layout/Pie";
import { FilaSitio } from "@/components/guia/ListaSitios";
import { TarjetaResumen } from "@/components/lugares/TarjetaResumen";
import { buscarLugares, getCategoriasBarra, tonoDeCategoria } from "@/lib/datos/lugares";
import { getSitios, type Sitio } from "@/lib/datos/sitios";
import { buscarEnSitios } from "@/lib/osm";
import { leerBusqueda } from "@/lib/validacion/busqueda";

// Las páginas de resultados no se indexan: Google debe llegar a las fichas, no a búsquedas sueltas
export const metadata: Metadata = { title: "Buscar · Mi Lindo Ecuador", robots: { index: false, follow: true } };

const CIUDAD = "guayaquil"; // por ahora la guía solo tiene Guayaquil

export default async function PaginaBuscar({ searchParams }: PageProps<"/buscar">) {
  const parametros = await searchParams;
  const q = leerBusqueda(parametros);
  // Versión 8 (34.2): "?cerca=1" viene del enlace "Cerca de mí" de la portada (la persona ya lo pidió con ese toque)
  const cerca = parametros.cerca === "1";
  const [lugares, categorias] = await Promise.all([q ? buscarLugares(CIUDAD, q) : Promise.resolve([]), getCategoriasBarra(CIUDAD)]);
  // Versión 5, fase 24: si la guía trae poco, también los lugares de referencia de la Guía útil
  const sitios = q && lugares.length < 4 ? buscarEnSitios(await getSitios().catch(() => [] as Sitio[]), q) : [];

  const guiaUtil = sitios.length > 0 && (
          <section aria-labelledby="t-sitios" className="mt-10 mb-10 grid gap-4">
            <h2 id="t-sitios" className="m-0 font-rotulo text-xl leading-[26px] font-normal">
              En la <Link href={`/${CIUDAD}/guia-util`}>Guía útil</Link>
            </h2>
            <p className="m-0 -mt-2 text-sm text-rio-suave">Lugares de referencia de la ciudad (no son negocios registrados). Datos © colaboradores de OpenStreetMap.</p>
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {sitios.map((s) => (
                <FilaSitio key={s.id} s={s} />
              ))}
            </ul>
          </section>
        );

  return (
    <>
      <Cabecera />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-10 pb-16 text-rio md:px-8">
        <h1 className="m-0 mb-5 font-rotulo text-[34px] leading-10 font-normal tracking-[-0.01em] md:text-[56px] md:leading-[62px]">
          {q ? "Resultados" : cerca ? "Cerca de ti" : "Buscar en Guayaquil"}
        </h1>
        <Buscador valor={q ?? ""} />
        <CercaDeMi autoIniciar={cerca} />

        {q && (
          <p aria-live="polite" className="mt-6 mb-4 text-sm leading-5 text-rio-suave">
            {lugares.length === 0
              ? `No encontramos negocios con «${q}».`
              : `${lugares.length === 1 ? "1 lugar" : `${lugares.length} lugares`} con «${q}»`}
          </p>
        )}

        {lugares.length > 0 ? (
          <>
          <h2 className="sr-only">Resultados</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 max-[599px]:[&_.mle-insignias]:inset-x-2 max-[599px]:[&_.mle-insignias]:top-2 max-[599px]:[&_.mle-insignias]:gap-1 max-[599px]:[&_h3]:text-base max-[599px]:[&_h3]:leading-[22px] min-[1000px]:grid-cols-3 min-[1000px]:gap-6">
            {lugares.map((l) => (
              <TarjetaResumen key={`${l.categoria}/${l.slug}`} ciudad={CIUDAD} lugar={l} tono={tonoDeCategoria(l.categoria)} />
            ))}
          </div>
          </>
        ) : (
          <>
          {guiaUtil}
          <section aria-labelledby="t-explora" className={q ? "mt-2" : "mt-10"}>
            <h2 id="t-explora" className="m-0 mb-4 font-rotulo text-xl leading-[26px] font-normal">
              {q ? "Prueba con otra palabra o explora por categoría" : "O explora por categoría"}
            </h2>
            <BarraCategorias categorias={categorias} />
          </section>
          </>
        )}

        {lugares.length > 0 && guiaUtil}
      </main>
      <Pie />
    </>
  );
}
