import { ResenaAdmin } from "@/components/admin/ResenaAdmin";
import { getReportadas } from "@/lib/datos/admin";

/** Reseñas que la gente reportó y todavía no se revisan. */
export default async function Reportes() {
  const resenas = await getReportadas();
  return (
    <>
      <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">Reseñas reportadas</h1>
      <p className="mt-2 mb-6 max-w-[60ch] text-rio-suave">
        Oculta las que tengan insultos, publicidad, datos personales o que no hablen del lugar. Si la reseña es una opinión honesta, aunque sea mala, mantenla.
      </p>
      {resenas.length === 0 ? (
        <p className="m-0 text-rio-suave">No hay reportes pendientes.</p>
      ) : (
        <div className="grid max-w-[760px] gap-4">
          {resenas.map((r) => (
            <ResenaAdmin key={r.id} resena={r} modo="reporte" />
          ))}
        </div>
      )}
    </>
  );
}
