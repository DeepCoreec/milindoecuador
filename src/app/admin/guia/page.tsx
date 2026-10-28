import Link from "next/link";
import { importarOSM } from "@/acciones/admin";
import { pedirRevisionAgente, reiniciarRecomendacionesReglas } from "@/acciones/agente";
import { BotonAccion } from "@/components/admin/BotonAccion";
import { SitiosGuia } from "@/components/admin/SitiosGuia";
import { getSitiosAdmin, type FiltroAgente } from "@/lib/datos/admin";
import { NOMBRE_TIPO, type TipoSitio } from "@/lib/osm";

// Importar de OpenStreetMap puede tardar. 60 s es el máximo del plan gratis de Vercel (con 120 el despliegue fallaba)
export const maxDuration = 60;

const ESTADOS = { pendiente: "Por revisar", publicado: "Publicados", descartado: "Descartados" } as const;
const GRUPOS = { visitar: "Para visitar", servicios: "¿Se te dañó algo?", salud: "Salud", transporte: "Transporte" } as const;
// Versión 6 (fase 27): filtrar por lo que recomienda el agente revisor
const AGENTE = { publicar: "Dice publicar", revisar: "Dice revisar", descartar: "Dice descartar", sin: "Sin recomendación" } as const;

/** Guía útil (versión 5, fase 23): lugares de OpenStreetMap que el admin revisa antes de mostrarlos. */
export default async function PaginaGuiaAdmin({ searchParams }: PageProps<"/admin/guia">) {
  const sp = await searchParams;
  const estado = (Object.keys(ESTADOS) as (keyof typeof ESTADOS)[]).find((e) => e === sp.estado) ?? "pendiente";
  const grupo = (Object.keys(GRUPOS) as (keyof typeof GRUPOS)[]).find((g) => g === sp.grupo) ?? null;
  const agente = estado === "pendiente" ? ((Object.keys(AGENTE) as FiltroAgente[]).find((a) => a === sp.agente) ?? null) : null;
  const { sitios, cuentas, acierto } = await getSitiosAdmin(estado, grupo, agente);
  const enlace = (e: string, g: string | null, a: FiltroAgente | null = null) => `/admin/guia?estado=${e}${g ? `&grupo=${g}` : ""}${a ? `&agente=${a}` : ""}`;
  const pestana = (activa: boolean) => `rounded-full border px-3 py-1.5 text-sm font-semibold no-underline ${activa ? "border-rio bg-rio text-papel" : "border-linea-fuerte text-rio"}`;
  return (
    <>
      <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">Guía útil</h1>
      <p className="mt-2 mb-4 max-w-[68ch] text-rio-suave">
        Lugares de referencia que no son negocios registrados (parques, museos, talleres, farmacias, Metrovía…). Vienen de OpenStreetMap y
        solo se ven en la guía cuando los publicas. Al traerlos otra vez, los que ya están no cambian. Datos © colaboradores de OpenStreetMap
        (licencia ODbL).
      </p>
      <div className="mb-6 grid gap-3">
        <BotonAccion accion={importarOSM} campos={{}} texto="Traer lugares de OpenStreetMap" variante="principal" />
        {estado === "pendiente" && (
          <section aria-labelledby="t-agente" className="grid gap-2 rounded-xl border border-linea bg-papel-alto p-4">
            <h2 id="t-agente" className="m-0 text-base font-semibold">
              Agente revisor
            </h2>
            <p className="m-0 max-w-[68ch] text-sm text-rio-suave">
              Revisa hasta 100 lugares «Por revisar» {grupo ? `de «${GRUPOS[grupo]}»` : ""} y recomienda publicar, revisar o descartar, con su motivo.
              No cambia nada: tú decides con los botones de abajo. Primero usa reglas (gratis) y luego Claude Haiku. Puede equivocarse: mira la lista antes de publicar en bloque.
            </p>
            <div className="flex flex-wrap gap-3">
              <BotonAccion accion={pedirRevisionAgente} campos={grupo ? { grupo } : {}} texto="Pedir revisión al agente" />
              <BotonAccion
                accion={reiniciarRecomendacionesReglas}
                campos={grupo ? { grupo } : {}}
                texto="Volver a revisar lo de las reglas"
                etiqueta="Borrar las recomendaciones de las reglas para que el agente las vuelva a mirar"
              />
              <BotonAccion
                accion={reiniciarRecomendacionesReglas}
                campos={grupo ? { grupo, fuente: "todas" } : { fuente: "todas" }}
                texto="Volver a revisar todo (también lo de la IA)"
                etiqueta="Borrar todas las recomendaciones, también las de la IA, para que el agente las vuelva a mirar con el criterio nuevo"
              />
            </div>
            {acierto.length > 0 && (
              <p className="m-0 text-sm">
                <b>Acierto del agente:</b>{" "}
                {acierto
                  .map((a) => `${NOMBRE_TIPO[a.tipo as TipoSitio] ?? a.tipo}: coincidió contigo en ${a.aciertos} de ${a.total}`)
                  .join(" · ")}
              </p>
            )}
          </section>
        )}
      </div>
      <nav aria-label="Estado" className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(ESTADOS) as (keyof typeof ESTADOS)[]).map((e) => (
          <Link key={e} href={enlace(e, grupo)} aria-current={e === estado ? "page" : undefined} className={pestana(e === estado)}>
            {ESTADOS[e]} ({cuentas[e]})
          </Link>
        ))}
      </nav>
      <nav aria-label="Grupo" className="mb-4 flex flex-wrap gap-2">
        <Link href={enlace(estado, null)} aria-current={!grupo ? "page" : undefined} className={pestana(!grupo)}>
          Todos
        </Link>
        {(Object.keys(GRUPOS) as (keyof typeof GRUPOS)[]).map((g) => (
          <Link key={g} href={enlace(estado, g)} aria-current={g === grupo ? "page" : undefined} className={pestana(g === grupo)}>
            {GRUPOS[g]}
          </Link>
        ))}
      </nav>
      {estado === "pendiente" && (
        <nav aria-label="Recomendación del agente" className="mb-4 flex flex-wrap gap-2">
          <Link href={enlace(estado, grupo)} aria-current={!agente ? "page" : undefined} className={pestana(!agente)}>
            Todas
          </Link>
          {(Object.keys(AGENTE) as FiltroAgente[]).map((a) => (
            <Link key={a} href={enlace(estado, grupo, a)} aria-current={a === agente ? "page" : undefined} className={pestana(a === agente)}>
              {AGENTE[a]}
            </Link>
          ))}
        </nav>
      )}
      {sitios.length === 0 ? <p className="m-0 text-rio-suave">No hay lugares aquí.</p> : <SitiosGuia key={`${estado}-${grupo}-${agente}`} sitios={sitios} estado={estado} />}
    </>
  );
}
