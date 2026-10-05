import type { Metadata } from "next";
import { Cabecera } from "@/components/layout/Cabecera";
import { Migas } from "@/components/layout/Migas";
import { Pie } from "@/components/layout/Pie";
import { FormRegistro } from "@/components/negocios/FormRegistro";
import { Boton } from "@/components/ui/Boton";
import { IconoVisto } from "@/components/ui/iconos";
import { getCategorias } from "@/lib/datos/lugares";
import { paraCompartir, WHATSAPP_GUIA } from "@/lib/sitio";

const descripcion = "Publica gratis la ficha de tu negocio en Guayaquil, con fotos, horario y tu WhatsApp.";
export const metadata: Metadata = {
  title: "Registra tu negocio gratis · Mi Lindo Ecuador",
  description: descripcion,
  ...paraCompartir("Registra tu negocio gratis", descripcion, "/negocios/registro"),
};

// Las categorías casi no cambian: la página se vuelve a generar cada hora
export const revalidate = 3600;

const VENTAJAS = [
  "Ficha con fotos, horario, ubicación y tu WhatsApp",
  "Reseñas de tus clientes y la opción de responderlas",
  "Un enlace propio para compartir en Instagram y WhatsApp",
];

export default async function PaginaRegistro() {
  const categorias = (await getCategorias()).map(({ slug, nombre }) => ({ slug, nombre }));
  return (
    <>
      <Cabecera />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-8 pb-16 text-rio md:px-8">
        <div className="grid items-start gap-10 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
          <div className="grid max-w-[520px] gap-4">
            <Migas pasos={[{ texto: "Negocios", href: "/negocios/planes" }, { texto: "Registro" }]} />
            <h1 className="m-0 font-rotulo text-[30px] leading-[34px] font-normal tracking-[-0.01em] text-balance md:text-[40px] md:leading-[44px]">
              Registra tu negocio gratis
            </h1>
            <p className="m-0 max-w-[60ch] text-rio-suave">Llena tus datos y revisamos tu solicitud. Cuando tu ficha esté lista, te escribimos por WhatsApp.</p>
            <ul className="m-0 mt-2 grid list-none gap-3 p-0">
              {VENTAJAS.map((v) => (
                <li key={v} className="flex gap-3 [&_svg]:size-[22px] [&_svg]:flex-none [&_svg]:text-exito">
                  <IconoVisto />
                  <span>{v}</span>
                </li>
              ))}
            </ul>
            <Boton href="/negocios/planes" variante="texto" className="justify-self-start">
              Ver planes para destacar tu negocio
            </Boton>
          </div>
          <FormRegistro categorias={categorias} avisoWhatsApp={WHATSAPP_GUIA} />
        </div>
      </main>
      <Pie />
    </>
  );
}
