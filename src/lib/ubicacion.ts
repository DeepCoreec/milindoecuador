/*
 * Ubicación exacta de un lugar (versión 2, fase 7), sin API de pago.
 * Se guarda latitud y longitud; se escribe pegando lo que da Google Maps o con "Usar mi ubicación actual".
 */

export type Ubicacion = { lat: number; lng: number };

/** Mismos límites que la base (migración 0004): Ecuador continental y Galápagos. */
export function enEcuador({ lat, lng }: Ubicacion): boolean {
  return lat >= -5.1 && lat <= 1.7 && lng >= -92.1 && lng <= -75.1;
}

const NUM = String.raw`(-?\d{1,3}(?:\.\d+)?)`;

/**
 * Lee una ubicación de lo que pegue la persona:
 * - coordenadas, como las copia Google Maps al dejar presionado un punto: "-2.189400, -79.880800";
 * - un enlace largo de Google Maps (con "!3d…!4d…", "@lat,lng", "q=lat,lng", "query=…" o "destination=…").
 * Devuelve null si está vacío y "invalida" si no se entiende. Un enlace corto maps.app.goo.gl no trae las
 * coordenadas escritas: primero lo abre el servidor (`expandirEnlaceMaps`, versión 3) y después se lee aquí.
 */
export function leerUbicacion(texto: string): Ubicacion | null | "invalida" {
  const t = texto.trim();
  if (!t) return null;
  if (t.length > 2000) return "invalida";
  let decodificado = t;
  try {
    decodificado = decodeURIComponent(t);
  } catch {}
  const patrones = [
    new RegExp(String.raw`!3d${NUM}!4d${NUM}`), // el pin del lugar, más exacto que la cámara
    new RegExp(String.raw`[?&](?:q|query|destination|ll|daddr)=${NUM},\s*${NUM}`),
    new RegExp(String.raw`@${NUM},${NUM}`),
    new RegExp(String.raw`^${NUM}\s*[,;\s]\s*${NUM}$`),
  ];
  for (const p of patrones) {
    const m = decodificado.match(p);
    if (m) {
      const u = { lat: Number(m[1]), lng: Number(m[2]) };
      if (Number.isFinite(u.lat) && Number.isFinite(u.lng) && Math.abs(u.lat) <= 90 && Math.abs(u.lng) <= 180) return redondear(u);
    }
  }
  return "invalida";
}

/** El enlace corto que da "Compartir" en Google Maps (versión 3, paso 12.1): maps.app.goo.gl/… o goo.gl/maps/… */
export function esEnlaceCorto(texto: string): boolean {
  return /^(?:https?:\/\/)?(?:maps\.app\.goo\.gl|goo\.gl\/maps)\/[A-Za-z0-9_-]{4,40}\/?(?:\?[\w=&%.-]{0,200})?$/.test(texto.trim());
}

/** 6 decimales ≈ 10 cm: lo que guarda la base. */
function redondear({ lat, lng }: Ubicacion): Ubicacion {
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

/** "-2.189400, -79.880800", el mismo formato que copia Google Maps. */
export function textoUbicacion(u: Ubicacion | null): string {
  return u ? `${u.lat.toFixed(6)}, ${u.lng.toFixed(6)}` : "";
}

/** Abre Google Maps (la app en el celular) con la ruta trazada desde donde está la persona. */
export function enlaceRutaGoogle(u: Ubicacion): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${u.lat},${u.lng}`;
}

/** Abre Waze con la ruta lista para empezar. */
export function enlaceRutaWaze(u: Ubicacion): string {
  return `https://waze.com/ul?ll=${u.lat},${u.lng}&navigate=yes`;
}

/** Para revisar en el panel que el punto está bien puesto. */
export function enlaceVerEnMapa(u: Ubicacion): string {
  return `https://www.google.com/maps/search/?api=1&query=${u.lat},${u.lng}`;
}
