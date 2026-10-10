import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Cabecera } from "@/components/layout/Cabecera";
import { Migas } from "@/components/layout/Migas";
import { Pie } from "@/components/layout/Pie";
import { BotonCompartir } from "@/components/lugares/BotonCompartir";
import { ReportarLugar } from "@/components/lugares/ReportarLugar";
import { clasesBoton } from "@/components/ui/Boton";
import { IconoConversacion, IconoEnlaceExterno, IconoUbicacion } from "@/components/ui/iconos";
import { getEvento } from "@/lib/datos/eventos";
import { getCiudad } from "@/lib/datos/lugares";
import { enlaceComoLlegar, mostrarWhatsApp } from "@/lib/enlaces";
import { enlaceCalendarioGoogle, textoFechas, textoPrecio, TIPO_SINGULAR } from "@/lib/eventos";
import { nombreSitio } from "@/lib/redes";
import { paraCompartir, urlSitio } from "@/lib/sitio";
import { enlaceRutaGoogle } from "@/lib/ubicacion";

// Lo vencido nunca se ve (lo filtra la base); la página se vuelve a armar cada 5 minutos como mucho
export const revalidate = 300;

async function cargar(params: PageProps<"/[ciudad]/eventos/[evento]">["params"]) {
  const { ciudad: slugCiudad, evento: slug } = await params;
  const [ciudad, evento] = await Promise.all([getCiudad(slugCiudad), getEvento(slug)]);
  if (!ciudad || !evento) notFound();
  return { ciudad, evento };
}

export async function generateMetadata({ params }: PageProps<"/[ciudad]/eventos/[evento]">): Promise<Metadata> {
  const { ciudad, evento } = await cargar(params);
  const resumen = `${textoFechas(evento.inicio, evento.fin)}. ${evento.enLinea ? "En línea" : evento.lugar}. ${textoPrecio(evento.precio)}.`;
  return { title: `${evento.titulo} · Eventos en ${ciudad.nombre}`, description: resumen, ...paraCompartir(evento.titulo, resumen, `/${ciudad.slug}/eventos/${evento.slug}`) };
}

const externo = { target: "_blank", rel: "noopener noreferrer nofollow ugc" } as const;

/** Ficha de un evento (versión 5): cuándo, dónde, entrada, quién organiza; calendario, cómo llegar y compartir. */
export default async function PaginaEvento({ params }: PageProps<"/[ciudad]/eventos/[evento]">) {
  const { ciudad, evento: e } = await cargar(params);
  const ruta = `/${ciudad.slug}/eventos/${e.slug}`;
  const url = new URL(ruta, urlSitio()).toString();
  const dondeTexto = e.enLinea ? (e.lugar ? `En línea (${e.lugar})` : "En línea") : [e.lugar, e.direccion].filter(Boolean).join(", ");
  const comoLlegar = e.enLinea ? null : e.ubicacion ? enlaceRutaGoogle(e.ubicacion) : enlaceComoLlegar(e.lugar ?? e.titulo, e.direccion, ciudad.nombre);
  const whatsapp = e.whatsapp ? `https://wa.me/${e.whatsapp}?text=${encodeURIComponent(`Hola, vi el evento "${e.titulo}" en Mi Lindo Ecuador y quisiera más información.`)}` : null;
  const compartirWhatsApp = `https://wa.me/?text=${encodeURIComponent(`${e.titulo}: ${textoFechas(e.inicio, e.fin)}. ${url}`)}`;
  const calendario = { titulo: e.titulo, inicio: e.inicio, fin: e.fin, lugar: dondeTexto, url };

  return (
    <>
      <Cabecera />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-6 pb-16 text-rio md:px-8">
        <Migas pasos={[{ texto: ciudad.nombre, href: `/${ciudad.slug}` }, { texto: "Eventos", href: `/${ciudad.slug}/eventos` }, { texto: e.titulo }]} />
        <div className="mt-4 grid items-start gap-8 min-[900px]:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid min-w-0 gap-6">
            <header className="grid gap-2">
              <p className="m-0 text-[15px] font-semibold text-rio-suave">{TIPO_SINGULAR[e.tipo]}</p>
              <h1 className="m-0 font-rotulo text-[32px] leading-[38px] font-normal tracking-[-0.01em] text-balance md:text-[48px] md:leading-[56px]">{e.titulo}</h1>
              <p className="m-0 text-lg leading-7">{textoFechas(e.inicio, e.fin)}</p>
            </header>
            {e.afiche && (
              <div className="relative h-[min(70vh,640px)] overflow-hidden rounded-[20px] bg-mango-suave">
                <Image src={e.afiche.src} alt={e.afiche.alt} fill preload sizes="(min-width: 1280px) 820px, (min-width: 900px) 60vw, 100vw" className="object-contain" />
              </div>
            )}
            <section aria-labelledby="t-sobre" className="grid gap-3">
              <h2 id="t-sobre" className="m-0 text-xl leading-7 font-semibold">
                Sobre el evento
              </h2>
              <p className="m-0 max-w-[70ch] text-[17px] leading-7 whitespace-pre-line">{e.descripcion}</p>
            </section>
          </div>

          <aside aria-labelledby="t-info" className="grid gap-5 rounded-xl border border-linea bg-papel-alto p-6 min-[900px]:sticky min-[900px]:top-6">
            <h2 id="t-info" className="m-0 text-lg leading-6 font-semibold">
              Información
            </h2>
            <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-[15px] leading-[22px]">
              <dt className="text-rio-suave">Cuándo</dt>
              <dd className="m-0">{textoFechas(e.inicio, e.fin)}</dd>
              <dt className="text-rio-suave">Dónde</dt>
              <dd className="m-0">{dondeTexto}</dd>
              <dt className="text-rio-suave">Entrada</dt>
              <dd className="m-0 font-semibold">{textoPrecio(e.precio)}</dd>
              {e.edad && (
                <>
                  <dt className="text-rio-suave">Edad</dt>
                  <dd className="m-0">Desde los {e.edad} años</dd>
                </>
              )}
              <dt className="text-rio-suave">Organiza</dt>
              <dd className="m-0">{e.organizador}</dd>
              {e.whatsapp && (
                <>
                  <dt className="text-rio-suave">WhatsApp</dt>
                  <dd className="m-0">{mostrarWhatsApp(e.whatsapp)}</dd>
                </>
              )}
            </dl>
            <div className="grid gap-3">
              {whatsapp && (
                <a href={whatsapp} {...externo} className={clasesBoton("whatsapp")}>
                  <IconoConversacion />
                  Preguntar por WhatsApp
                </a>
              )}
              {e.entradas && (
                <a href={e.entradas} {...externo} className={clasesBoton(whatsapp ? "secundario" : "principal")}>
                  Comprar entradas
                  <IconoEnlaceExterno />
                </a>
              )}
              {comoLlegar && (
                <a href={comoLlegar} {...externo} className={clasesBoton("secundario")}>
                  <IconoUbicacion />
                  Cómo llegar
                </a>
              )}
              {e.web && (
                <a href={e.web} {...externo} className={clasesBoton("secundario")}>
                  {e.enLinea ? "Enlace para conectarse" : `Ver en ${nombreSitio(e.web)}`}
                  <IconoEnlaceExterno />
                </a>
              )}
            </div>
            <div className="grid gap-2 border-t border-linea pt-4">
              <p className="m-0 text-sm font-semibold">Agregar a mi calendario</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <a href={enlaceCalendarioGoogle(calendario)} {...externo} className="text-[15px]">
                  Google Calendar
                </a>
                <a href={`${ruta}/calendario`} download className="text-[15px]">
                  iPhone u otro (archivo .ics)
                </a>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-linea pt-4">
              <BotonCompartir titulo={e.titulo} texto={`${e.titulo}: ${textoFechas(e.inicio, e.fin)}`} />
              <a href={compartirWhatsApp} {...externo} className="text-[15px]">
                Enviar por WhatsApp
              </a>
            </div>
            <ReportarLugar lugar={e.id} ruta={ruta} nombre={e.titulo} objetivo="evento" />
          </aside>
        </div>
      </main>
      <Pie />
    </>
  );
}
