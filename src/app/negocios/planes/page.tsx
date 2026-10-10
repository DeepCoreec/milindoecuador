import type { Metadata } from "next";
import { Cabecera } from "@/components/layout/Cabecera";
import { Pie } from "@/components/layout/Pie";
import { Boton, clasesBoton } from "@/components/ui/Boton";
import { Insignia } from "@/components/ui/Insignia";
import { IconoConversacion, IconoVisto } from "@/components/ui/iconos";
import { paraCompartir, WHATSAPP_GUIA } from "@/lib/sitio";

const descripcion = "Aparecer en Mi Lindo Ecuador es gratis. Destaca tu negocio desde 1 $ por semana.";
export const metadata: Metadata = {
  title: "Planes para negocios · Mi Lindo Ecuador",
  description: descripcion,
  ...paraCompartir("Planes para negocios", descripcion, "/negocios/planes"),
};

/** Los planes de docs/PLAN.md. En la versión 1 se paga por transferencia o DeUna y el admin lo activa a mano. */
const PLANES = [
  {
    nombre: "Ficha gratis",
    precio: "0 $",
    detalle: "Para siempre",
    insignia: null,
    incluye: ["Fotos, horario y ubicación", "Botón de WhatsApp directo a tu negocio", "Reseñas de tus clientes"],
  },
  {
    nombre: "Destacado",
    precio: "1 $",
    detalle: "por 7 días · 6 semanas por 5 $",
    insignia: "destacado" as const,
    incluye: ["Sales primero en tu categoría", "Sello \"Destacado\" en tu ficha y tarjeta", "Todo lo de la ficha gratis"],
  },
  {
    nombre: "Verificado",
    precio: "2 $",
    detalle: "pago único",
    insignia: "verificado" as const,
    incluye: ["Sello \"Verificado\" después de confirmar que tu negocio existe", "Más confianza para los clientes", "Todo lo de la ficha gratis"],
  },
];

export default function PaginaPlanes() {
  const pedir = (plan: string) =>
    `https://wa.me/${WHATSAPP_GUIA}?text=${encodeURIComponent(`Hola, quiero el plan ${plan} para mi negocio en Mi Lindo Ecuador.`)}`;
  return (
    <>
      <Cabecera />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-10 pb-16 text-rio md:px-8">
        <h1 className="m-0 font-rotulo text-[34px] leading-10 font-normal tracking-[-0.01em] text-balance md:text-[56px] md:leading-[62px]">
          Planes para negocios
        </h1>
        <p className="mt-3 mb-0 max-w-[60ch] text-rio-suave">Aparecer es gratis. Si quieres que más gente te encuentre, destaca tu ficha.</p>

        <div className="mt-10 grid gap-6 min-[900px]:grid-cols-3">
          {PLANES.map((p) => (
            <section key={p.nombre} aria-labelledby={`plan-${p.nombre}`} className="grid content-start gap-4 rounded-xl border border-linea bg-papel-alto p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id={`plan-${p.nombre}`} className="m-0 text-lg leading-6 font-semibold">
                  {p.nombre}
                </h2>
                {p.insignia && <Insignia variante={p.insignia}>{p.nombre}</Insignia>}
              </div>
              <p className="m-0">
                <span className="text-[40px] leading-[44px] font-bold tabular-nums">{p.precio}</span>{" "}
                <span className="text-sm leading-5 text-rio-suave">{p.detalle}</span>
              </p>
              <ul className="m-0 grid list-none gap-2.5 p-0">
                {p.incluye.map((i) => (
                  <li key={i} className="flex gap-2.5 text-[15px] leading-[22px] [&_svg]:mt-0.5 [&_svg]:size-[18px] [&_svg]:flex-none [&_svg]:text-exito">
                    <IconoVisto />
                    {i}
                  </li>
                ))}
              </ul>
              {p.insignia ? (
                <a href={pedir(p.nombre)} target="_blank" rel="noopener noreferrer" className={clasesBoton("secundario", "normal", "mt-2")}>
                  <IconoConversacion />
                  Pedir por WhatsApp
                </a>
              ) : (
                <Boton href="/negocios/registro" variante="principal" className="mt-2">
                  Registrar mi negocio
                </Boton>
              )}
            </section>
          ))}
        </div>

        <section aria-labelledby="t-pago" className="mt-12 grid max-w-[62ch] gap-3">
          <h2 id="t-pago" className="m-0 font-rotulo text-xl leading-[26px] font-normal">
            Cómo se paga
          </h2>
          <p className="m-0 text-rio-suave">
            Escríbenos por WhatsApp con el plan que quieres. Pagas por transferencia o DeUna y activamos tu plan en cuanto confirmamos el pago. Primero
            tu negocio tiene que estar registrado.
          </p>
        </section>
      </main>
      <Pie />
    </>
  );
}
