import Image from "next/image";
import { Afiche } from "@/components/arte/Afiche";
import { FOTOS_CATEGORIAS } from "@/lib/fotos-categorias";

/**
 * La imagen de una categoría: su foto real (versión 2026-11-01) o, si no tiene, el afiche ilustrado.
 * Decorativa (el nombre siempre va escrito al lado). `ancho` es el tamaño en que se muestra, para pedir la foto justa.
 */
export function FotoCategoria({ slug, className = "", ancho = 168 }: { slug: string; className?: string; ancho?: number }) {
  const f = FOTOS_CATEGORIAS[slug];
  if (!f) return <Afiche slug={slug} className={className} />;
  return (
    <span className={`relative block overflow-hidden rounded-md bg-celeste-suave ${className}`} aria-hidden="true">
      <Image src={f.src} alt="" fill sizes={`${ancho}px`} quality={70} className="object-cover" />
    </span>
  );
}
