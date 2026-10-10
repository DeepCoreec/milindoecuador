import Link from "next/link";
import { decidirEvento } from "@/acciones/admin";
import { BotonAccion } from "@/components/admin/BotonAccion";
import { Insignia } from "@/components/ui/Insignia";
import { getEventosAdmin } from "@/lib/datos/admin";
import { textoFechas } from "@/lib/eventos";

/** Eventos publicados por la gente (versión 5). Se publican solos; aquí se revisan, sobre todo los reportados. */
export default async function PaginaEventosAdmin() {
  const eventos = await getEventosAdmin();
  const reportados = eventos.filter((e) => e.motivos.length > 0);
  const resto = eventos.filter((e) => e.motivos.length === 0);
  return (
    <>
      <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">Eventos</h1>
      <p className="mt-2 mb-6 max-w-[64ch] text-rio-suave">
        Los eventos se publican al instante y se borran solos al día siguiente de su fecha de fin. Con 3 reportes se ocultan solos hasta que
        decidas. Primero salen los reportados.
      </p>
      {eventos.length === 0 ? (
        <p className="m-0 text-rio-suave">Todavía no hay eventos.</p>
      ) : (
        <ul className="m-0 grid max-w-[880px] list-none gap-4 p-0">
          {[...reportados, ...resto].map((e) => (
            <li key={e.id} className="grid gap-3 rounded-xl border border-linea bg-papel-alto p-5">
              <div className="flex flex-wrap items-center gap-2">
                {e.estado === "publicado" ? (
                  <Link href={`/guayaquil/eventos/${e.slug}`} className="text-lg leading-6 font-semibold">
                    {e.titulo}
                  </Link>
                ) : (
                  <b className="text-lg leading-6">{e.titulo}</b>
                )}
                <Insignia>{e.estado === "oculto" ? "Oculto" : "Se ve"}</Insignia>
                {e.motivos.length > 0 && (
                  <span className="text-sm leading-5 font-semibold text-error">
                    {e.motivos.length} {e.motivos.length === 1 ? "reporte" : "reportes"}
                  </span>
                )}
              </div>
              <p className="m-0 text-[15px] text-rio-suave">
                {textoFechas(e.inicio, e.fin)}. Organiza: {e.organizador}
              </p>
              {e.motivos.length > 0 && (
                <ul className="m-0 grid list-disc gap-1 pl-5 text-[15px] leading-[22px]">
                  {e.motivos.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-3">
                {(e.estado === "oculto" || e.motivos.length > 0) && (
                  <BotonAccion accion={decidirEvento} campos={{ evento: e.id, decision: "mostrar" }} texto="Mostrar" etiqueta={`Mostrar ${e.titulo}`} />
                )}
                {e.estado === "publicado" && <BotonAccion accion={decidirEvento} campos={{ evento: e.id, decision: "ocultar" }} texto="Ocultar" etiqueta={`Ocultar ${e.titulo}`} />}
                <BotonAccion accion={decidirEvento} campos={{ evento: e.id, decision: "borrar" }} texto="Borrar" etiqueta={`Borrar ${e.titulo}`} variante="peligro" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
