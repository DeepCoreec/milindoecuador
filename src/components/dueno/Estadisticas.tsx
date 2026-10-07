import type { Totales } from "@/lib/datos/dueno";

function Fila({ titulo, t }: { titulo: string; t: Totales }) {
  const datos = [
    ["Vieron tu ficha", t.vistas],
    ["Tocaron WhatsApp", t.whatsapp],
    ["Tocaron «Cómo llegar»", t.ruta],
  ] as const;
  return (
    <div className="grid gap-2">
      <h3 className="m-0 text-[15px] leading-5 font-semibold text-rio-suave">{titulo}</h3>
      <dl className="m-0 grid grid-cols-3 gap-3">
        {datos.map(([texto, n]) => (
          <div key={texto} className="flex flex-col-reverse justify-end gap-1 rounded-md border border-linea p-3">
            <dt className="text-[13px] leading-[18px] text-rio-suave">{texto}</dt>
            <dd className="m-0 text-2xl leading-8 font-bold tabular-nums">{n.toLocaleString("es-EC")}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** "Cómo te va" en "Mi negocio" (versión 2, paso 10.2). */
export function Estadisticas({ semana, mes }: { semana: Totales; mes: Totales }) {
  return (
    <section aria-labelledby="t-numeros" className="grid gap-4 rounded-xl border border-linea bg-papel-alto p-6">
      <h2 id="t-numeros" className="m-0 text-xl leading-[26px] font-semibold">
        Cómo te va
      </h2>
      <Fila titulo="Últimos 7 días" t={semana} />
      <Fila titulo="Últimos 30 días" t={mes} />
      <p className="m-0 text-[13px] leading-[18px] text-rio-suave">Cada persona cuenta una vez al día. Las vistas se cuentan solo mientras la ficha está publicada.</p>
    </section>
  );
}
