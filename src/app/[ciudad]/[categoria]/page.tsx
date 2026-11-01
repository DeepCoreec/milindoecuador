import Link from "next/link";
import { Afiche } from "@/components/arte/Afiche";
import { SitiosPorTipo } from "@/components/guia/ListaSitios";
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
import { getSitios, type Sitio } from "@/lib/datos/sitios";
import { TIPOS_POR_CATEGORIA } from "@/lib/osm";
import { paraCompartir } from "@/lib/sitio";
import { leerFiltros } from "@/lib/validacion/filtros";

async function cargar(params: PageProps<"/[ciudad]/[categoria]">["params"]) {
  const { ciudad: slugCiudad, categoria: slugCategoria } = await params;
  const [ciudad, categoria] = await Promise.all([getCiudad(slugCiudad), getCategoria(slugCategoria)]);
  if (!ciudad || !categoria) notFound();
  return { ciudad, categoria };
}

/** Encabezado de una parte que se despliega (versión 8, 32.2): toda la fila se toca, sin el triángulo del navegador. */
const resumen = "flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-lg [&::-webkit-details-marker]:hidden";

export async function generateMetadata({ params }: PageProps<"/[ciudad]/[categoria]">): Promise<Metadata> {
  const { ciudad, categoria } = await cargar(params);
  const titulo = `${categoria.nombre} en ${ciudad.nombre}`;
  return { title: `${titulo} · Mi Lindo Ecuador`, description: categoria.bajada, ...paraCompartir(titulo, categoria.bajada, `/${ciudad.slug}/${categoria.slug}`) };
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
  // Versión 8 (32.2): en las categorías con lugares de la Guía útil, siempre dos partes que se despliegan:
  // "Lugares registrados" (los negocios que se registran) y "Lugares de la guía" (los que pone la guía).
  const tiposReferencia = TIPOS_POR_CATEGORIA[categoria.slug] ?? [];
  const referencia = tiposReferencia.length ? (await getSitios().catch(() => [] as Sitio[])).filter((x) => tiposReferencia.includes(x.tipo)) : [];
  const enDosPartes = referencia.length > 0;
  const conFiltros = filtros.sector !== null || filtros.precios.length > 0 || filtros.orden !== "destacados";
  // Versión 13 (41.5): en Turismo, los guías turísticos (acreditados y con foto primero)
  const guias =
    categoria.slug === "turismo"
      ? (await getLugaresDeCategoria(ciudad.slug, "guias", leerFiltros({})).catch(() => ({ lugares: [], total: 0 })))
      : null;

  const listaRegistrados = (
    <>
        {total === 0 ? (
          <div className="mt-8 grid justify-items-start gap-4 rounded-[20px] bg-celeste-suave px-6 py-8 md:px-12 md:py-10">
            <h2 className="m-0 font-rotulo text-xl leading-[26px] font-normal">
              {categoria.slug === "guias" ? "Todavía no hay guías registrados" : enDosPartes ? "Todavía no hay negocios registrados aquí" : "Todavía no hay lugares aquí"}
            </h2>
            <p className="m-0 max-w-[56ch] text-rio-suave">
              {categoria.slug === "guias"
                ? "¿Eres guía de turismo en Guayaquil? Publica gratis tu perfil con tu foto, tus idiomas, tus recorridos y tu WhatsApp para que los turistas te encuentren. Si tienes una agencia, cuéntalo en tu presentación."
                : enDosPartes
                ? "Mientras tanto, mira abajo los lugares de la guía. Si tienes un negocio que encaja aquí, publícalo gratis."
                : "Estamos sumando lugares a esta categoría. Si tienes un negocio que encaja aquí, publícalo gratis."}
            </p>
            {categoria.slug === "guias" ? (
              <Boton href="/negocios/registro?categoria=guias" variante="principal">
                Registrarme como guía
              </Boton>
            ) : (
              <Boton href="/negocios/registro" variante="principal">
                Registrar mi negocio
              </Boton>
            )}
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
              <>
              <h2 className="sr-only">Lugares</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 max-[599px]:[&_h3]:text-base max-[599px]:[&_h3]:leading-[22px] max-[599px]:[&_.mle-insignias]:inset-x-2 max-[599px]:[&_.mle-insignias]:top-2 max-[599px]:[&_.mle-insignias]:gap-1 min-[1000px]:grid-cols-3 min-[1000px]:gap-6">
                {lugares.map((l) => (
                  <TarjetaResumen key={l.slug} ciudad={ciudad.slug} lugar={l} tono={tono} />
                ))}
              </div>
              </>
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
    </>
  );

  return (
    <>
      <Cabecera />
      <main className="flex-1 text-rio">
        {/* Versión 4: entrada de noche con el afiche de la categoría (como la portada) */}
        <section data-theme="dark" className="bg-papel text-rio">
          <div className="mx-auto grid w-full max-w-[1280px] items-center gap-6 px-4 pt-6 pb-10 md:grid-cols-[minmax(0,1fr)_auto] md:px-8 md:pb-14">
            <div className="grid gap-3">
              <Migas pasos={[{ texto: ciudad.nombre, href: `/${ciudad.slug}` }, { texto: categoria.nombre }]} />
              <h1 className="m-0 font-rotulo text-[34px] leading-10 font-normal tracking-[-0.01em] text-balance md:text-[56px] md:leading-[62px]">
                {categoria.nombre} en {ciudad.nombre}
              </h1>
              <p className="m-0 max-w-[60ch] text-lg leading-7 text-rio-suave">{categoria.bajada}</p>
            </div>
            <Afiche slug={categoria.slug} className="size-28 max-md:hidden md:size-44 lg:size-52" />
          </div>
        </section>

        <div className="mx-auto w-full max-w-[1280px] px-4 pt-6 pb-16 md:px-8">
        <div>
          <BarraCategorias categorias={categorias} activa={categoria.slug} />
        </div>

        {enDosPartes ? (
          <details open={total > 0 || conFiltros} className="group/reg mt-8 border-t border-linea pt-6">
            <summary className={resumen}>
              <h2 className="m-0 font-rotulo text-[26px] leading-8 font-normal md:text-[32px] md:leading-10">
                Lugares registrados <span className="font-sans text-lg text-rio-suave">({total})</span>
              </h2>
              <span aria-hidden="true" className="text-2xl transition-transform group-open/reg:rotate-180 motion-reduce:transition-none">
                ⌄
              </span>
            </summary>
            <p className="mt-2 mb-4 max-w-[64ch] text-rio-suave">Negocios que se registraron en la guía, con su ficha, reseñas y WhatsApp.</p>
            {listaRegistrados}
          </details>
        ) : (
          listaRegistrados
        )}

        {enDosPartes && (
          <details open={total === 0} className="group/guia mt-6 border-t border-linea pt-6">
            <summary className={resumen}>
              <h2 className="m-0 font-rotulo text-[26px] leading-8 font-normal md:text-[32px] md:leading-10">
                {categoria.slug === "reparaciones" ? "Más lugares en la ciudad" : "Lugares de la guía"}{" "}
                <span className="font-sans text-lg text-rio-suave">({referencia.length})</span>
              </h2>
              <span aria-hidden="true" className="text-2xl transition-transform group-open/guia:rotate-180 motion-reduce:transition-none">
                ⌄
              </span>
            </summary>
            <div className="mt-2 grid gap-6">
              <p className="m-0 max-w-[64ch] text-rio-suave">
                Lugares de referencia que pone nuestra <Link href={`/${ciudad.slug}/guia-util`}>Guía útil</Link>, con foto y «Cómo llegar». No son
                negocios registrados: confirma horarios antes de ir. Datos de{" "}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
                  OpenStreetMap
                </a>{" "}
                y Wikimedia.
              </p>
              <SitiosPorTipo sitios={referencia} tipos={tiposReferencia} />
            </div>
          </details>
        )}

        {guias && (
          <section aria-labelledby="t-guias" className="mt-6 grid gap-4 border-t border-linea pt-6">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <h2 id="t-guias" className="m-0 font-rotulo text-[26px] leading-8 font-normal md:text-[32px] md:leading-10">
                Guías turísticos
              </h2>
              {guias.total > 3 && (
                <Link href={`/${ciudad.slug}/guias`} className="font-semibold text-celeste-tinta underline underline-offset-2">
                  Ver los {guias.total} guías
                </Link>
              )}
            </div>
            <p className="m-0 max-w-[64ch] text-rio-suave">
              Recorre la ciudad con alguien que la conoce. La insignia «Guía acreditado» quiere decir que revisamos su credencial en el catastro del
              Ministerio de Turismo.
            </p>
            {guias.lugares.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 max-[599px]:[&_h3]:text-base max-[599px]:[&_h3]:leading-[22px] max-[599px]:[&_.mle-insignias]:inset-x-2 max-[599px]:[&_.mle-insignias]:top-2 max-[599px]:[&_.mle-insignias]:gap-1 min-[1000px]:grid-cols-3 min-[1000px]:gap-6">
                {guias.lugares.slice(0, 3).map((l) => (
                  <TarjetaResumen key={l.slug} ciudad={ciudad.slug} lugar={l} tono={tono} />
                ))}
              </div>
            ) : (
              <div className="grid justify-items-start gap-3 rounded-[20px] bg-celeste-suave px-6 py-6 md:px-10">
                <p className="m-0 font-semibold">Todavía no hay guías registrados.</p>
                <p className="m-0 max-w-[56ch] text-rio-suave">¿Eres guía de turismo en Guayaquil? Publica tu perfil gratis con tus idiomas y tu WhatsApp.</p>
                <Boton href="/negocios/registro?categoria=guias" variante="principal" tamano="chico">
                  Registrarme como guía
                </Boton>
              </div>
            )}
          </section>
        )}
        </div>
      </main>
      <Pie />
    </>
  );
}
