import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Afiche } from "@/components/arte/Afiche";
import { Cabecera } from "@/components/layout/Cabecera";
import { Pie } from "@/components/layout/Pie";
import { getCategorias, getCiudad } from "@/lib/datos/lugares";
import { paraCompartir } from "@/lib/sitio";

async function cargarCiudad(params: PageProps<"/[ciudad]">["params"]) {
  const ciudad = await getCiudad((await params).ciudad);
  if (!ciudad) notFound();
  return ciudad;
}

export async function generateMetadata({ params }: PageProps<"/[ciudad]">): Promise<Metadata> {
  const ciudad = await cargarCiudad(params);
  const descripcion = `Restaurantes, hoteles, lugares turísticos y planes en ${ciudad.nombre}, recomendados por la gente de aquí.`;
  return { title: `Explora ${ciudad.nombre} · Mi Lindo Ecuador`, description: descripcion, ...paraCompartir(`Explora ${ciudad.nombre}`, descripcion, `/${ciudad.slug}`) };
}

/** Página de la ciudad: todas las categorías, con su afiche, para empezar a explorar. */
export default async function PaginaCiudad({ params }: PageProps<"/[ciudad]">) {
  const ciudad = await cargarCiudad(params);
  const categorias = await getCategorias();

  return (
    <>
      <Cabecera />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-10 pb-16 text-rio md:px-8">
        <h1 className="m-0 font-rotulo text-[34px] leading-10 font-normal tracking-[-0.01em] text-balance md:text-[56px] md:leading-[62px]">
          Explora {ciudad.nombre}
        </h1>
        <p className="mt-3 mb-0 max-w-[60ch] text-rio-suave">Elige qué quieres hacer hoy. Cada lugar tiene reseñas de la gente y el WhatsApp del negocio.</p>

        <ul className="mt-10 grid list-none grid-cols-2 gap-x-4 gap-y-8 p-0 sm:grid-cols-3 min-[1000px]:grid-cols-4">
          {categorias.map((c) => (
            <li key={c.slug} className="min-w-0">
              <Link href={`/${ciudad.slug}/${c.slug}`} className="group grid gap-3 text-rio no-underline">
                <Afiche slug={c.slug} className="aspect-square w-full rounded-lg" />
                <span className="text-lg leading-6 font-semibold group-hover:underline group-hover:underline-offset-[3px]">{c.nombre}</span>
                <span className="-mt-2 text-sm leading-5 text-rio-suave">{c.bajada}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Pie />
    </>
  );
}
