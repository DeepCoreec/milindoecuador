import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Afiche } from "@/components/arte/Afiche";
import { Panorama } from "@/components/arte/Panorama";
import { IconoBuscar, IconoUbicacion } from "@/components/ui/iconos";

/*
 * Versión 4, paso 17.2: dos propuestas de portada para que el usuario elija. Solo en desarrollo (no se publica).
 * ?p=a → "pulida" (misma identidad, más escala y color) · ?p=b → "atrevida" (franjas de color a todo lo ancho).
 */

const CATS = [
  ["restaurantes", "Restaurantes", "Encebollado, cangrejo y ceviche", "mango"],
  ["hoteles", "Hoteles", "Para quedarte cerca de todo", "celeste"],
  ["turismo", "Lugares turísticos", "Del Malecón al Cerro Santa Ana", "faro"],
  ["ejercicio", "Dónde hacer ejercicio", "Parques, ciclovías y canchas", "manglar"],
  ["paseos", "Dónde pasear", "Malecones y miradores", "buganvilla"],
] as const;

const LUGARES = [
  ["Encebollados Don Lucho", "Alborada", "Abierto hasta las 13:00", "4,7", "$", "mango"],
  ["Cangrejal El Manglar", "Urdesa", "Abierto hasta las 23:00", "4,5", "$$", "faro"],
  ["Cevichería La Bahía", "Centro", "Cierra a las 16:00", "4,6", "$", "celeste"],
  ["Bolones de la 9 de Octubre", "Centro", "Abierto hasta las 12:00", "4,4", "$", "manglar"],
] as const;

const TURISMO = [
  ["Malecón 2000", "Centro", "Abierto hasta las 23:00", "4,8", "Gratis", "celeste"],
  ["Cerro Santa Ana", "Las Peñas", "Abierto todo el día", "4,7", "Gratis", "faro"],
  ["Parque Seminario", "Centro", "Abierto hasta las 22:00", "4,6", "Gratis", "manglar"],
  ["Parque Histórico", "Samborondón", "Cierra a las 16:30", "4,7", "$", "mango"],
] as const;

function Buscar({ grande = false, oscuro = false }: { grande?: boolean; oscuro?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-full border ${oscuro ? "border-transparent bg-papel-alto" : "border-linea-fuerte bg-papel-alto"} ${grande ? "h-16 pr-2 pl-6" : "h-12 pr-1.5 pl-4"} shadow-flotante`}
    >
      <span className="text-rio-suave [&_svg]:size-5">
        <IconoBuscar />
      </span>
      <span className={`flex-1 text-rio-suave ${grande ? "text-lg" : ""}`}>Encebollado, hostal, malecón…</span>
      <span className={`rounded-full bg-celeste-tinta font-semibold text-on-celeste-tinta ${grande ? "px-6 py-3" : "px-4 py-2 text-sm"}`}>Buscar</span>
    </div>
  );
}

function Tarjeta({ l, grande = false }: { l: readonly [string, string, string, string, string, string]; grande?: boolean }) {
  const [nombre, sector, abierto, nota, precio, color] = l;
  return (
    <article className="grid gap-2.5">
      <div className={`relative aspect-[4/3] overflow-hidden rounded-md`} style={{ background: `var(--${color})` }}>
        <span className="absolute top-3 left-3 rounded-sm bg-papel-alto px-2 py-1 text-[13px] font-semibold text-rio">{precio}</span>
        <span className="absolute right-3 bottom-3 rounded-full bg-[#0e2e40]/80 px-2.5 py-1 text-[13px] font-semibold text-white">★ {nota}</span>
      </div>
      <h3 className={`m-0 font-semibold text-rio ${grande ? "text-xl" : "text-lg"} leading-6`}>{nombre}</h3>
      <p className="m-0 flex items-center gap-1 text-sm text-rio-suave [&_svg]:size-4">
        <IconoUbicacion />
        {sector}
      </p>
      <p className="m-0 text-sm font-semibold text-exito">{abierto}</p>
    </article>
  );
}

function Cabecera({ oscuro = false }: { oscuro?: boolean }) {
  return (
    <header className={`${oscuro ? "bg-[#0b1d28] text-[#e8f1f5]" : "border-b border-linea bg-papel-alto text-rio"}`}>
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 md:px-8">
        <span className="font-rotulo text-lg">Mi Lindo Ecuador</span>
        <nav className="flex items-center gap-6 text-sm font-semibold max-md:hidden">
          <span>Explorar</span>
          <span>Entrar</span>
          <span className={`rounded-md border px-4 py-2 ${oscuro ? "border-[#e8f1f5]/60" : "border-linea-fuerte"}`}>Registra tu negocio</span>
        </nav>
        <span className="text-sm font-semibold md:hidden">Menú</span>
      </div>
    </header>
  );
}

function Seccion({ titulo, extra, children, fondo, tinta }: { titulo: string; extra?: string; children: ReactNode; fondo?: string; tinta?: string }) {
  return (
    <section style={fondo ? { background: `var(--${fondo})`, color: tinta ? `var(--${tinta})` : undefined } : undefined} className={fondo ? "" : "text-rio"}>
      <div className="mx-auto grid max-w-[1280px] gap-6 px-4 py-12 md:px-8 md:py-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="m-0 font-rotulo text-[26px] leading-8 font-normal md:text-[36px] md:leading-[44px]">{titulo}</h2>
          {extra && <span className="text-sm font-semibold underline underline-offset-4">{extra}</span>}
        </div>
        {children}
      </div>
    </section>
  );
}

function PropuestaA() {
  return (
    <div className="bg-papel">
      <Cabecera />
      <section className="mx-auto grid max-w-[1280px] items-center gap-8 px-4 pt-8 pb-12 md:grid-cols-[5fr_7fr] md:gap-12 md:px-8 md:pt-16 md:pb-20">
        <div className="grid gap-5">
          <h1 className="m-0 font-rotulo text-[40px] leading-[46px] font-normal text-rio md:text-[60px] md:leading-[66px]">Guayaquil, de punta a punta</h1>
          <p className="m-0 max-w-[46ch] text-lg leading-7 text-rio-suave">Dónde comer, dónde dormir y qué visitar, recomendado por la gente de aquí. Escríbele directo al negocio por WhatsApp.</p>
          <Buscar grande />
          <p className="m-0 text-sm text-rio-suave">Lo más buscado: encebollado, cangrejo, Malecón 2000, hostal en el centro</p>
        </div>
        <Panorama className="aspect-[12/5] w-full rounded-lg md:aspect-[12/6]" />
      </section>
      <Seccion titulo="¿Qué buscas hoy?">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CATS.map(([slug, nombre, texto]) => (
            <div key={slug} className="grid gap-2">
              <Afiche slug={slug} className="aspect-square w-full" />
              <span className="text-lg leading-6 font-semibold text-rio">{nombre}</span>
              <span className="text-sm leading-5 text-rio-suave">{texto}</span>
            </div>
          ))}
        </div>
      </Seccion>
      <Seccion titulo="Dónde comer hoy" extra="Ver los 120 restaurantes" fondo="mango-suave">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {LUGARES.map((l) => (
            <Tarjeta key={l[0]} l={l} />
          ))}
        </div>
      </Seccion>
      <section className="bg-celeste-tinta text-on-celeste-tinta">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-6 px-4 py-12 md:px-8">
          <div className="grid gap-2">
            <h2 className="m-0 font-rotulo text-[26px] leading-8 font-normal md:text-[32px]">¿Tienes un negocio en Guayaquil?</h2>
            <p className="m-0 max-w-[52ch] text-base leading-6 opacity-90">Publica tu ficha gratis con fotos, horario y tu WhatsApp. Destácala desde 1 $ por semana.</p>
          </div>
          <span className="rounded-md bg-papel-alto px-6 py-3 font-semibold text-celeste-tinta">Registrar mi negocio</span>
        </div>
      </section>
    </div>
  );
}

function PropuestaB() {
  return (
    <div className="bg-papel">
      <Cabecera oscuro />
      <section className="bg-[#0b1d28] text-[#e8f1f5]">
        <div className="mx-auto grid max-w-[1280px] gap-6 px-4 pt-10 md:px-8 md:pt-16">
          <h1 className="m-0 max-w-[18ch] font-rotulo text-[42px] leading-[48px] font-normal md:text-[80px] md:leading-[86px]">Guayaquil, de punta a punta</h1>
          <div className="grid items-center gap-5 md:grid-cols-[1fr_520px]">
            <p className="m-0 max-w-[48ch] text-lg leading-7 text-[#a3b9c5]">Dónde comer, dónde dormir y qué visitar, recomendado por la gente de aquí. Escríbele directo al negocio por WhatsApp.</p>
            <Buscar grande oscuro />
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-[1600px]">
          <Panorama className="aspect-[12/5] w-full" />
        </div>
      </section>
      <section className="bg-papel">
        <div className="mx-auto grid max-w-[1280px] gap-4 px-4 py-12 md:px-8 md:py-16">
          <h2 className="m-0 font-rotulo text-[26px] leading-8 font-normal text-rio md:text-[36px] md:leading-[44px]">¿Qué buscas hoy?</h2>
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:px-0">
            {CATS.map(([slug, nombre, texto, color]) => (
              <div key={slug} className="grid w-[64%] shrink-0 snap-start overflow-hidden rounded-lg md:w-auto" style={{ background: `var(--${color})` }}>
                <Afiche slug={slug} className="aspect-square w-full rounded-none!" />
                <div className="grid gap-1 bg-papel-alto p-4">
                  <span className="text-lg leading-6 font-semibold text-rio">{nombre}</span>
                  <span className="text-sm leading-5 text-rio-suave">{texto}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Seccion titulo="Dónde comer hoy" extra="Ver los 120 restaurantes" fondo="mango" tinta="on-color">
        <div className="grid grid-cols-1 gap-6 rounded-lg bg-papel-alto p-4 sm:grid-cols-2 md:p-6 lg:grid-cols-4">
          {LUGARES.map((l) => (
            <Tarjeta key={l[0]} l={l} grande />
          ))}
        </div>
      </Seccion>
      <Seccion titulo="Imperdibles de Guayaquil" extra="Ver lugares turísticos" fondo="faro" tinta="on-color">
        <div className="grid grid-cols-1 gap-6 rounded-lg bg-papel-alto p-4 sm:grid-cols-2 md:p-6 lg:grid-cols-4">
          {TURISMO.map((l) => (
            <Tarjeta key={l[0]} l={l} />
          ))}
        </div>
      </Seccion>
      <section className="bg-[#0b1d28] text-[#e8f1f5]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-6 px-4 py-14 md:px-8">
          <h2 className="m-0 max-w-[20ch] font-rotulo text-[28px] leading-9 font-normal md:text-[40px] md:leading-[48px]">¿Tienes un negocio? Ponlo en el mapa.</h2>
          <span className="rounded-md bg-mango px-6 py-3 font-semibold text-on-color">Registrar mi negocio gratis</span>
        </div>
      </section>
    </div>
  );
}

export default async function Propuestas({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { p } = await searchParams;
  return p === "b" ? <PropuestaB /> : <PropuestaA />;
}
