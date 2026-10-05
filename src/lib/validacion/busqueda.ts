import { z } from "zod";

/*
 * Texto del buscador (?q=…). Llega desde la dirección, así que se valida:
 * se recortan espacios y se aceptan de 2 a 80 caracteres. Lo demás se trata como "sin búsqueda".
 */
const esquema = z.object({ q: z.string().trim().min(2).max(80).optional().catch(undefined) });

export function leerBusqueda(entrada: Record<string, string | string[] | undefined>): string | null {
  return esquema.parse(entrada).q ?? null;
}

/** Para comparar sin importar mayúsculas ni tildes: "Malecón" y "malecon" son lo mismo. */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}
