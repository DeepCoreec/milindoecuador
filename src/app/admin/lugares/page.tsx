import Link from "next/link";
import { Boton } from "@/components/ui/Boton";
import { Insignia } from "@/components/ui/Insignia";
import { getLugaresAdmin } from "@/lib/datos/admin";

const ESTADO = { borrador: "Borrador", publicado: "Publicado", oculto: "Oculto" } as const;

/** Todas las fichas, también borradores y ocultas. */
export default async function LugaresAdmin() {
  const lugares = await getLugaresAdmin();
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">Lugares</h1>
          <p className="mt-2 mb-0 max-w-[60ch] text-rio-suave">Un lugar solo se ve en la guía cuando está publicado. Antes de publicar, súbele fotos.</p>
        </div>
        <Boton href="/admin/lugares/nuevo" variante="principal" tamano="chico">
          Nuevo lugar
        </Boton>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-linea bg-papel-alto">
        <table className="w-full min-w-[720px] border-collapse text-[15px] leading-[22px]">
          <caption className="p-4 text-left text-base leading-[22px] font-semibold">{lugares.length === 1 ? "1 lugar" : `${lugares.length} lugares`}</caption>
          <thead>
            <tr className="[&_th]:border-b [&_th]:border-linea [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-[13px] [&_th]:leading-4 [&_th]:font-semibold [&_th]:text-rio-suave">
              <th scope="col">Lugar</th>
              <th scope="col">Categoría</th>
              <th scope="col">Estado</th>
              <th scope="col">Fotos</th>
              <th scope="col">Plan</th>
            </tr>
          </thead>
          <tbody className="[&_td]:border-b [&_td]:border-linea [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_tr:last-child_td]:border-b-0">
            {lugares.map((l) => (
              <tr key={l.id}>
                <td>
                  <Link href={`/admin/lugares/${l.id}`} className="font-semibold">
                    {l.nombre}
                  </Link>
                  <br />
                  <span className="text-sm leading-5 text-rio-suave">{l.sector}</span>
                </td>
                <td>{l.categoriaNombre}</td>
                <td>
                  <Insignia variante={l.estado === "publicado" ? "verificado" : "neutra"}>{ESTADO[l.estado]}</Insignia>
                </td>
                <td className={l.fotos === 0 && l.estado === "publicado" ? "text-error" : ""}>{l.fotos}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {l.destacado && <Insignia variante="destacado">Destacado</Insignia>}
                    {l.verificado && <Insignia variante="verificado">Verificado</Insignia>}
                    {!l.destacado && !l.verificado && <span className="text-rio-suave">Gratis</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
