"use server";

import { obtenerUsuario } from "@/lib/auth";
import { expandirEnlaceMaps } from "@/lib/enlaceCorto";
import { enEcuador, leerUbicacion, textoUbicacion } from "@/lib/ubicacion";

/**
 * Convierte el enlace corto de "Compartir" de Google Maps en coordenadas (versión 3, paso 12.1).
 * Solo con sesión (lo usan Mi negocio y el panel): así nadie usa nuestro servidor para abrir enlaces.
 */
export async function convertirEnlaceMaps(texto: string): Promise<{ ubicacion: string } | { error: string }> {
  if (typeof texto !== "string" || texto.length > 300) return { error: "Enlace inválido" };
  if (!(await obtenerUsuario())) return { error: "Tu sesión se cerró. Entra otra vez a tu cuenta." };
  const largo = await expandirEnlaceMaps(texto);
  const u = largo ? leerUbicacion(largo) : null;
  if (!u || u === "invalida")
    return { error: "No pudimos sacar el punto de ese enlace. En Google Maps deja presionado el lugar y copia los números que salen arriba." };
  if (!enEcuador(u)) return { error: "Ese punto queda fuera de Ecuador. Revisa el enlace." };
  return { ubicacion: textoUbicacion(u) };
}

/** Para las acciones que guardan la ficha: si pegaron un enlace corto, lo cambia por sus coordenadas. */
export async function ubicacionSinEnlaceCorto(texto: string): Promise<string> {
  const r = await convertirEnlaceMaps(texto);
  return "ubicacion" in r ? r.ubicacion : texto;
}
