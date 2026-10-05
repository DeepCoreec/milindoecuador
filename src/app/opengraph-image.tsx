import { TAMANO_OG, tarjetaOg } from "./_og/tarjeta";

export const size = TAMANO_OG;
export const contentType = "image/png";
export const alt = "Mi Lindo Ecuador: la guía de Guayaquil hecha por su gente";

/** Imagen general del sitio al compartir el inicio o cualquier página sin imagen propia. */
export default async function Image() {
  return tarjetaOg({ arriba: "Guayaquil", titulo: "La guía de Guayaquil hecha por su gente", abajo: "Dónde comer, dormir y pasear" });
}
