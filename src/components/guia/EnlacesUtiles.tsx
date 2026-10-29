import { ENLACES_COMPROBADOS, ENLACES_UTILES } from "@/lib/enlaces-utiles";

const fecha = new Date(`${ENLACES_COMPROBADOS}T12:00:00-05:00`).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });

/**
 * Enlaces oficiales de "Información útil" (versión 8, fase 33): cada uno es una fila grande y fácil de tocar en el
 * celular, con el sitio al que lleva. Se abren en otra pestaña.
 */
export function EnlacesUtiles() {
  return (
    <section aria-labelledby="t-enlaces" className="grid gap-5">
      <div className="grid gap-1">
        <h3 id="t-enlaces" className="m-0 text-2xl leading-8 font-semibold">
          Enlaces oficiales
        </h3>
        <p className="m-0 text-[15px] leading-[22px] text-rio-suave">Páginas oficiales para revisar horarios, rutas y cambios. Comprobados el {fecha}.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {ENLACES_UTILES.map((g) => (
          <div key={g.titulo} className="grid content-start gap-2">
            <h4 className="m-0 text-base font-semibold text-rio-suave">{g.titulo}</h4>
            <ul className="m-0 grid list-none gap-2 p-0">
              {g.enlaces.map((e) => (
                <li key={e.url}>
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid min-h-11 gap-0.5 rounded-xl border border-linea bg-papel-alto px-4 py-3 text-rio no-underline hover:border-celeste-tinta focus-visible:border-celeste-tinta"
                  >
                    <span className="font-semibold underline underline-offset-4">
                      {e.titulo}
                      {e.pdf ? " (PDF)" : ""}
                      <span aria-hidden="true"> ↗</span>
                      <span className="sr-only"> (se abre en otra pestaña)</span>
                    </span>
                    <span className="text-sm leading-5 text-rio-suave">{e.detalle}</span>
                    <span className="text-[13px] leading-[18px] text-rio-suave">{e.sitio}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
