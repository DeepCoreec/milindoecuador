import Link from "next/link";

/** Ruta de migas: "Guayaquil / Restaurantes". El último paso es la página actual y no es enlace. */
export function Migas({ pasos }: { pasos: { texto: string; href?: string }[] }) {
  return (
    <nav aria-label="Estás en" className="mb-3">
      <ol className="m-0 flex list-none flex-wrap gap-1.5 p-0 text-sm leading-5 text-rio-suave">
        {pasos.map((p, i) => (
          <li key={p.texto} className="flex gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {p.href ? (
              <Link href={p.href} className="text-rio-suave">
                {p.texto}
              </Link>
            ) : (
              <span aria-current="page">{p.texto}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
