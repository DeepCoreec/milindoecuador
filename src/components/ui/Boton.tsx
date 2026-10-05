import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variante = "principal" | "secundario" | "whatsapp" | "texto";
type Tamano = "normal" | "chico";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border font-semibold no-underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0";
const variantes: Record<Variante, string> = {
  principal: "bg-celeste-tinta border-celeste-tinta text-on-celeste-tinta",
  secundario: "bg-papel-alto border-linea-fuerte text-rio",
  whatsapp: "bg-whatsapp border-whatsapp text-on-color",
  texto: "bg-transparent border-transparent text-celeste-tinta",
};
const tamanos: Record<Tamano, string> = {
  normal: "min-h-12 px-6 text-base leading-6",
  chico: "min-h-10 px-4 text-[15px] leading-5",
};

export function clasesBoton(variante: Variante = "secundario", tamano: Tamano = "normal", extra = "") {
  const relleno = variante === "texto" ? "px-2" : "";
  return [base, variantes[variante], tamanos[tamano], relleno, extra].filter(Boolean).join(" ");
}

type Comun = { variante?: Variante; tamano?: Tamano; children: ReactNode; className?: string };

/**
 * Botón del sistema de diseño. El principal va una sola vez por pantalla.
 * Con `href` se dibuja como enlace; sin `href`, como <button>.
 */
export function Boton(props: Comun & ({ href: string } | ({ href?: undefined } & ComponentProps<"button">))) {
  const { variante = "secundario", tamano = "normal", className, children } = props;
  const clases = clasesBoton(variante, tamano, className);
  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={clases}>
        {children}
      </Link>
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variante: _v, tamano: _t, className: _c, href: _h, ...resto } = props;
  return (
    <button type="button" {...resto} className={clases}>
      {children}
    </button>
  );
}
