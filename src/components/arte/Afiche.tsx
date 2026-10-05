import { AFICHES } from "./afiches";

/** Afiche ilustrado de una categoría. Decorativo: el nombre siempre va escrito al lado. */
export function Afiche({ slug, className = "" }: { slug: string; className?: string }) {
  const Dibujo = AFICHES[slug];
  if (!Dibujo) return null;
  return (
    <span className={`mle-afiche block overflow-hidden rounded-md ${className}`} aria-hidden="true">
      <Dibujo />
    </span>
  );
}
