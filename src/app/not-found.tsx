import { Buscador } from "@/components/busqueda/Buscador";
import { Cabecera } from "@/components/layout/Cabecera";
import { Pie } from "@/components/layout/Pie";
import { Guacamaya } from "@/components/paumi/Guacamaya";
import { Boton } from "@/components/ui/Boton";

/** Página "no encontrada" (versión 4): Paumi pensando, qué pasó y por dónde seguir. */
export default function NoEncontrada() {
  return (
    <>
      <Cabecera />
      <main data-theme="dark" className="flex-1 bg-papel text-rio">
        <section>
          <div className="mx-auto grid w-full max-w-[1280px] items-center gap-8 px-4 pt-12 pb-16 md:grid-cols-[minmax(0,1fr)_auto] md:px-8 md:pt-16 md:pb-20">
            <div className="grid content-start gap-5">
              <h1 className="m-0 font-rotulo text-[34px] leading-10 font-normal text-balance md:text-[56px] md:leading-[62px]">Esta página no existe</h1>
              <p className="m-0 max-w-[56ch] text-lg leading-7 text-rio-suave">
                Puede que el enlace esté mal escrito o que el lugar ya no esté publicado. Busca lo que querías o vuelve al inicio.
              </p>
              <Buscador />
              <div>
                <Boton href="/" variante="secundario">
                  Volver al inicio
                </Boton>
              </div>
            </div>
            <div className="max-md:hidden">
              <Guacamaya estado="pensando" animada={false} escala={6} />
            </div>
          </div>
        </section>
      </main>
      <Pie />
    </>
  );
}
