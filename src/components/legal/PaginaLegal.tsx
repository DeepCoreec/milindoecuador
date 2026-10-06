import type { ReactNode } from "react";
import { Cabecera } from "@/components/layout/Cabecera";
import { Pie } from "@/components/layout/Pie";
import { ACTUALIZADO } from "@/lib/legal";

/** Marco de las páginas legales: texto de lectura cómoda, títulos claros y fecha de actualización. */
export function PaginaLegal({ titulo, resumen, children }: { titulo: string; resumen: string; children: ReactNode }) {
  return (
    <>
      <Cabecera />
      <main className="mx-auto w-full max-w-[720px] flex-1 px-4 pt-10 pb-20 text-rio md:px-8">
        <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal text-balance md:text-[36px] md:leading-[42px]">{titulo}</h1>
        <p className="mt-2 mb-0 text-sm leading-5 text-rio-suave">Última actualización: {ACTUALIZADO}</p>
        <p className="mt-6 mb-0 rounded-xl border border-linea bg-celeste-suave p-4 leading-6">{resumen}</p>
        <div className="mt-8 grid gap-6 leading-7 [&_h2]:m-0 [&_h2]:mt-4 [&_h2]:font-rotulo [&_h2]:text-xl [&_h2]:leading-[26px] [&_h2]:font-normal [&_li]:mt-1 [&_p]:m-0 [&_ul]:m-0 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:marker:text-rio-suave">
          {children}
        </div>
      </main>
      <Pie />
    </>
  );
}
