"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Afiche } from "@/components/arte/Afiche";

export type CategoriaBarra = { slug: string; nombre: string; nombreCorto?: string; href: string; principal: boolean };

const anilloActiva = "shadow-[0_0_0_3px_var(--papel),0_0_0_6px_var(--celeste-tinta)]";

/**
 * Barra de categorías: las principales con su afiche y el botón "Todas las categorías",
 * que despliega el panel con todas.
 */
export function BarraCategorias({ categorias, activa }: { categorias: CategoriaBarra[]; activa?: string }) {
  const [abierto, setAbierto] = useState(false);
  const idPanel = useId();
  const principales = categorias.filter((c) => c.principal);

  return (
    <nav aria-label="Categorías" className="min-w-0">
      <div className="sin-barra -mx-2 flex gap-4 overflow-x-auto px-2 pt-2 pb-3">
        {principales.map((c) => (
          <Link
            key={c.slug}
            href={c.href}
            aria-current={c.slug === activa ? "page" : undefined}
            className="grid w-[92px] flex-none justify-items-center gap-2 text-center text-sm leading-5 font-medium text-rio no-underline aria-[current=page]:font-bold lg:w-28"
          >
            <Afiche slug={c.slug} className={`size-[92px] lg:size-28 ${c.slug === activa ? anilloActiva : ""}`} />
            <span>{c.nombreCorto ?? c.nombre}</span>
          </Link>
        ))}
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls={idPanel}
          onClick={() => setAbierto((v) => !v)}
          className="grid w-[92px] flex-none cursor-pointer justify-items-center gap-2 border-0 bg-transparent p-0 text-center text-sm leading-5 font-medium text-rio aria-expanded:font-bold lg:w-28"
        >
          <Afiche
            slug="todas"
            className={`size-[92px] lg:size-28 ${abierto ? anilloActiva : "shadow-[inset_0_0_0_1px_var(--linea)]"}`}
          />
          <span>Todas las categorías</span>
        </button>
      </div>
      <div id={idPanel} hidden={!abierto} className="mt-1 rounded-lg border border-linea bg-papel-alto px-4 pt-6 pb-4">
        <h2 className="m-0 mb-4 font-rotulo text-lg leading-6 font-normal">Todas las categorías</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-x-3 gap-y-4">
          {categorias.map((c) => (
            <Link
              key={c.slug}
              href={c.href}
              aria-current={c.slug === activa ? "page" : undefined}
              className="grid justify-items-center gap-2 text-center text-[13px] leading-[18px] font-medium text-rio no-underline aria-[current=page]:font-bold"
            >
              <Afiche slug={c.slug} className="size-[72px]" />
              <span>{c.nombre}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
