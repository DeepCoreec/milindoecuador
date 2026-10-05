import type { Metadata } from "next";
import { Buscador } from "@/components/busqueda/Buscador";
import { BarraCategorias } from "@/components/categorias/BarraCategorias";
import { Cabecera } from "@/components/layout/Cabecera";
import { Pie } from "@/components/layout/Pie";
import { TarjetaResumen } from "@/components/lugares/TarjetaResumen";
import { buscarLugares, getCategoriasBarra, tonoDeCategoria } from "@/lib/datos/lugares";
import { leerBusqueda } from "@/lib/validacion/busqueda";

// Las páginas de resultados no se indexan: Google debe llegar a las fichas, no a búsquedas sueltas
export const metadata: Metadata = { title: "Buscar · Mi Lindo Ecuador", robots: { index: false, follow: true } };

const CIUDAD = "guayaquil"; // por ahora la guía solo tiene Guayaquil

export default async function PaginaBuscar({ searchParams }: PageProps<"/buscar">) {
  const q = leerBusqueda(await searchParams);
  const [lugares, categorias] = await Promise.all([q ? buscarLugares(CIUDAD, q) : Promise.resolve([]), getCategoriasBarra(CIUDAD)]);

  return (
    <>
      <Cabecera />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-10 pb-16 text-rio md:px-8">
        <h1 className="m-0 mb-5 font-rotulo text-[30px] leading-[34px] font-normal tracking-[-0.01em] md:text-[40px] md:leading-[44px]">
          {q ? "Resultados" : "Buscar en Guayaquil"}
        </h1>
        <Buscador valor={q ?? ""} />

        {q && (
          <p aria-live="polite" className="mt-6 mb-4 text-sm leading-5 text-rio-suave">
            {lugares.length === 0
              ? `No encontramos lugares con «${q}».`
              : `${lugares.length === 1 ? "1 lugar" : `${lugares.length} lugares`} con «${q}»`}
          </p>
        )}

        {lugares.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 max-[599px]:[&_.mle-insignias]:inset-x-2 max-[599px]:[&_.mle-insignias]:top-2 max-[599px]:[&_.mle-insignias]:gap-1 max-[599px]:[&_h3]:text-base max-[599px]:[&_h3]:leading-[22px] min-[1000px]:grid-cols-3 min-[1000px]:gap-6">
            {lugares.map((l) => (
              <TarjetaResumen key={`${l.categoria}/${l.slug}`} ciudad={CIUDAD} lugar={l} tono={tonoDeCategoria(l.categoria)} />
            ))}
          </div>
        ) : (
          <section aria-labelledby="t-explora" className={q ? "mt-2" : "mt-10"}>
            <h2 id="t-explora" className="m-0 mb-4 font-rotulo text-xl leading-[26px] font-normal">
              {q ? "Prueba con otra palabra o explora por categoría" : "O explora por categoría"}
            </h2>
            <BarraCategorias categorias={categorias} />
          </section>
        )}
      </main>
      <Pie />
    </>
  );
}
