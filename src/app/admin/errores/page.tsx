import { resolverError } from "@/acciones/admin";
import { BotonAccion } from "@/components/admin/BotonAccion";
import { Insignia } from "@/components/ui/Insignia";
import { getErrores } from "@/lib/datos/admin";
import { fechaLarga } from "@/lib/enlaces";

const TIPOS: Record<string, string> = { render: "Página", action: "Acción", route: "Ruta", proxy: "Proxy" };

/**
 * Errores del servidor en producción (versión 3, paso 13.5). Si algo se rompe en la página real, aparece aquí
 * con cuántas veces pasó. Se guarda solo la ruta y el mensaje (sin datos de las personas).
 */
export default async function PaginaErrores() {
  const errores = await getErrores();
  const pendientes = errores.filter((e) => !e.resuelto).length;
  return (
    <>
      <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">Errores</h1>
      <p className="mt-2 mb-6 max-w-[64ch] text-rio-suave">
        Fallas del servidor en la página real. Si ves uno que se repite mucho, cópialo y pásaselo a Claude. Marca «Resuelto» cuando esté arreglado: si vuelve a
        pasar, aparece otra vez.
      </p>
      {pendientes > 1 && (
        <div className="mb-4">
          <BotonAccion accion={resolverError} campos={{ error: "todos" }} texto="Marcar todos como resueltos" />
        </div>
      )}
      {errores.length === 0 ? (
        <p className="m-0 text-rio-suave">Sin errores. ¡Todo bien!</p>
      ) : (
        <ul className="m-0 grid max-w-[880px] list-none gap-3 p-0">
          {errores.map((e) => (
            <li key={e.id} className={`grid gap-2 rounded-xl border border-linea bg-papel-alto p-4 ${e.resuelto ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Insignia>{TIPOS[e.tipo] ?? e.tipo}</Insignia>
                <code className="text-[15px] leading-5 font-semibold break-all">{e.ruta}</code>
                <span className="text-sm leading-5 text-rio-suave">
                  {e.veces} {e.veces === 1 ? "vez" : "veces"} · última: {fechaLarga(e.ultima)}
                </span>
                {e.resuelto && <Insignia>Resuelto</Insignia>}
              </div>
              <p className="m-0 text-[15px] leading-[22px] break-words">{e.mensaje}</p>
              {e.codigo && <p className="m-0 text-[13px] leading-[18px] text-rio-suave">Código: {e.codigo}</p>}
              {!e.resuelto && (
                <div>
                  <BotonAccion accion={resolverError} campos={{ error: String(e.id) }} texto="Resuelto" etiqueta={`Marcar como resuelto el error en ${e.ruta}`} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
