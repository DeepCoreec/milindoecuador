import { TAMANO_OG, tarjetaOg } from "@/app/_og/tarjeta";
import { getCategoria, getCiudad } from "@/lib/datos/lugares";

export const size = TAMANO_OG;
export const contentType = "image/png";
export const alt = "Categoría de lugares en Mi Lindo Ecuador";

/** Imagen al compartir una categoría, por ejemplo "Restaurantes en Guayaquil". */
export default async function Image({ params }: { params: Promise<{ ciudad: string; categoria: string }> }) {
  const p = await params;
  const [ciudad, categoria] = await Promise.all([getCiudad(p.ciudad), getCategoria(p.categoria)]);
  return tarjetaOg({
    arriba: `En ${ciudad?.nombre ?? "Guayaquil"}`,
    titulo: categoria?.nombre ?? "Lugares",
    abajo: "Recomendados por la gente de aquí",
  });
}
