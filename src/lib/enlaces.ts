/*
 * Enlaces hacia afuera: WhatsApp y Google Maps.
 * Todo texto que entra en una dirección va con encodeURIComponent, y el número se revisa
 * con el mismo formato que exige la base (593 y 9 dígitos), para que nadie pueda colar otra cosa.
 */

const FORMATO_WHATSAPP = /^593\d{9}$/;

/** Enlace a WhatsApp con un saludo ya escrito. Si el número no es válido, no hay enlace. */
export function enlaceWhatsApp(numero: string | null, nombreLugar: string): string | null {
  if (!numero || !FORMATO_WHATSAPP.test(numero)) return null;
  const saludo = `Hola, los encontré en Mi Lindo Ecuador y quisiera más información sobre ${nombreLugar}.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(saludo)}`;
}

/** 593986225038 → "+593 98 622 5038" */
export function mostrarWhatsApp(numero: string): string {
  const m = /^593(\d{2})(\d{3})(\d{4})$/.exec(numero);
  return m ? `+593 ${m[1]} ${m[2]} ${m[3]}` : numero;
}

/** Búsqueda en Google Maps con el nombre, la dirección y la ciudad. */
export function enlaceComoLlegar(nombre: string, direccion: string | null, ciudad: string): string {
  const consulta = [nombre, direccion, ciudad, "Ecuador"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
}

const formatoFecha = new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Guayaquil" });

/** "2026-09-12T19:00:00Z" → "12 de septiembre de 2026", en hora de Ecuador. */
export function fechaLarga(iso: string): string {
  return formatoFecha.format(new Date(iso));
}
