import type { Ubicacion } from "@/lib/ubicacion";

/*
 * Recorridos de los guías (versión 13, 42.3): el mapa en Google Maps con las paradas en orden y el mensaje de WhatsApp
 * para pedir el recorrido. Funciones puras (se prueban sin navegador).
 */

const FORMATO_WHATSAPP = /^593\d{9}$/;
const punto = (u: Ubicacion) => `${u.lat.toFixed(6)},${u.lng.toFixed(6)}`;

/** Google Maps a pie, de la primera a la última parada, pasando por las del medio en orden. */
export function enlaceMapaRecorrido(paradas: Ubicacion[]): string | null {
  if (paradas.length < 2) return null;
  const p = new URLSearchParams({ api: "1", origin: punto(paradas[0]!), destination: punto(paradas.at(-1)!), travelmode: "walking" });
  const medio = paradas.slice(1, -1);
  if (medio.length) p.set("waypoints", medio.map(punto).join("|"));
  return `https://www.google.com/maps/dir/?${p.toString()}`;
}

/** "sábado 7 de noviembre" a partir de "2026-11-07" (sin cambiar de día por la zona horaria). */
export function fechaEnPalabras(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  if (Number.isNaN(d.getTime()) || d.getUTCDate() !== Number(m[3])) return null;
  return new Intl.DateTimeFormat("es-EC", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(d);
}

/** El mensaje para pedir el recorrido por WhatsApp, con la fecha y las personas ya escritas. */
export function mensajePedido(recorrido: string, fecha: string, personas: number): string {
  const dia = fechaEnPalabras(fecha);
  const n = Math.min(50, Math.max(1, Math.round(personas) || 1));
  const quienes = n === 1 ? "1 persona" : `${n} personas`;
  return `Hola, vi su recorrido «${recorrido}» en Mi Lindo Ecuador. Quisiera pedirlo${dia ? ` para el ${dia}` : ""}, para ${quienes}. ¿Está disponible?`;
}

export function enlacePedido(numero: string | null, recorrido: string, fecha: string, personas: number): string | null {
  if (!numero || !FORMATO_WHATSAPP.test(numero)) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensajePedido(recorrido, fecha, personas))}`;
}

/** "15 $ por persona" o "Precio a convenir". */
export function textoPrecio(precio: number | null): string {
  if (precio === null) return "Precio a convenir";
  if (precio === 0) return "Gratis (propina voluntaria)";
  const n = Number.isInteger(precio) ? String(precio) : precio.toFixed(2);
  return `${n} $ por persona`;
}
