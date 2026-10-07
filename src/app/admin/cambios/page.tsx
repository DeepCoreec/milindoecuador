import Link from "next/link";
import { marcarRevisado, ocultarLugar } from "@/acciones/admin";
import { BotonAccion } from "@/components/admin/BotonAccion";
import { Insignia } from "@/components/ui/Insignia";
import { getCambios } from "@/lib/datos/admin";
import { fechaLarga } from "@/lib/enlaces";

const TIPOS: Record<string, string> = {
  ficha: "Datos",
  estado: "Publicar / pausar",
  "foto-nueva": "Foto nueva",
  "foto-borrada": "Foto borrada",
  "foto-orden": "Orden de fotos",
  respuesta: "Respuesta a reseña",
  "oculta-por-reportes": "Oculta por reportes",
};

/**
 * "Cambios recientes" (versión 2, paso 9.6): lo que hicieron los dueños, que ya salió publicado.
 * El admin revisa cuando quiere y oculta una ficha con un clic si algo no va.
 */
export default async function PaginaCambios() {
  const cambios = await getCambios();
  const pendientes = cambios.filter((c) => !c.revisado).length;
  return (
    <>
      <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">
        Cambios recientes
      </h1>
      <p className="mt-2 mb-6 max-w-[64ch] text-rio-suave">
        Los dueños publican al instante y el filtro automático ya revisó los
        textos. Mira sobre todo las fotos nuevas: si algo no va, oculta la ficha
        y escríbele al dueño.
      </p>
      {pendientes > 0 && (
        <div className="mb-4">
          <BotonAccion
            accion={marcarRevisado}
            campos={{ cambio: "todos" }}
            texto={`Marcar los ${pendientes} como revisados`}
          />
        </div>
      )}
      {cambios.length === 0 ? (
        <p className="m-0 text-rio-suave">Todavía no hay cambios de dueños.</p>
      ) : (
        <ol className="m-0 grid max-w-[880px] list-none gap-3 p-0">
          {cambios.map((c) => (
            <li
              key={c.id}
              className={`grid gap-2 rounded-xl border p-4 ${c.revisado ? "border-linea" : "border-linea-fuerte bg-papel-alto"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2">
                  <Insignia>{TIPOS[c.tipo] ?? c.tipo}</Insignia>
                  {c.lugar ? (
                    <Link
                      href={`/admin/lugares/${c.lugar.id}`}
                      className="font-semibold"
                    >
                      {c.lugar.nombre}
                    </Link>
                  ) : (
                    <b>Lugar borrado</b>
                  )}
                  {c.lugar?.estado === "oculto" && <Insignia>Oculta</Insignia>}
                </span>
                <time
                  dateTime={c.fecha}
                  className="text-sm leading-5 text-rio-suave"
                >
                  {fechaLarga(c.fecha)} · {c.autor}
                </time>
              </div>
              {c.detalle && (
                <p className="m-0 text-[15px] leading-[22px] break-words">
                  {c.detalle}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                {c.lugar?.estado === "publicado" && (
                  <>
                    <Link
                      href={c.lugar.ruta}
                      target="_blank"
                      className="text-sm leading-5"
                    >
                      Ver la ficha
                    </Link>
                    <BotonAccion
                      accion={ocultarLugar}
                      campos={{ lugar: c.lugar.id }}
                      texto="Ocultar ficha"
                      etiqueta={`Ocultar ${c.lugar.nombre}`}
                      variante="peligro"
                    />
                  </>
                )}
                {!c.revisado && (
                  <BotonAccion
                    accion={marcarRevisado}
                    campos={{ cambio: String(c.id) }}
                    texto="Revisado"
                    etiqueta={`Marcar revisado: ${c.lugar?.nombre ?? ""}`}
                  />
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
