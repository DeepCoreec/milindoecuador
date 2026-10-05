import { TAMANO_OG, tarjetaOg } from "@/app/_og/tarjeta";
import { getCiudad, getLugar } from "@/lib/datos/lugares";

export const size = TAMANO_OG;
export const contentType = "image/png";
export const alt = "Tarjeta del lugar en Mi Lindo Ecuador";

const formato = new Intl.NumberFormat("es-EC", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Imagen que acompaña el enlace de una ficha cuando se comparte. */
export default async function Image({ params }: { params: Promise<{ ciudad: string; categoria: string; lugar: string }> }) {
  const p = await params;
  const [ciudad, lugar] = await Promise.all([getCiudad(p.ciudad), getLugar(p.ciudad, p.categoria, p.lugar)]);
  if (!ciudad || !lugar) {
    return tarjetaOg({ arriba: "Guayaquil", titulo: "La guía de Guayaquil hecha por su gente" });
  }
  const conNota = lugar.promedio !== null && lugar.cantidad > 0;
  return tarjetaOg({
    arriba: lugar.ejemplo ? `Ejemplo · ${lugar.datos}` : lugar.datos,
    titulo: lugar.nombre,
    conEstrella: conNota,
    abajo: conNota
      ? `${formato.format(lugar.promedio!)}  (${lugar.cantidad === 1 ? "1 reseña" : `${lugar.cantidad} reseñas`})`
      : (lugar.extra ?? ciudad.nombre),
  });
}
