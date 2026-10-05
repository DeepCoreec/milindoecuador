/*
 * Textos que la base no guarda y la página necesita: cómo se dice cada categoría en singular,
 * su frase de presentación y cómo se nombra cada sector en una frase ("en el centro").
 */

const SINGULAR: Record<string, string> = {
  restaurantes: "Restaurante",
  hoteles: "Hotel",
  turismo: "Lugar turístico",
  ejercicio: "Lugar para hacer ejercicio",
  paseos: "Paseo",
  cafes: "Café",
  "vida-nocturna": "Vida nocturna",
  museos: "Museo",
  compras: "Compras",
  ninos: "Plan para niños",
  naturaleza: "Naturaleza",
};

/** Sectores que en una frase llevan artículo: "en el centro", "en la Alborada". */
const EN_SECTOR: Record<string, string> = { Centro: "el centro", Alborada: "la Alborada", Sur: "el sur", Norte: "el norte" };

/** "Restaurante en Urdesa", "Lugar turístico en el centro". */
export function datosDe(categoria: string, sector: string): string {
  return `${SINGULAR[categoria] ?? "Lugar"} en ${EN_SECTOR[sector] ?? sector}`;
}

export const TEXTO_CATEGORIA: Record<string, { nombreCorto?: string; bajada: string }> = {
  restaurantes: { bajada: "Encebollado, cangrejo, ceviche y mucho más. Ordenados con los destacados primero." },
  hoteles: { bajada: "Hostales, hoteles y casas para quedarte, cerca de lo que quieres ver." },
  turismo: { nombreCorto: "Turismo", bajada: "Lo que no te puedes perder en Guayaquil, del Malecón al Cerro Santa Ana." },
  ejercicio: { nombreCorto: "Ejercicio", bajada: "Parques para correr, ciclovías, canchas y gimnasios." },
  paseos: { nombreCorto: "Paseos", bajada: "Malecones, parques y miradores para caminar sin apuro." },
  cafes: { bajada: "Un café, un bolón o un helado para la tarde." },
  "vida-nocturna": { bajada: "Bares, música en vivo y dónde salir de noche." },
  museos: { bajada: "Museos, galerías y la historia de la ciudad." },
  compras: { bajada: "Mercados, artesanías y centros comerciales." },
  ninos: { bajada: "Planes para ir con los más pequeños." },
  naturaleza: { bajada: "Manglares, bosques secos y aire libre cerca de la ciudad." },
};
