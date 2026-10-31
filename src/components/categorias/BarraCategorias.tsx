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
export function BarraCategorias({ categorias, activa, grande = false }: { categorias: CategoriaBarra[]; activa?: string; grande?: boolean }) {
  // Versión 4: en la portada los afiches salen grandes
  const tam = grande ? "size-[120px] lg:size-[168px]" : "size-[92px] lg:size-28";
  const ancho = grande ? "w-[120px] lg:w-[168px] text-base leading-6" : "w-[92px] lg:w-28 text-sm leading-5";
  const [abierto, setAbierto] = useState(false);
  const idPanel = useId();
  const principales = categorias.filter((c) => c.principal);

  // Diseño de prueba 2 "Ciudad de fondo": en la portada, cuadros que suben sobre el borde de la foto de la ciudad
  if (grande) {
    const cuadro = "grid content-start justify-items-center gap-2 rounded-[20px] border border-linea bg-papel-alto p-3 text-center text-[15px] leading-5 font-semibold text-rio no-underline md:p-4 md:text-base md:leading-6";
    return (
      <nav aria-label="Categorías" className="min-w-0">
        <div className="mx-auto grid max-w-[1040px] grid-cols-3 gap-3 md:grid-cols-6 md:gap-4">
          {principales.map((c) => (
            <Link key={c.slug} href={c.href} className={cuadro}>
              <Afiche slug={c.slug} className="aspect-square w-full" />
              <span>{c.nombreCorto ?? c.nombre}</span>
            </Link>
          ))}
          <button
            type="button"
            aria-expanded={abierto}
            aria-controls={idPanel}
            onClick={() => setAbierto((v) => !v)}
            className={`${cuadro} cursor-pointer aria-expanded:border-celeste-tinta`}
          >
            <Afiche slug="todas" className="aspect-square w-full shadow-[inset_0_0_0_1px_var(--linea)]" />
            <span>Todas</span>
          </button>
        </div>
        <Panel id={idPanel} abierto={abierto} categorias={categorias} activa={activa} />
      </nav>
    );
  }

  return (
    <nav aria-label="Categorías" className="min-w-0">
      <div className="sin-barra -mx-2 flex gap-4 overflow-x-auto px-2 pt-2 pb-3">
        {principales.map((c) => (
          <Link
            key={c.slug}
            href={c.href}
            aria-current={c.slug === activa ? "page" : undefined}
            className={`grid ${ancho} flex-none justify-items-center gap-2 text-center font-medium text-rio no-underline aria-[current=page]:font-bold`}
          >
            <Afiche slug={c.slug} className={`${tam} ${c.slug === activa ? anilloActiva : ""}`} />
            <span>{c.nombreCorto ?? c.nombre}</span>
          </Link>
        ))}
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls={idPanel}
          onClick={() => setAbierto((v) => !v)}
          className={`grid ${ancho} flex-none cursor-pointer justify-items-center gap-2 border-0 bg-transparent p-0 text-center font-medium text-rio aria-expanded:font-bold`}
        >
          <Afiche
            slug="todas"
            className={`${tam} ${abierto ? anilloActiva : "shadow-[inset_0_0_0_1px_var(--linea)]"}`}
          />
          <span>Todas las categorías</span>
        </button>
      </div>
      <Panel id={idPanel} abierto={abierto} categorias={categorias} activa={activa} />
    </nav>
  );
}

/** Panel con todas las categorías, que se despliega con el botón "Todas las categorías". */
function Panel({ id, abierto, categorias, activa }: { id: string; abierto: boolean; categorias: CategoriaBarra[]; activa?: string }) {
  return (
    <div id={id} hidden={!abierto} className="mt-1 rounded-lg border border-linea bg-papel-alto px-4 pt-6 pb-4">
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
    </div>  );
}
