import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecera } from "@/components/layout/Cabecera";
import { Migas } from "@/components/layout/Migas";
import { Pie } from "@/components/layout/Pie";
import { getCiudad } from "@/lib/datos/lugares";
import { getGuiasNocturnos } from "@/lib/datos/recorridos";
import { Insignia } from "@/components/ui/Insignia";
import { textoPrecio } from "@/lib/recorridos";
import { textoDuracion } from "@/lib/validacion/recorridos";
import { getSitios, rutaSitio, type Sitio } from "@/lib/datos/sitios";
import { LEYENDAS, RECORRIDOS_OFICIALES, type Fuente } from "@/lib/misterio";
import { paraCompartir } from "@/lib/sitio";
import { normalizar } from "@/lib/validacion/busqueda";

export const revalidate = 300;

const descripcion = "Leyendas de Guayaquil con su lugar real y su fuente: la dama tapada, el banquero que salió del cementerio, el tesoro del Cerro Santa Ana y más.";

export async function generateMetadata({ params }: PageProps<"/[ciudad]/misterio">): Promise<Metadata> {
  const c = await getCiudad((await params).ciudad);
  if (!c || c.slug !== "guayaquil") return {};
  return { title: `${c.nombre} de misterio · Mi Lindo Ecuador`, description: descripcion, ...paraCompartir(`${c.nombre} de misterio`, descripcion, `/${c.slug}/misterio`) };
}

const enlace = "font-semibold text-celeste-tinta underline underline-offset-2";

function CitaFuente({ f }: { f: Fuente }) {
  return (
    <p className="m-0 text-sm leading-5 text-rio-suave">
      Fuente:{" "}
      <a href={f.url} target="_blank" rel="noopener noreferrer" className={enlace}>
        {f.medio}, {f.fecha} ↗
      </a>
    </p>
  );
}

/**
 * "Guayaquil de misterio" (versión 13, fase 43): leyendas con su lugar real y su fuente, y los recorridos oficiales
 * confirmados. Nunca se invita a entrar a lugares abandonados, cerrados o privados.
 */
export default async function PaginaMisterio({ params }: PageProps<"/[ciudad]/misterio">) {
  const ciudad = await getCiudad((await params).ciudad);
  // Las leyendas son de Guayaquil: en otras ciudades la página no existe (todavía)
  if (!ciudad || ciudad.slug !== "guayaquil") notFound();
  const [todos, nocturnos] = await Promise.all([getSitios().catch(() => [] as Sitio[]), getGuiasNocturnos(ciudad.slug)]);
  const sitios = todos.filter((s) => s.grupo === "visitar");
  const sitio = (buscar?: string) => (buscar ? sitios.find((s) => normalizar(s.nombre).includes(buscar)) : undefined);
  const h2 = "m-0 font-rotulo text-[26px] leading-8 font-normal md:text-4xl md:leading-[44px]";

  return (
    <>
      <Cabecera />
      <main className="flex-1 text-rio">
        <section data-theme="dark" className="bg-papel text-rio">
          <div className="mx-auto grid w-full max-w-[1280px] gap-4 px-4 pt-6 pb-10 md:px-8 md:pb-14">
            <Migas pasos={[{ texto: ciudad.nombre, href: `/${ciudad.slug}` }, { texto: "Turismo", href: `/${ciudad.slug}/turismo` }, { texto: "De misterio" }]} />
            <h1 className="m-0 font-rotulo text-[34px] leading-10 font-normal tracking-[-0.01em] text-balance md:text-[56px] md:leading-[62px]">{ciudad.nombre} de misterio</h1>
            <p className="m-0 max-w-[62ch] text-lg leading-7 text-rio-suave">
              Las leyendas que se cuentan en la ciudad desde hace siglos, con el lugar real donde pasan y de dónde viene cada historia. Para
              conocerlas de cerca, con alguien que las cuente bien, busca un guía.
            </p>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-[1280px] gap-14 px-4 pt-8 pb-16 md:px-8">
          <aside role="note" aria-labelledby="t-cuidado" className="grid gap-2 rounded-xl border-2 border-mango bg-mango-suave p-5 md:p-6">
            <h2 id="t-cuidado" className="m-0 text-lg leading-6 font-semibold">
              Antes de salir a buscar misterio
            </h2>
            <p className="m-0 max-w-[70ch] text-[15px] leading-[22px]">
              No entres a lugares abandonados, cerrados o privados (casas viejas, edificios en ruinas, la antigua morgue, cárceles): pueden caerse,
              es peligroso estar ahí de noche y entrar sin permiso es ilegal. Aquí solo contamos su historia. Visita los lugares abiertos, en su
              horario, y de noche ve con un guía.
            </p>
          </aside>

          <section aria-labelledby="t-leyendas" className="grid gap-6">
            <h2 id="t-leyendas" className={h2}>
              Leyendas con lugar real
            </h2>
            <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
              {LEYENDAS.map((l) => {
                const s = sitio(l.buscarSitio);
                return (
                  <li key={l.id} id={l.id} className="grid content-start gap-3 rounded-xl border border-linea bg-papel-alto p-5 md:p-6">
                    <h3 className="m-0 font-rotulo text-xl leading-[26px] font-normal">{l.titulo}</h3>
                    <p className="m-0 font-historia text-[17px] leading-7">{l.historia}</p>
                    <p className="m-0 text-[15px] leading-[22px]">
                      <b>Dónde:</b> {l.lugar}
                      {s && (
                        <>
                          {" "}
                          <Link href={rutaSitio(s)} className={enlace}>
                            Ver {s.nombre}
                          </Link>
                        </>
                      )}
                    </p>
                    {l.nota && <p className="m-0 text-[15px] leading-[22px] text-rio-suave">{l.nota}</p>}
                    <CitaFuente f={l.fuente} />
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="t-oficiales" className="grid gap-6">
            <div className="grid gap-2">
              <h2 id="t-oficiales" className={h2}>
                Recorridos oficiales
              </h2>
              <p className="m-0 max-w-[64ch] text-rio-suave">
                Solo ponemos los que pudimos confirmar con una fuente. Por ahora no encontramos recorridos nocturnos oficiales en la ciudad: si sabes
                de uno, cuéntanos.
              </p>
            </div>
            <ul className="m-0 grid list-none gap-4 p-0">
              {RECORRIDOS_OFICIALES.map((r) => {
                const s = sitio(r.buscarSitio);
                return (
                  <li key={r.titulo} className="grid gap-3 rounded-xl border border-linea bg-papel-alto p-5 md:p-6">
                    <h3 className="m-0 text-lg leading-6 font-semibold">{r.titulo}</h3>
                    <p className="m-0 text-sm leading-5 text-rio-suave">{r.quien}</p>
                    <p className="m-0 max-w-[70ch] text-[15px] leading-[22px]">{r.detalle}</p>
                    <p className="m-0 flex flex-wrap gap-x-4 gap-y-1 text-[15px] leading-[22px]">
                      <span>
                        Fechas en{" "}
                        <a href={r.contacto.url} target="_blank" rel="noopener noreferrer" className={enlace}>
                          {r.contacto.texto} ↗
                        </a>
                      </span>
                      {s && (
                        <Link href={rutaSitio(s)} className={enlace}>
                          Horario y cómo llegar
                        </Link>
                      )}
                    </p>
                    <CitaFuente f={r.fuente} />
                  </li>
                );
              })}
            </ul>
          </section>

          {nocturnos.length > 0 && (
            <section aria-labelledby="t-nocturnos" className="grid gap-6">
              <div className="grid gap-2">
                <h2 id="t-nocturnos" className={h2}>
                  Con guías de noche
                </h2>
                <p className="m-0 max-w-[64ch] text-rio-suave">
                  Guías de la ciudad que hacen recorridos de noche. Los acreditados tienen su credencial revisada en el catastro del Ministerio de
                  Turismo. El precio y el cupo los confirma cada guía.
                </p>
              </div>
              <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
                {nocturnos.map((g) => (
                  <li key={g.id} className="grid content-start gap-3 rounded-xl border border-linea bg-papel-alto p-5 md:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="m-0 text-lg leading-6 font-semibold">
                        <Link href={g.ruta} className={enlace}>
                          {g.nombre}
                        </Link>
                      </h3>
                      {g.acreditado && <Insignia variante="acreditado">Guía acreditado</Insignia>}
                    </div>
                    {g.recorridos.length > 0 ? (
                      <ul className="m-0 grid list-none gap-2 p-0">
                        {g.recorridos.map((rc) => (
                          <li key={rc.id} className="text-[15px] leading-[22px]">
                            <Link href={`${g.ruta}/recorridos/${rc.id}`} className={enlace}>
                              {rc.nombre}
                            </Link>
                            <span className="text-rio-suave">
                              {" "}
                              · {textoDuracion(rc.duracion)} · {textoPrecio(rc.precio)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="m-0 text-[15px] leading-[22px] text-rio-suave">Pregúntale por sus recorridos desde su ficha.</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="t-guias-misterio" className="grid justify-items-start gap-3 rounded-[20px] bg-celeste-suave px-6 py-8 md:px-12">
            <h2 id="t-guias-misterio" className="m-0 font-rotulo text-2xl leading-[30px] font-normal">
              ¿Quieres oír estas historias en el lugar?
            </h2>
            <p className="m-0 max-w-[60ch] text-rio-suave">
              Los guías de la ciudad conocen estas leyendas y muchas más. Busca uno con «Recorridos de noche» o «Historia y cultura» y pídele un
              recorrido por WhatsApp.
            </p>
            <Link href={`/${ciudad.slug}/guias`} className={enlace}>
              Ver los guías turísticos
            </Link>
          </section>
        </div>
      </main>
      <Pie />
    </>
  );
}
