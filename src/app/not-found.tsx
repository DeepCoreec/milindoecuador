import { Buscador } from "@/components/busqueda/Buscador";
import { Cabecera } from "@/components/layout/Cabecera";
import { Pie } from "@/components/layout/Pie";
import { Boton } from "@/components/ui/Boton";

/** Página "no encontrada": explica qué pasó y ofrece por dónde seguir. */
export default function NoEncontrada() {
  return (
    <>
      <Cabecera />
      <main className="mx-auto grid w-full max-w-[1200px] flex-1 content-start gap-5 px-4 pt-14 pb-20 text-rio md:px-8">
        <h1 className="m-0 font-rotulo text-[30px] leading-[34px] font-normal text-balance md:text-[40px] md:leading-[44px]">
          Esta página no existe
        </h1>
        <p className="m-0 max-w-[60ch] text-rio-suave">
          Puede que el enlace esté mal escrito o que el lugar ya no esté publicado. Busca lo que querías o vuelve al inicio.
        </p>
        <Buscador />
        <div>
          <Boton href="/" variante="secundario">
            Volver al inicio
          </Boton>
        </div>
      </main>
      <Pie />
    </>
  );
}
