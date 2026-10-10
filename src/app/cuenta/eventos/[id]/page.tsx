import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormEvento, type ValoresEvento } from "@/components/eventos/FormEvento";
import { Cabecera } from "@/components/layout/Cabecera";
import { Migas } from "@/components/layout/Migas";
import { Pie } from "@/components/layout/Pie";
import { requireUsuario } from "@/lib/auth";
import { getMisEventos, type Evento } from "@/lib/datos/eventos";
import { aHoraLocal } from "@/lib/eventos";
import { textoUbicacion } from "@/lib/ubicacion";

export const metadata: Metadata = { title: "Cambiar evento · Mi Lindo Ecuador", robots: { index: false } };
export const dynamic = "force-dynamic";

function valores(e: Evento): ValoresEvento {
  return {
    id: e.id,
    titulo: e.titulo,
    tipo: e.tipo,
    descripcion: e.descripcion,
    inicio: aHoraLocal(e.inicio),
    fin: aHoraLocal(e.fin),
    enLinea: e.enLinea ? "on" : "",
    lugar: e.lugar ?? "",
    direccion: e.direccion ?? "",
    ubicacion: textoUbicacion(e.ubicacion),
    gratis: e.precio == null ? "on" : "",
    precio: e.precio == null ? "" : String(e.precio),
    organizador: e.organizador,
    whatsapp: e.whatsapp ? `0${e.whatsapp.slice(3)}` : "",
    web: e.web ?? "",
    entradas: e.entradas ?? "",
    edad: e.edad ? String(e.edad) : "",
    afiche: e.afiche?.camino ?? "",
    aficheAlt: e.afiche?.alt ?? "",
    aficheSrc: e.afiche?.src,
  };
}

/** Cambiar un evento propio (versión 5). Solo se encuentra entre los eventos de la cuenta con sesión. */
export default async function PaginaCambiarEvento({ params }: PageProps<"/cuenta/eventos/[id]">) {
  const { id } = await params;
  const usuario = await requireUsuario(`/cuenta/eventos`);
  const evento = (await getMisEventos(usuario.id)).find((e) => e.id === id);
  if (!evento) notFound();
  return (
    <>
      <Cabecera />
      <main className="mx-auto grid w-full max-w-[760px] flex-1 content-start gap-6 px-4 pt-8 pb-20 text-rio md:px-8">
        <Migas pasos={[{ texto: "Mi cuenta", href: "/cuenta" }, { texto: "Mis eventos", href: "/cuenta/eventos" }, { texto: evento.titulo }]} />
        <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal text-balance">{evento.titulo}</h1>
        <FormEvento modo="editar" evento={valores(evento)} />
      </main>
      <Pie />
    </>
  );
}
