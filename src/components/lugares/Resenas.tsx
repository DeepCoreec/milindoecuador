import Link from "next/link";
import type { ReactNode } from "react";
import { ReportarResena } from "@/components/resenas/ReportarResena";
import type { Resena } from "@/lib/datos/tipos";
import { fechaLarga } from "@/lib/enlaces";

const formato = new Intl.NumberFormat("es-EC", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function FilaEstrellas({ n }: { n: number }) {
  // 4,5 se dibuja con 4 estrellas llenas; desde 4,6, con 5 (no se infla la nota)
  const llenas = Math.min(5, Math.max(0, Math.round(n - 0.01)));
  return (
    <span className="text-base leading-5 tracking-[0.1em]" role="img" aria-label={`${Number.isInteger(n) ? n : formato.format(n)} de 5 estrellas`}>
      <span className="text-estrella">{"★".repeat(llenas)}</span>
      <span className="text-linea-fuerte">{"★".repeat(5 - llenas)}</span>
    </span>
  );
}

/**
 * Sección de reseñas de la ficha: resumen, el formulario o el enlace para escribir, y las reseñas visibles.
 */
type Props = {
  resenas: Resena[];
  promedio: number | null;
  cantidad: number;
  ejemplo: boolean;
  /** Junto al título: el enlace para entrar a escribir. */
  accion?: ReactNode;
  /** Debajo del título: el formulario de la reseña propia (con sesión). */
  formulario?: ReactNode;
  /** Para el botón "Reportar": la ruta de la ficha y quién mira (null sin sesión). Sin ruta no se muestra. */
  reportar?: { ruta: string; usuarioId: string | null };
};

export function Resenas({ resenas, promedio, cantidad, ejemplo, accion, formulario, reportar }: Props) {
  return (
    <section aria-labelledby="t-res" className="grid gap-2">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 id="t-res" className="m-0 font-rotulo text-xl leading-[26px] font-normal md:text-2xl md:leading-[30px]">
          Reseñas
        </h2>
        {accion}
      </div>
      {formulario}

      {promedio === null || cantidad === 0 ? (
        <p className="m-0 border-b border-linea pb-5 text-rio-suave">Todavía nadie ha escrito una reseña. Si ya fuiste, cuéntale a los demás cómo te fue.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[40px] leading-[44px] font-bold tabular-nums">{formato.format(promedio)}</span>
          <div className="grid gap-0.5">
            <FilaEstrellas n={promedio} />
            <span className="text-sm leading-5 text-rio-suave">
              {cantidad === 1 ? "1 reseña" : `${cantidad} reseñas`}
              {ejemplo ? " de ejemplo" : ""}
            </span>
          </div>
        </div>
      )}

      {resenas.map((r) => (
        <article key={r.id} className="grid gap-2 border-b border-linea py-5">
          <div className="flex flex-wrap justify-between gap-2">
            <b>{r.autor}</b>
            <time dateTime={r.fecha} className="text-sm leading-5 text-rio-suave">
              {fechaLarga(r.fecha)}
            </time>
          </div>
          <FilaEstrellas n={r.estrellas} />
          {/* Texto de usuario: React lo escapa; nunca se inserta como HTML */}
          <p className="m-0">{r.texto}</p>
          {r.respuesta && (
            <div className="mt-1 rounded-xl border border-linea bg-papel-alto px-4 py-3 text-sm leading-5">
              <strong className="mb-1 block">Respuesta del negocio</strong>
              {r.respuesta}
            </div>
          )}
          {reportar &&
            r.autorId !== reportar.usuarioId &&
            (reportar.usuarioId ? (
              <ReportarResena resena={r.id} ruta={reportar.ruta} autor={r.autor} />
            ) : (
              <Link href={`/entrar?siguiente=${encodeURIComponent(reportar.ruta)}`} className="justify-self-start text-[13px] leading-5 text-rio-suave">
                Reportar
              </Link>
            ))}
        </article>
      ))}
    </section>
  );
}
