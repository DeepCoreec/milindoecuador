import { TAMANO_OG, tarjetaOg } from "@/app/_og/tarjeta";
import { getCiudad } from "@/lib/datos/lugares";

export const size = TAMANO_OG;
export const contentType = "image/png";
export const alt = "Explora la ciudad en Mi Lindo Ecuador";

/** Imagen al compartir la página de una ciudad. */
export default async function Image({ params }: { params: Promise<{ ciudad: string }> }) {
  const ciudad = await getCiudad((await params).ciudad);
  return tarjetaOg({ arriba: "Explora", titulo: ciudad?.nombre ?? "Guayaquil", abajo: "Dónde comer, dormir y pasear" });
}
