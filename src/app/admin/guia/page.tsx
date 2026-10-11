import Link from "next/link";
import { importarOSM } from "@/acciones/admin";
import { BotonAccion } from "@/components/admin/BotonAccion";
import { SitiosGuia } from "@/components/admin/SitiosGuia";
import { getSitiosAdmin } from "@/lib/datos/admin";

// Importar de OpenStreetMap puede tardar (la API Overpass arma la respuesta)
export const maxDuration = 120;

const ESTADOS = { pendiente: "Por revisar", publicado: "Publicados", descartado: "Descartados" } as const;
const GRUPOS = { visitar: "Para visitar", servicios: "¿Se te dañó algo?", salud: "Salud", transporte: "Transporte" } as const;

/** Guía útil (versión 5, fase 23): lugares de OpenStreetMap que el admin revisa antes de mostrarlos. */
export default async function PaginaGuiaAdmin({ searchParams }: PageProps<"/admin/guia">) {
  const sp = await searchParams;
  const estado = (Object.keys(ESTADOS) as (keyof typeof ESTADOS)[]).find((e) => e === sp.estado) ?? "pendiente";
  const grupo = (Object.keys(GRUPOS) as (keyof typeof GRUPOS)[]).find((g) => g === sp.grupo) ?? null;
  const { sitios, cuentas } = await getSitiosAdmin(estado, grupo);
  const enlace = (e: string, g: string | null) => `/admin/guia?estado=${e}${g ? `&grupo=${g}` : ""}`;
  const pestana = (activa: boolean) => `rounded-full border px-3 py-1.5 text-sm font-semibold no-underline ${activa ? "border-rio bg-rio text-papel" : "border-linea-fuerte text-rio"}`;
  return (
    <>
      <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">Guía útil</h1>
      <p className="mt-2 mb-4 max-w-[68ch] text-rio-suave">
        Lugares de referencia que no son negocios registrados (parques, museos, talleres, farmacias, Metrovía…). Vienen de OpenStreetMap y
        solo se ven en la guía cuando los publicas. Al traerlos otra vez, los que ya están no cambian. Datos © colaboradores de OpenStreetMap
        (licencia ODbL).
      </p>
      <div className="mb-6">
        <BotonAccion accion={importarOSM} campos={{}} texto="Traer lugares de OpenStreetMap" variante="principal" />
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
      {sitios.length === 0 ? <p className="m-0 text-rio-suave">No hay lugares aquí.</p> : <SitiosGuia key={`${estado}-${grupo}`} sitios={sitios} estado={estado} />}
    </>
  );
}
