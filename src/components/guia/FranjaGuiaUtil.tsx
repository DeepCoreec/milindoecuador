import Link from "next/link";
import { Afiche } from "@/components/arte/Afiche";

const PARTES = [
  { href: "#visitar", titulo: "Para visitar", texto: "Parques, museos, miradores y monumentos" },
  { href: "#danado", titulo: "¿Se te dañó algo?", texto: "Celulares, electrónica, talleres y cerrajerías" },
  { href: "#info", titulo: "Información útil", texto: "ECU 911, salud, Metrovía y Aerovía" },
] as const;

/**
 * Entrada a la Guía útil (versión 5, fase 24) para la portada y "Explora": lugares de referencia de la ciudad,
 * aparte de los negocios, en tres partes.
 */
export function FranjaGuiaUtil({ ciudad = "guayaquil", titulo = "Guía útil de Guayaquil" }: { ciudad?: string; titulo?: string }) {
  const base = `/${ciudad}/guia-util`;
  return (
    <section aria-labelledby="t-franja-guia" className="grid gap-6 rounded-[20px] bg-celeste-suave p-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-8 md:p-10">
      <Afiche slug="reparaciones" className="size-24 max-md:hidden md:size-32" />
      <div className="grid gap-5">
        <div className="grid gap-2">
          <h2 id="t-franja-guia" className="m-0 font-rotulo text-[26px] leading-8 font-normal text-balance md:text-4xl md:leading-[44px]">
            <Link href={base} className="text-rio no-underline hover:underline">
              {titulo}
            </Link>
          </h2>
          <p className="m-0 max-w-[60ch] text-rio-suave">Lugares de la ciudad que conviene conocer, aunque no sean negocios de la guía.</p>
        </div>
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
          {PARTES.map((p) => (
            <li key={p.href} className="grid">
              <Link href={`${base}${p.href}`} className="grid gap-1 rounded-xl border border-linea bg-papel-alto p-4 text-rio no-underline hover:border-rio">
                <b className="text-base leading-6">{p.titulo}</b>
                <span className="text-sm leading-5 text-rio-suave">{p.texto}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
