import Link from "next/link";
import { decidirVideo } from "@/acciones/videos";
import { BotonAccion } from "@/components/admin/BotonAccion";
import { Insignia } from "@/components/ui/Insignia";
import { getVideosAdmin } from "@/lib/datos/admin";
import { fechaLarga } from "@/lib/enlaces";
import { exigirConfigSupabase } from "@/lib/supabase/config";

/**
 * Videos de los negocios (versión 3, paso 11.5). Salen al instante, sin aprobación: aquí el admin los revisa
 * cuando quiere. Con 3 reportes un video se oculta solo hasta que se decida.
 */
export default async function PaginaVideos() {
  const videos = await getVideosAdmin(exigirConfigSupabase().url);
  return (
    <>
      <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">Videos</h1>
      <p className="mt-2 mb-6 max-w-[64ch] text-rio-suave">
        Los videos salen al instante. Los reportados van primero; con 3 reportes se ocultan solos hasta que decidas. Mostrar o borrar cierra sus reportes.
      </p>
      {videos.length === 0 ? (
        <p className="m-0 text-rio-suave">Todavía no hay videos.</p>
      ) : (
        <ul className="m-0 grid max-w-[880px] list-none gap-4 p-0">
          {videos.map((v) => (
            <li key={v.lugar.id} className="grid gap-3 rounded-xl border border-linea bg-papel-alto p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/lugares/${v.lugar.id}`} className="text-lg leading-6 font-semibold">
                  {v.lugar.nombre}
                </Link>
                <Insignia>{v.oculto ? "Oculto" : "Se ve"}</Insignia>
                <span className="text-sm leading-5 text-rio-suave">
                  {Math.round(v.duracion)} s · {fechaLarga(v.fecha)}
                </span>
              </div>
              {v.motivos.length > 0 && (
                <div className="grid gap-1">
                  <span className="text-sm leading-5 font-semibold text-error">
                    {v.motivos.length} {v.motivos.length === 1 ? "reporte" : "reportes"}
                  </span>
                  <ul className="m-0 grid list-disc gap-1 pl-5 text-[15px] leading-[22px]">
                    {v.motivos.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
              <video
                controls
                playsInline
                preload="none"
                poster={v.portada ?? undefined}
                src={v.src}
                aria-label={`Video de ${v.lugar.nombre}`}
                className="max-h-[360px] w-full rounded-md bg-celeste-suave object-contain"
              />
              <div className="flex flex-wrap gap-3">
                {v.oculto ? (
                  <BotonAccion accion={decidirVideo} campos={{ lugar: v.lugar.id, decision: "mostrar" }} texto="Mostrar otra vez" etiqueta={`Mostrar otra vez el video de ${v.lugar.nombre}`} />
                ) : (
                  <BotonAccion accion={decidirVideo} campos={{ lugar: v.lugar.id, decision: "ocultar" }} texto="Ocultar" etiqueta={`Ocultar el video de ${v.lugar.nombre}`} />
                )}
                <BotonAccion
                  accion={decidirVideo}
                  campos={{ lugar: v.lugar.id, decision: "borrar" }}
                  texto="Borrar video"
                  etiqueta={`Borrar el video de ${v.lugar.nombre}`}
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
