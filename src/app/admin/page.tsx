import Link from "next/link";
import { getContadores } from "@/lib/datos/admin";

/** Resumen del panel: cuánto espera revisión. */
export default async function ResumenAdmin() {
  const c = await getContadores();
  const cajas = [
    { texto: "Solicitudes pendientes", n: c.pendientes, href: "/admin/solicitudes" },
    { texto: "Lugares publicados", n: c.publicados },
    { texto: "Reseñas reportadas", n: c.reportes },
  ];
  return (
    <>
      <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">Resumen</h1>
      <p className="mt-2 mb-0 max-w-[60ch] text-rio-suave">Lo que espera revisión hoy.</p>
      <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
        {cajas.map((k) => (
          <div key={k.texto} className="grid gap-1 rounded-xl border border-linea bg-papel-alto px-5 py-4">
            <span className="text-sm leading-5 text-rio-suave">{k.texto}</span>
            <span className="text-[28px] leading-[34px] font-bold tabular-nums">{k.n}</span>
            {k.href && k.n > 0 && (
              <Link href={k.href} className="text-sm leading-5">
                Revisar
              </Link>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
