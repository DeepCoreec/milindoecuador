import type { Totales } from "@/lib/datos/dueno";

function Fila({ titulo, t, conVideo }: { titulo: string; t: Totales; conVideo: boolean }) {
  const datos: [string, number][] = [
    ["Vieron tu ficha", t.vistas],
    ["Tocaron WhatsApp", t.whatsapp],
    ["Tocaron «Cómo llegar»", t.ruta],
  ];
  // Versión 3: reproducciones del video (si tiene, o si tuvo en estos días)
  if (conVideo || t.video) datos.push(["Vieron tu video", t.video]);
  return (
    <div className="grid gap-2">
      <h3 className="m-0 text-[15px] leading-5 font-semibold text-rio-suave">{titulo}</h3>
      <dl className={`m-0 grid gap-3 ${datos.length > 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
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
export function Estadisticas({ semana, mes, conVideo = false }: { semana: Totales; mes: Totales; conVideo?: boolean }) {
  return (
    <section aria-labelledby="t-numeros" className="grid gap-4 rounded-xl border border-linea bg-papel-alto p-6">
      <h2 id="t-numeros" className="m-0 text-xl leading-[26px] font-semibold">
        Cómo te va
      </h2>
      <Fila titulo="Últimos 7 días" t={semana} conVideo={conVideo} />
      <Fila titulo="Últimos 30 días" t={mes} conVideo={conVideo} />
      <p className="m-0 text-[13px] leading-[18px] text-rio-suave">Cada persona cuenta una vez al día. Las vistas se cuentan solo mientras la ficha está publicada.</p>
    </section>
  );
}
