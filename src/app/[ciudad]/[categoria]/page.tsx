import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BarraCategorias } from "@/components/categorias/BarraCategorias";
import { Filtros } from "@/components/categorias/Filtros";
import { Cabecera } from "@/components/layout/Cabecera";
import { Migas } from "@/components/layout/Migas";
import { Pie } from "@/components/layout/Pie";
import { TarjetaResumen } from "@/components/lugares/TarjetaResumen";
import { Boton } from "@/components/ui/Boton";
import { getCategoria, getCategoriasBarra, getCiudad, getLugaresDeCategoria, tonoDeCategoria } from "@/lib/datos/lugares";
import { leerFiltros } from "@/lib/validacion/filtros";

async function cargar(params: PageProps<"/[ciudad]/[categoria]">["params"]) {
  const { ciudad: slugCiudad, categoria: slugCategoria } = await params;
  const [ciudad, categoria] = await Promise.all([getCiudad(slugCiudad), getCategoria(slugCategoria)]);
  if (!ciudad || !categoria) notFound();
  return { ciudad, categoria };
}

export async function generateMetadata({ params }: PageProps<"/[ciudad]/[categoria]">): Promise<Metadata> {
  const { ciudad, categoria } = await cargar(params);
  return { title: `${categoria.nombre} en ${ciudad.nombre} · Mi Lindo Ecuador`, description: categoria.bajada };
}

export default async function PaginaCategoria({ params, searchParams }: PageProps<"/[ciudad]/[categoria]">) {
  const { ciudad, categoria } = await cargar(params);
  const filtros = leerFiltros(await searchParams);
  const [categorias, { lugares, sectores, total }] = await Promise.all([
    getCategoriasBarra(ciudad.slug),
    getLugaresDeCategoria(ciudad.slug, categoria.slug, filtros),
  ]);
  const ruta = `/${ciudad.slug}/${categoria.slug}`;
  const deEjemplo = lugares.length > 0 && lugares.every((l) => l.ejemplo) ? " de ejemplo" : "";
  const tono = tonoDeCategoria(categoria.slug);

  return (
    <>
      <Cabecera />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-6 pb-16 text-rio md:px-8">
        <Migas pasos={[{ texto: ciudad.nombre, href: `/${ciudad.slug}` }, { texto: categoria.nombre }]} />
        <h1 className="m-0 font-rotulo text-[30px] leading-[34px] font-normal tracking-[-0.01em] text-balance md:text-[40px] md:leading-[44px]">
          {categoria.nombre} en {ciudad.nombre}
        </h1>
        <p className="mt-3 mb-0 max-w-[60ch] text-rio-suave">{categoria.bajada}</p>

        <div className="mt-7">
          <BarraCategorias categorias={categorias} activa={categoria.slug} />
        </div>

        {total === 0 ? (
          <div className="mt-8 grid justify-items-start gap-4 rounded-[20px] bg-celeste-suave px-6 py-8 md:px-12 md:py-10">
            <h2 className="m-0 font-rotulo text-xl leading-[26px] font-normal">Todavía no hay lugares aquí</h2>
            <p className="m-0 max-w-[56ch] text-rio-suave">
              Estamos sumando lugares a esta categoría. Si tienes un negocio que encaja aquí, publícalo gratis.
            </p>
            <Boton href="/negocios/registro" variante="principal">
              Registrar mi negocio
            </Boton>
          </div>
        ) : (
          <>
            {/* La key reinicia el formulario cuando cambian los filtros (por ejemplo, con "Quitar filtros") */}
            <Filtros key={JSON.stringify(filtros)} accion={ruta} sectores={sectores} filtros={filtros} />
            <p aria-live="polite" className="mt-0 mb-4 text-sm leading-5 text-rio-suave">
              {lugares.length === 1 ? "1 lugar" : `${lugares.length} lugares`}
              {deEjemplo}
            </p>
            {lugares.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 max-[599px]:[&_h3]:text-base max-[599px]:[&_h3]:leading-[22px] max-[599px]:[&_.mle-insignias]:inset-x-2 max-[599px]:[&_.mle-insignias]:top-2 max-[599px]:[&_.mle-insignias]:gap-1 min-[1000px]:grid-cols-3 min-[1000px]:gap-6">
                {lugares.map((l) => (
                  <TarjetaResumen key={l.slug} ciudad={ciudad.slug} lugar={l} tono={tono} />
                ))}
              </div>
            ) : (
              <div className="grid justify-items-start gap-3 border-t border-linea pt-6">
                <p className="m-0 font-semibold">Ningún lugar coincide con estos filtros.</p>
                <Boton href={ruta} variante="secundario" tamano="chico">
                  Quitar filtros
                </Boton>
              </div>
            )}
          </>
        )}
      </main>
      <Pie />
    </>
  );
}
