import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Cabecera } from "@/components/layout/Cabecera";
import { Migas } from "@/components/layout/Migas";
import { Pie } from "@/components/layout/Pie";
import { Estrellas } from "@/components/lugares/Estrellas";
import { BotonCompartir } from "@/components/lugares/BotonCompartir";
import { Galeria } from "@/components/lugares/Galeria";
import { Resenas } from "@/components/lugares/Resenas";
import { clasesBoton } from "@/components/ui/Boton";
import { Insignia } from "@/components/ui/Insignia";
import { IconoConversacion, IconoUbicacion } from "@/components/ui/iconos";
import { getCategoria, getCiudad, getLugar, tonoDeCategoria } from "@/lib/datos/lugares";
import { enlaceComoLlegar, enlaceWhatsApp, mostrarWhatsApp } from "@/lib/enlaces";
import { paraCompartir } from "@/lib/sitio";

const PRECIOS = { 1: ["$", "económico"], 2: ["$$", "medio"], 3: ["$$$", "alto"] } as const;

type Props = PageProps<"/[ciudad]/[categoria]/[lugar]">;

/** Carga ciudad, categoría y lugar una sola vez por visita (la usan los metadatos y la página). */
const cargar = cache(async (ciudadSlug: string, categoriaSlug: string, lugarSlug: string) => {
  const [ciudad, categoria, lugar] = await Promise.all([
    getCiudad(ciudadSlug),
    getCategoria(categoriaSlug),
    getLugar(ciudadSlug, categoriaSlug, lugarSlug),
  ]);
  if (!ciudad || !categoria || !lugar) notFound();
  return { ciudad, categoria, lugar };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const { ciudad, categoria, lugar } = await cargar(p.ciudad, p.categoria, p.lugar);
  const resumen = lugar.descripcion.replace(/^\[Ejemplo\]\s*/, "");
  const descripcion = resumen.length > 155 ? `${resumen.slice(0, 154).trimEnd()}…` : resumen;
  return {
    title: `${lugar.nombre} · ${categoria.nombre} en ${ciudad.nombre}`,
    description: descripcion,
    ...paraCompartir(`${lugar.nombre} · ${ciudad.nombre}`, descripcion, `/${ciudad.slug}/${categoria.slug}/${lugar.slug}`),
    // Los negocios de ejemplo no deben aparecer en Google
    robots: lugar.ejemplo ? { index: false, follow: false } : undefined,
  };
}

export default async function FichaLugar({ params }: Props) {
  const p = await params;
  const { ciudad, categoria, lugar } = await cargar(p.ciudad, p.categoria, p.lugar);
  const whatsapp = enlaceWhatsApp(lugar.whatsapp, lugar.nombre);
  const comoLlegar = enlaceComoLlegar(lugar.nombre, lugar.direccion, ciudad.nombre);
  const precio = lugar.precio ? PRECIOS[lugar.precio] : null;
  const esNegocio = categoria.slug !== "turismo";

  return (
    <>
      <Cabecera />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-6 text-rio md:px-8">
        <Migas
          pasos={[
            { texto: ciudad.nombre, href: `/${ciudad.slug}` },
            { texto: categoria.nombre, href: `/${ciudad.slug}/${categoria.slug}` },
            { texto: lugar.nombre },
          ]}
        />
        <Galeria fotos={lugar.fotos} tono={tonoDeCategoria(categoria.slug)} />

        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 pt-8 pb-16 [grid-template-areas:'cab'_'info'_'resto'] min-[900px]:grid-cols-[minmax(0,1fr)_360px] min-[900px]:items-start min-[900px]:gap-x-16 min-[900px]:gap-y-10 min-[900px]:[grid-template-areas:'cab_info'_'resto_info']">
          <div className="grid min-w-0 gap-3 [grid-area:cab]">
            {(lugar.plan !== "gratis" || lugar.ejemplo) && (
              <div className="flex flex-wrap gap-2">
                {lugar.plan === "destacado" && <Insignia variante="destacado">Destacado</Insignia>}
                {lugar.plan === "verificado" && <Insignia variante="verificado">Verificado</Insignia>}
                {lugar.ejemplo && <Insignia variante="ejemplo">Ejemplo</Insignia>}
              </div>
            )}
            <h1 className="m-0 text-[28px] leading-[34px] font-bold tracking-[-0.01em] text-balance">{lugar.nombre}</h1>
            <p className="m-0 text-base leading-6 text-rio-suave">
              {lugar.datos}
              {precio && `, precio ${precio[1]} (${precio[0]})`}
            </p>
            <Estrellas promedio={lugar.promedio} cantidad={lugar.cantidad} />
            <div className="mt-2 flex flex-wrap gap-3">
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={clasesBoton("whatsapp")}>
                  <IconoConversacion />
                  Escribir por WhatsApp
                </a>
              )}
              <a href={comoLlegar} target="_blank" rel="noopener noreferrer" className={clasesBoton("secundario")}>
                <IconoUbicacion />
                Cómo llegar
              </a>
              <BotonCompartir titulo={`${lugar.nombre} · Mi Lindo Ecuador`} texto={`Mira ${lugar.nombre} en Mi Lindo Ecuador`} />
            </div>
          </div>

          <aside aria-labelledby="t-info" className="grid gap-4 rounded-xl border border-linea bg-papel-alto p-6 [grid-area:info]">
            <h2 id="t-info" className="m-0 text-lg leading-6 font-semibold">
              Información
            </h2>
            <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-[15px] leading-[22px]">
              {lugar.horario && (
                <>
                  <dt className="text-rio-suave">Horario</dt>
                  <dd className="m-0">{lugar.horario}</dd>
                </>
              )}
              {lugar.direccion && (
                <>
                  <dt className="text-rio-suave">Dirección</dt>
                  <dd className="m-0">{lugar.direccion}</dd>
                </>
              )}
              <dt className="text-rio-suave">Sector</dt>
              <dd className="m-0">{lugar.sector}</dd>
              {precio ? (
                <>
                  <dt className="text-rio-suave">Precio</dt>
                  <dd className="m-0">
                    {precio[0]} (precio {precio[1]})
                  </dd>
                </>
              ) : (
                lugar.extra && (
                  <>
                    <dt className="text-rio-suave">Dato</dt>
                    <dd className="m-0">{lugar.extra}</dd>
                  </>
                )
              )}
              {lugar.whatsapp && whatsapp && (
                <>
                  <dt className="text-rio-suave">WhatsApp</dt>
                  <dd className="m-0">{mostrarWhatsApp(lugar.whatsapp)}</dd>
                </>
              )}
            </dl>
            {whatsapp && (
              // En celular ya está arriba; aquí solo en escritorio (la envoltura evita el choque con inline-flex)
              <span className="hidden min-[900px]:contents">
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={clasesBoton("whatsapp")}>
                  <IconoConversacion />
                  Escribir por WhatsApp
                </a>
              </span>
            )}
            {esNegocio && (
              <p className="m-0 text-sm leading-5 text-rio-suave">
                ¿Este es tu negocio? <Link href="/negocios/planes">Pide destacarlo</Link>
              </p>
            )}
          </aside>

          <div className="grid min-w-0 gap-8 [grid-area:resto]">
            <section aria-labelledby="t-hist" className="grid gap-3">
              <h2 id="t-hist" className="m-0 font-rotulo text-xl leading-[26px] font-normal md:text-2xl md:leading-[30px]">
                La historia
              </h2>
              <p className="m-0 max-w-[62ch] font-historia text-lg leading-[30px]">{lugar.descripcion}</p>
            </section>
            <Resenas resenas={lugar.resenas} promedio={lugar.promedio} cantidad={lugar.cantidad} ejemplo={lugar.ejemplo} />
          </div>
        </div>
      </main>
      <Pie />
    </>
  );
}
