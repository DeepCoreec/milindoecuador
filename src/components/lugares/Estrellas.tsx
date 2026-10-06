const formato = new Intl.NumberFormat("es-EC", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Calificación promedio: estrella, número con coma decimal y cantidad de reseñas. */
export function Estrellas({ promedio, cantidad, corto = false }: { promedio: number | null; cantidad: number; corto?: boolean }) {
  if (promedio === null || cantidad === 0) {
    return <span className="text-sm leading-5 text-rio-suave">Sin reseñas todavía</span>;
  }
  const valor = formato.format(promedio);
  const resenas = cantidad === 1 ? "1 reseña" : `${cantidad} reseñas`;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-sm leading-5 text-rio-suave tabular-nums"
      role="img"
      aria-label={`${valor} de 5 estrellas, ${resenas}`}
    >
      <span aria-hidden="true" className="text-base text-estrella">
        ★
      </span>
      <b className="text-rio" aria-hidden="true">
        {valor}
      </b>
      <span aria-hidden="true">({corto ? cantidad : resenas})</span>
    </span>
  );
}
