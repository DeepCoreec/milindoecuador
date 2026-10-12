import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Afiche } from "@/components/arte/Afiche";
import { SitiosPorTipo } from "@/components/guia/ListaSitios";
import { Cabecera } from "@/components/layout/Cabecera";
import { Migas } from "@/components/layout/Migas";
import { Pie } from "@/components/layout/Pie";
import { Boton } from "@/components/ui/Boton";
import { getCiudad } from "@/lib/datos/lugares";
import { getSitios, type Sitio } from "@/lib/datos/sitios";
import { TIPOS_SITIO, type Grupo } from "@/lib/osm";
import { paraCompartir, WHATSAPP_GUIA } from "@/lib/sitio";

export const revalidate = 300;

const descripcion = "Parques, museos y miradores; dónde arreglar lo que se te dañó; hospitales, farmacias, Metrovía, Aerovía y números de emergencia en Guayaquil.";

export async function generateMetadata({ params }: PageProps<"/[ciudad]/guia-util">): Promise<Metadata> {
  const c = await getCiudad((await params).ciudad);
  if (!c) return {};
  return { title: `Guía útil de ${c.nombre} · Mi Lindo Ecuador`, description: descripcion, ...paraCompartir(`Guía útil de ${c.nombre}`, descripcion, `/${c.slug}/guia-util`) };
}

const tiposDe = (g: Grupo) => TIPOS_SITIO.filter((t) => t.grupo === g).map((t) => t.tipo);
const ESPERA = "Estamos revisando los lugares de esta parte. Vuelve pronto.";

/** Guía útil (versión 5, fase 23): información aparte de los negocios, para tener siempre a dónde recomendar. */
export default async function PaginaGuiaUtil({ params }: PageProps<"/[ciudad]/guia-util">) {
  const ciudad = await getCiudad((await params).ciudad);
  if (!ciudad) notFound();
  const sitios = await getSitios().catch(() => [] as Sitio[]);
  const de = (g: Grupo) => sitios.filter((s) => s.grupo === g);
  const h2 = "m-0 font-rotulo text-[26px] leading-8 font-normal md:text-4xl md:leading-[44px]";
  const ancla = "inline-flex min-h-11 items-center rounded-full border border-linea-fuerte bg-papel-alto px-4 text-[15px] font-semibold text-rio no-underline hover:border-rio";

  return (
    <>
      <Cabecera />
      <main className="flex-1 text-rio">
        <section data-theme="dark" className="bg-papel text-rio">
          <div className="mx-auto grid w-full max-w-[1280px] gap-4 px-4 pt-6 pb-10 md:px-8 md:pb-14">
            <Migas pasos={[{ texto: ciudad.nombre, href: `/${ciudad.slug}` }, { texto: "Guía útil" }]} />
            <h1 className="m-0 font-rotulo text-[34px] leading-10 font-normal tracking-[-0.01em] text-balance md:text-[56px] md:leading-[62px]">Guía útil de {ciudad.nombre}</h1>
            <p className="m-0 max-w-[62ch] text-lg leading-7 text-rio-suave">
              Lugares para visitar, dónde arreglar lo que se te dañó y lo que conviene tener a mano. Son lugares de referencia, aparte de los
              negocios de la guía.
            </p>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-[1280px] gap-14 px-4 pt-6 pb-16 md:px-8">
          <nav aria-label="Partes de la guía útil" className="flex flex-wrap gap-2">
            <a href="#visitar" className={ancla}>
              Para visitar
            </a>
            <a href="#danado" className={ancla}>
              ¿Se te dañó algo?
            </a>
            <a href="#info" className={ancla}>
              Información útil
            </a>
          </nav>

          <section id="visitar" aria-labelledby="t-visitar" className="grid scroll-mt-6 gap-6">
            <h2 id="t-visitar" className={h2}>
              Para visitar
            </h2>
            <SitiosPorTipo sitios={de("visitar")} tipos={tiposDe("visitar")} vacio={ESPERA} />
          </section>

          <section id="danado" aria-labelledby="t-danado" className="grid scroll-mt-6 gap-6">
            <div className="grid items-center gap-5 rounded-[20px] bg-celeste-suave p-6 md:grid-cols-[auto_minmax(0,1fr)] md:p-8">
              <Afiche slug="reparaciones" className="size-24 max-md:hidden" />
              <div className="grid gap-3">
                <h2 id="t-danado" className={h2}>
                  ¿Se te dañó algo?
                </h2>
                <p className="m-0 max-w-[60ch]">Talleres, técnicos de celulares y electrónica, y cerrajerías. Mira primero los negocios de la guía: les escribes directo por WhatsApp.</p>
                <Boton href={`/${ciudad.slug}/reparaciones`} variante="principal" className="justify-self-start">
                  Ver negocios de reparaciones
                </Boton>
              </div>
            </div>
            <SitiosPorTipo sitios={de("servicios")} tipos={tiposDe("servicios")} vacio={ESPERA} />
          </section>

          <section id="info" aria-labelledby="t-info" className="grid scroll-mt-6 gap-8">
            <h2 id="t-info" className={h2}>
              Información útil
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid content-start gap-2 rounded-xl border-2 border-error bg-papel-alto p-5">
                <h3 className="m-0 text-lg font-semibold">Emergencias</h3>
                <p className="m-0">
                  Policía, bomberos y ambulancia: llama al <a href="tel:911" className="font-rotulo text-2xl no-underline">911</a> (ECU 911). La llamada es
                  gratis.
                </p>
              </div>
              <div className="grid content-start gap-2 rounded-xl border border-linea bg-papel-alto p-5">
                <h3 className="m-0 text-lg font-semibold">Moverse por la ciudad</h3>
                <p className="m-0 text-[15px] leading-[22px]">
                  La <b>Metrovía</b> es el sistema de buses de carriles exclusivos y se paga con tarjeta recargable. La <b>Aerovía</b> es el
                  teleférico que cruza el río Guayas entre Guayaquil y Durán. Para viajar a otras ciudades sale todo desde el Terminal Terrestre.
                </p>
                <p className="m-0 text-[15px] leading-[22px] text-rio-suave">
                  Precios y horarios cambian: confírmalos en la{" "}
                  <a href="https://www.atm.gob.ec" target="_blank" rel="noopener noreferrer">
                    Agencia de Tránsito (ATM)
                  </a>
                  .
                </p>
              </div>
              <div className="grid content-start gap-2 rounded-xl border border-linea bg-papel-alto p-5">
                <h3 className="m-0 text-lg font-semibold">Si vienes de visita</h3>
                <ul className="m-0 grid gap-1 pl-5 text-[15px] leading-[22px]">
                  <li>En Ecuador se usa el dólar estadounidense.</li>
                  <li>Hace calor todo el año: agua, gorra y protector solar.</li>
                  <li>De noche, muévete en taxis de cooperativa o por aplicación.</li>
                  <li>El aeropuerto José Joaquín de Olmedo está dentro de la ciudad.</li>
                </ul>
              </div>
            </div>
            <section aria-labelledby="t-salud" className="grid gap-5">
              <h3 id="t-salud" className="m-0 text-2xl leading-8 font-semibold">
                Salud
              </h3>
              <SitiosPorTipo sitios={de("salud")} tipos={tiposDe("salud")} nivel={4} vacio={ESPERA} />
            </section>
            <section aria-labelledby="t-transporte" className="grid gap-5">
              <h3 id="t-transporte" className="m-0 text-2xl leading-8 font-semibold">
                Transporte
              </h3>
              <SitiosPorTipo sitios={de("transporte")} tipos={tiposDe("transporte")} nivel={4} vacio={ESPERA} />
            </section>
          </section>

          <p className="m-0 text-sm text-rio-suave">
            Lugares de referencia: datos ©{" "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
              colaboradores de OpenStreetMap
            </a>{" "}
            (licencia ODbL), revisados por Mi Lindo Ecuador. ¿Ves algo mal?{" "}
            <a href={`https://wa.me/${WHATSAPP_GUIA}?text=${encodeURIComponent("Hola, vi un dato mal en la Guía útil de Mi Lindo Ecuador:")}`} target="_blank" rel="noopener noreferrer">
              Avísanos por WhatsApp
            </a>
            .{" "}
            <Link href="/legal/terminos">Términos</Link>.
          </p>
        </div>
      </main>
      <Pie />
    </>
  );
}
