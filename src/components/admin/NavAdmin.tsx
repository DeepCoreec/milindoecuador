"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; texto: string; contador?: number };

/** Menú del panel: marca la sección actual y muestra cuántas cosas esperan revisión. */
export function NavAdmin({ items }: { items: Item[] }) {
  const ruta = usePathname();
  return (
    <nav aria-label="Panel" className="sin-barra flex gap-1 overflow-x-auto min-[900px]:mt-6 min-[900px]:flex-col">
      {items.map((i) => {
        const actual = i.href === "/admin" ? ruta === "/admin" : ruta.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={actual ? "page" : undefined}
            className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 text-[15px] leading-5 font-medium whitespace-nowrap text-rio no-underline aria-[current=page]:bg-celeste-suave aria-[current=page]:font-bold aria-[current=page]:text-celeste-tinta"
          >
            {i.texto}
            {!!i.contador && (
              <span className="inline-grid h-6 min-w-6 place-items-center rounded-full bg-mango px-1.5 text-[13px] leading-4 font-bold text-on-color">
                {i.contador}
                <span className="sr-only"> por revisar</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
