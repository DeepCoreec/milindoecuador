import { DecisionSolicitud } from "@/components/admin/DecisionSolicitud";
import { Insignia } from "@/components/ui/Insignia";
import { getSolicitudes } from "@/lib/datos/admin";
import { fechaLarga, mostrarWhatsApp } from "@/lib/enlaces";

const ESTADO = { aprobada: "Aprobada", rechazada: "Rechazada" } as const;

/** Solicitudes de negocios: aprobar crea la ficha como borrador; rechazar guarda una nota. */
export default async function Solicitudes() {
  const solicitudes = await getSolicitudes();
  const pendientes = solicitudes.filter((s) => s.estado === "pendiente").length;
  return (
    <>
      <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">Solicitudes de negocios</h1>
      <p className="mt-2 mb-6 max-w-[60ch] text-rio-suave">
        Revisa los datos y aprueba para crear la ficha como borrador. Escríbele al dueño por WhatsApp para pedirle fotos.
      </p>
      {solicitudes.length === 0 ? (
        <p className="m-0 text-rio-suave">Todavía no llegan solicitudes. Comparte el enlace de registro con los negocios que conozcas.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-linea bg-papel-alto">
          <table className="w-full min-w-[820px] border-collapse text-[15px] leading-[22px]">
            <caption className="p-4 text-left text-base leading-[22px] font-semibold">
              {pendientes === 1 ? "1 pendiente de revisión" : `${pendientes} pendientes de revisión`}
            </caption>
            <thead>
              <tr className="[&_th]:border-b [&_th]:border-linea [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-[13px] [&_th]:leading-4 [&_th]:font-semibold [&_th]:text-rio-suave">
                <th scope="col">Negocio</th>
                <th scope="col">Categoría</th>
                <th scope="col">Sector</th>
                <th scope="col">WhatsApp</th>
                <th scope="col">Recibida</th>
                <th scope="col">Acción</th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-b [&_td]:border-linea [&_td]:px-4 [&_td]:py-3.5 [&_td]:align-top [&_tr:last-child_td]:border-b-0">
              {solicitudes.map((s) => (
                <tr key={s.id}>
                  <td>
                    <b>{s.negocio}</b>
                    <br />
                    <span className="text-sm leading-5 text-rio-suave">De {s.contacto}</span>
                    {s.descripcion && <p className="m-0 mt-1 max-w-[36ch] text-sm leading-5 text-rio-suave">{s.descripcion}</p>}
                  </td>
                  <td>{s.categoria}</td>
                  <td>{s.sector ?? "—"}</td>
                  <td className="whitespace-nowrap">
                    <a href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noopener noreferrer">
                      {mostrarWhatsApp(s.whatsapp)}
                    </a>
                  </td>
                  <td className="whitespace-nowrap">
                    <time dateTime={s.fecha}>{fechaLarga(s.fecha)}</time>
                  </td>
                  <td>
                    {s.estado === "pendiente" ? (
                      <DecisionSolicitud id={s.id} negocio={s.negocio} />
                    ) : (
                      <div className="grid justify-items-start gap-1">
                        <Insignia variante={s.estado === "aprobada" ? "verificado" : "neutra"}>{ESTADO[s.estado]}</Insignia>
                        {s.nota && <span className="text-[13px] leading-[18px] text-rio-suave">{s.nota}</span>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
