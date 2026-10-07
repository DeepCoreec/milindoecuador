import Link from "next/link";
import { decidirLugarReportado } from "@/acciones/admin";
import { BotonAccion } from "@/components/admin/BotonAccion";
import { Insignia } from "@/components/ui/Insignia";
import { getLugaresReportados } from "@/lib/datos/admin";

/** Lugares que la gente reportó (versión 2, paso 9.7). Con 3 reportes ya se ocultaron solos. */
export default async function PaginaLugaresReportados() {
  const lugares = await getLugaresReportados();
  return (
    <>
      <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">Lugares reportados</h1>
      <p className="mt-2 mb-6 max-w-[64ch] text-rio-suave">
        Con 3 reportes de personas distintas, la ficha se oculta sola hasta que decidas. Si el reporte no tiene razón, muéstrala otra vez.
      </p>
      {lugares.length === 0 ? (
        <p className="m-0 text-rio-suave">No hay reportes pendientes.</p>
      ) : (
        <ul className="m-0 grid max-w-[880px] list-none gap-4 p-0">
          {lugares.map((l) => (
            <li key={l.id} className="grid gap-3 rounded-xl border border-linea bg-papel-alto p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/lugares/${l.id}`} className="text-lg leading-6 font-semibold">
                  {l.nombre}
                </Link>
                <Insignia>{l.estado === "oculto" ? "Oculta" : "Se ve"}</Insignia>
                <span className="text-sm leading-5 text-rio-suave">
                  {l.motivos.length} {l.motivos.length === 1 ? "reporte" : "reportes"}
                </span>
              </div>
              <ul className="m-0 grid list-disc gap-1 pl-5 text-[15px] leading-[22px]">
                {l.motivos.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <BotonAccion
                  accion={decidirLugarReportado}
                  campos={{ lugar: l.id, decision: "mostrar" }}
                  texto="Mostrar otra vez"
                  etiqueta={`Mostrar otra vez ${l.nombre}`}
                />
                <BotonAccion
                  accion={decidirLugarReportado}
                  campos={{ lugar: l.id, decision: "ocultar" }}
                  texto="Dejar oculta"
                  etiqueta={`Dejar oculta ${l.nombre}`}
                  variante="peligro"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
