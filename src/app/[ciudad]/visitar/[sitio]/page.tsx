import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { Afiche } from "@/components/arte/Afiche";
import { Cabecera } from "@/components/layout/Cabecera";
import { Migas } from "@/components/layout/Migas";
import { Pie } from "@/components/layout/Pie";
import { BotonCompartir } from "@/components/lugares/BotonCompartir";
import { clasesBoton } from "@/components/ui/Boton";
import { IconoUbicacion } from "@/components/ui/iconos";
import { buscarCerca, distanciaM, textoDistancia } from "@/lib/cerca";
import { getSitios, getSitioVisitar, idDeRutaSitio, rutaSitio, type Sitio } from "@/lib/datos/sitios";
import { horarioLegible, NOMBRE_TIPO } from "@/lib/osm";
import { paraCompartir, urlSitio } from "@/lib/sitio";
import { enlaceRutaGoogle, enlaceRutaWaze } from "@/lib/ubicacion";

/*
 * Página de un lugar para visitar de la Guía útil (versión 11, fase 39; plan en docs/PLAN-V11.md): foto grande, qué es,
 * cómo llegar y qué hay cerca. Sin reseñas (decisión del usuario: son lugares que pone la guía, no negocios).
 * Solo lee datos públicos en caché; la dirección se valida y lo que no existe da 404.
 */

type Props = PageProps<"/[ciudad]/visitar/[sitio]">;

const CERCA_M = 3000;

const cargar = cache(async (ciudad: string, parte: string) => {
  // Por ahora la Guía útil es solo de Guayaquil
  const id = ciudad === "guayaquil" ? idDeRutaSitio(parte) : null;
  const sitio = id ? await getSitioVisitar(id) : null;
  if (!sitio) notFound();
  return sitio;
});

/** Texto corto para Google y para compartir. */
function resumen(s: Sitio): string {
  const t = s.nota ?? s.descripcion?.texto ?? `${NOMBRE_TIPO[s.tipo] ?? "Lugar"} en Guayaquil${s.direccion ? `, ${s.direccion}` : ""}.`;
  return t.length > 155 ? `${t.slice(0, 154).trimEnd()}…` : t;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const s = await cargar(p.ciudad, p.sitio);
  const ruta = rutaSitio(s);
  const base = paraCompartir(`${s.nombre} · Guayaquil`, resumen(s), ruta);
  return {
    title: `${s.nombre} · Qué visitar en Guayaquil · Mi Lindo Ecuador`,
    description: resumen(s),
    ...base,
    openGraph: { ...base.openGraph, ...(s.foto ? { images: [{ url: s.foto.src, alt: `Foto de ${s.nombre}` }] } : {}) },
    // Sin foto ni descripción, la página es muy pobre para ofrecerla en Google
    robots: s.foto || s.descripcion || s.nota ? undefined : { index: false, follow: true },
  };
}

/** Datos estructurados para Google (TouristAttraction). Se escapa "<" para que nada pueda cerrar la etiqueta. */
function DatosEstructurados({ s }: { s: Sitio }) {
  const datos = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: s.nombre,
    description: resumen(s),
    url: new URL(rutaSitio(s), urlSitio()).toString(),
    ...(s.foto ? { image: s.foto.src } : {}),
    geo: { "@type": "GeoCoordinates", latitude: s.ubicacion.lat, longitude: s.ubicacion.lng },
    address: { "@type": "PostalAddress", addressLocality: "Guayaquil", addressCountry: "EC", ...(s.direccion ? { streetAddress: s.direccion } : {}) },
  };
  // Datos de la guía (no de usuarios), escritos como JSON escapado: es la forma que pide Google
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, "\\u003c") }} />;
}

function TarjetaCerca({ s, desde }: { s: Sitio; desde: Sitio }) {
  return (
    <li className="relative grid content-start gap-1 overflow-hidden rounded-sm border border-linea bg-papel-alto p-2 pb-3 md:p-2.5 md:pb-4">
      <div className="relative mb-2 aspect-[4/3] overflow-hidden rounded-[2px] bg-celeste-suave">
        {s.foto ? (
          <Image src={s.foto.src} alt={`Foto de ${s.nombre}`} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        ) : (
          <Afiche slug="turismo" className="absolute inset-0 m-auto size-24" />
        )}
      </div>
      <Link href={rutaSitio(s)} className="px-1 font-rotulo text-sm leading-5 font-normal text-rio no-underline after:absolute after:inset-0 md:px-1.5 md:text-base md:leading-6">
        {s.nombre}
      </Link>
      <span className="px-1 text-[13px] leading-[18px] text-rio-suave md:px-1.5 md:text-sm md:leading-5">
        {NOMBRE_TIPO[s.tipo] ?? "Lugar"} · {textoDistancia(distanciaM(desde.ubicacion, s.ubicacion))}
      </span>
    </li>
  );
}

export default async function PaginaSitio({ params }: Props) {
  const p = await params;
  const s = await cargar(p.ciudad, p.sitio);
  const ruta = rutaSitio(s);
  // Si el nombre de la dirección no coincide (por ejemplo, el lugar cambió de nombre), se lleva a la correcta
  if (`/${p.ciudad}/visitar/${p.sitio}` !== ruta) permanentRedirect(ruta);

  const [todos, cerca] = await Promise.all([getSitios(), buscarCerca(s.ubicacion, 4).catch(() => null)]);
  // Más para visitar cerca: primero los que tienen foto, luego el más cercano
  const masCerca = todos
    .filter((x) => x.grupo === "visitar" && x.id !== s.id && distanciaM(s.ubicacion, x.ubicacion) <= CERCA_M)
    .sort((a, b) => Number(!!b.foto) - Number(!!a.foto) || distanciaM(s.ubicacion, a.ubicacion) - distanciaM(s.ubicacion, b.ubicacion))
    .slice(0, 4);
  const negocios = cerca && cerca.radio <= CERCA_M ? cerca.lugares : [];
  const eventos = cerca && cerca.radio <= CERCA_M ? cerca.eventos : [];
  const texto = s.nota ?? s.descripcion?.texto ?? null;
  const telefono = s.telefono?.split(/[;,/]/)[0]!.replace(/[^\d+]/g, "");
  // Solo enlaces web normales (defensa extra: la importación y el panel ya lo exigen)
  const web = s.web && /^https?:\/\//i.test(s.web) ? s.web : null;

  return (
    <>
      <Cabecera />
      <DatosEstructurados s={s} />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-6 pb-16 text-rio md:px-8">
        <Migas
          pasos={[
            { texto: "Guayaquil", href: "/guayaquil" },
            { texto: "Lugares turísticos", href: "/guayaquil/turismo" },
            { texto: s.nombre },
          ]}
        />

        <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-celeste-suave sm:aspect-[16/9] lg:aspect-[21/9]">
          {s.foto ? (
            <Image src={s.foto.src} alt={`Foto de ${s.nombre}`} fill priority sizes="(min-width: 1280px) 1216px, 100vw" className="object-cover" />
          ) : (
            <Afiche slug="turismo" className="absolute inset-0 m-auto size-40 md:size-56" />
          )}
        </div>
        {s.foto && (
          <p className="mt-2 mb-0 text-[13px] leading-[18px] text-rio-suave">
            Foto: {s.foto.credito},{" "}
            <a href={s.foto.fuente} target="_blank" rel="noopener noreferrer" className="text-rio-suave">
              {s.foto.licencia}
            </a>
          </p>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 pt-8 min-[900px]:grid-cols-[minmax(0,1fr)_360px] min-[900px]:items-start min-[900px]:gap-x-16">
          <div className="grid min-w-0 gap-8">
            <div className="grid gap-3">
              <p className="m-0 text-base leading-6 font-semibold text-rio-suave">{NOMBRE_TIPO[s.tipo] ?? "Lugar"} en Guayaquil</p>
              <h1 className="m-0 font-rotulo text-[32px] leading-[38px] font-normal tracking-[-0.01em] text-balance md:text-[48px] md:leading-[54px]">{s.nombre}</h1>
              {s.direccion && <p className="m-0 text-base leading-6 text-rio-suave">{s.direccion}</p>}
              <div className="mt-2 flex flex-wrap gap-3">
                <a href={enlaceRutaGoogle(s.ubicacion)} target="_blank" rel="noopener noreferrer" className={clasesBoton("principal")}>
                  <IconoUbicacion />
                  Cómo llegar
                </a>
                <BotonCompartir titulo={`${s.nombre} · Mi Lindo Ecuador`} texto={`Mira ${s.nombre} en Mi Lindo Ecuador`} />
              </div>
            </div>

            {texto && (
              <section aria-labelledby="t-sobre" className="grid gap-3">
                <h2 id="t-sobre" className="m-0 font-rotulo text-xl leading-[26px] font-normal md:text-2xl md:leading-[30px]">
                  Sobre el lugar
                </h2>
                <p className="m-0 max-w-[62ch] font-historia text-lg leading-[30px]">{texto}</p>
                {!s.nota && s.descripcion && (
                  <p className="m-0 text-[13px] leading-[18px] text-rio-suave">
                    <a href={s.descripcion.fuente} target="_blank" rel="noopener noreferrer" className="text-rio-suave">
                      Extracto de Wikipedia (CC BY-SA 4.0)
                    </a>
                  </p>
                )}
              </section>
            )}
          </div>

          <aside aria-labelledby="t-info" className="grid gap-4 rounded-xl border border-linea bg-papel-alto p-6">
            <h2 id="t-info" className="m-0 text-lg leading-6 font-semibold">
              Antes de ir
            </h2>
            <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-[15px] leading-[22px]">
              <dt className="text-rio-suave">Horario</dt>
              <dd className="m-0">{s.horario ? horarioLegible(s.horario) : "Confírmalo antes de ir"}</dd>
              {s.direccion && (
                <>
                  <dt className="text-rio-suave">Dirección</dt>
                  <dd className="m-0">{s.direccion}</dd>
                </>
              )}
              <dt className="text-rio-suave">Ruta</dt>
              <dd className="m-0">
                <a href={enlaceRutaGoogle(s.ubicacion)} target="_blank" rel="noopener noreferrer">
                  Google Maps
                </a>
                {" · "}
                <a href={enlaceRutaWaze(s.ubicacion)} target="_blank" rel="noopener noreferrer">
                  Waze
                </a>
              </dd>
              {telefono && telefono.length >= 7 && (
                <>
                  <dt className="text-rio-suave">Teléfono</dt>
                  <dd className="m-0">
                    <a href={`tel:${telefono}`}>{s.telefono}</a>
                  </dd>
                </>
              )}
              {web && (
                <>
                  <dt className="text-rio-suave">Web</dt>
                  <dd className="m-0">
                    <a href={web} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Página web de ${s.nombre}`}>
                      Página oficial
                    </a>
                  </dd>
                </>
              )}
            </dl>
            <p className="m-0 text-sm leading-5 text-rio-suave">
              Es un lugar de referencia de nuestra <Link href="/guayaquil/guia-util">Guía útil</Link>, no un negocio registrado.
            </p>
          </aside>
        </div>

        {masCerca.length > 0 && (
          <section aria-labelledby="t-mas" className="mt-14 grid gap-4">
            <h2 id="t-mas" className="m-0 font-rotulo text-[26px] leading-8 font-normal md:text-[32px] md:leading-10">
              Más para visitar cerca
            </h2>
            <ul className="m-0 grid list-none grid-cols-2 items-start gap-3 p-0 md:gap-4 lg:grid-cols-4">
              {masCerca.map((x) => (
                <TarjetaCerca key={x.id} s={x} desde={s} />
              ))}
            </ul>
          </section>
        )}

        {negocios.length > 0 && (
          <section aria-labelledby="t-neg" className="mt-14 grid gap-4">
            <h2 id="t-neg" className="m-0 font-rotulo text-[26px] leading-8 font-normal md:text-[32px] md:leading-10">
              Para comer y pasar el rato cerca
            </h2>
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
              {negocios.map((l) => (
                <li key={l.id} className="relative flex gap-3 rounded-xl border border-linea bg-papel-alto p-3">
                  {l.foto && <Image src={l.foto.src} alt={l.foto.alt} width={64} height={64} sizes="64px" className="size-16 flex-none rounded-lg object-cover" />}
                  <div className="grid min-w-0 content-start gap-0.5">
                    <Link href={l.ruta} className="font-semibold text-rio no-underline after:absolute after:inset-0">
                      {l.nombre}
                    </Link>
                    <span className="text-sm leading-5 text-rio-suave">
                      {l.categoria} · {textoDistancia(l.distancia)}
                    </span>
                    {l.estado && <span className={`text-sm leading-5 ${l.abierto ? "text-exito" : "text-rio-suave"}`}>{l.estado}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {eventos.length > 0 && (
          <section aria-labelledby="t-ev" className="mt-14 grid gap-4">
            <h2 id="t-ev" className="m-0 font-rotulo text-[26px] leading-8 font-normal md:text-[32px] md:leading-10">
              Esta semana cerca
            </h2>
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
              {eventos.map((e) => (
                <li key={e.ruta} className="relative grid gap-0.5 rounded-xl border border-linea bg-papel-alto p-3">
                  <Link href={e.ruta} className="font-semibold text-rio no-underline after:absolute after:inset-0">
                    {e.titulo}
                  </Link>
                  <span className="text-sm leading-5 text-rio-suave">{e.cuando}</span>
                  <span className="text-sm leading-5 text-rio-suave">
                    {textoDistancia(e.distancia)} · {e.precio}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <Pie />
    </>
  );
}
