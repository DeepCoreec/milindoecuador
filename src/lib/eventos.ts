/*
 * Eventos de la ciudad (versión 5, fase 22): fechas en hora de Guayaquil, grupos de la página y calendario.
 * Ecuador continental no cambia de hora en el año: siempre UTC−5. Por eso las cuentas se hacen con ese corrimiento
 * fijo (sin depender de la zona horaria del servidor ni del navegador).
 */

export const TIPOS_EVENTO = {
  concierto: "Conciertos",
  feria: "Ferias",
  deporte: "Deporte",
  cultura: "Cultura",
  gastronomia: "Gastronomía",
  fiesta: "Fiestas del barrio",
  curso: "Cursos y talleres",
  otro: "Otros",
} as const;
export type TipoEvento = keyof typeof TIPOS_EVENTO;
/** Nombre de un solo evento, para tarjetas y fichas. */
export const TIPO_SINGULAR: Record<TipoEvento, string> = {
  concierto: "Concierto",
  feria: "Feria",
  deporte: "Deporte",
  cultura: "Cultura",
  gastronomia: "Gastronomía",
  fiesta: "Fiesta del barrio",
  curso: "Curso o taller",
  otro: "Evento",
};
export const LISTA_TIPOS = Object.keys(TIPOS_EVENTO) as TipoEvento[];

const CORRIMIENTO = 5 * 3600_000;
const DIA = 24 * 3600_000;

/** "2026-10-17T19:30" escrito en Guayaquil → instante real. null si no tiene ese formato. */
export function desdeHoraLocal(texto: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(texto)) return null;
  const d = new Date(`${texto}:00-05:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Instante → "2026-10-17T19:30" en hora de Guayaquil (para llenar los campos del formulario). */
export function aHoraLocal(d: Date | string): string {
  return new Date(new Date(d).getTime() - CORRIMIENTO).toISOString().slice(0, 16);
}

/** Día de Guayaquil ("2026-10-17") de un instante. */
export function diaGye(d: Date | string): string {
  return aHoraLocal(d).slice(0, 10);
}

function sumarDias(dia: string, n: number): string {
  return new Date(Date.parse(`${dia}T00:00:00Z`) + n * DIA).toISOString().slice(0, 10);
}

/** El fin de semana que viene (o el actual, si hoy es sábado o domingo): [sábado, domingo]. */
export function finDeSemana(ahora: Date): [string, string] {
  const hoy = diaGye(ahora);
  const dia = new Date(`${hoy}T00:00:00Z`).getUTCDay(); // 0 = domingo
  const sabado = dia === 0 ? sumarDias(hoy, -1) : sumarDias(hoy, 6 - dia);
  return [sabado, sumarDias(sabado, 1)];
}

type ConFechas = { inicio: string; fin: string };

/** ¿Se ve todavía? Hasta el final del día de su fecha de fin (igual que `evento_vigente` en la base). */
export function vigente(e: Pick<ConFechas, "fin">, ahora = new Date()): boolean {
  return diaGye(e.fin) >= diaGye(ahora);
}

/** Separa en "Hoy", "Este fin de semana" y "Próximos" (sin repetir), en orden de inicio. Los vencidos se quitan. */
export function agruparEventos<T extends ConFechas>(eventos: T[], ahora = new Date()): { hoy: T[]; finDeSemana: T[]; proximos: T[] } {
  const hoy = diaGye(ahora);
  const [sab, dom] = finDeSemana(ahora);
  const grupos = { hoy: [] as T[], finDeSemana: [] as T[], proximos: [] as T[] };
  const ordenados = [...eventos].filter((e) => vigente(e, ahora)).sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
  for (const e of ordenados) {
    const desde = diaGye(e.inicio);
    const hasta = diaGye(e.fin);
    if (desde <= hoy && hasta >= hoy) grupos.hoy.push(e);
    else if (desde <= dom && hasta >= sab) grupos.finDeSemana.push(e);
    else grupos.proximos.push(e);
  }
  return grupos;
}

/** Los que empiezan en los próximos 7 días (o ya empezaron y siguen), para la franja de la portada. */
export function deEstaSemana<T extends ConFechas>(eventos: T[], ahora = new Date(), maximo = 4): T[] {
  const tope = diaGye(new Date(ahora.getTime() + 7 * DIA));
  return eventos.filter((e) => vigente(e, ahora) && diaGye(e.inicio) <= tope).slice(0, maximo);
}

const fmtDia = new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", weekday: "long", day: "numeric", month: "long" });
const fmtDiaCorto = new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "long" });
const fmtHora = new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", hour: "2-digit", minute: "2-digit", hour12: false });

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** "Sábado 17 de octubre, de 19:00 a 23:00" o "Del 17 de octubre (19:00) al 20 de octubre (22:00)". */
export function textoFechas(inicio: string, fin: string): string {
  const a = new Date(inicio);
  const b = new Date(fin);
  if (diaGye(a) === diaGye(b)) return `${mayuscula(fmtDia.format(a).replace(",", ""))}, de ${fmtHora.format(a)} a ${fmtHora.format(b)}`;
  return `Del ${fmtDiaCorto.format(a)} (${fmtHora.format(a)}) al ${fmtDiaCorto.format(b)} (${fmtHora.format(b)})`;
}

/** Fecha corta para tarjetas: "17 oct" o "17 oct – 20 oct". */
export function textoFechaCorta(inicio: string, fin: string): string {
  const f = new Intl.DateTimeFormat("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "short" });
  const a = f.format(new Date(inicio)).replace(".", "");
  const b = f.format(new Date(fin)).replace(".", "");
  return a === b ? a : `${a} – ${b}`;
}

export function textoPrecio(precio: number | null): string {
  if (precio == null) return "Gratis";
  return `$${precio.toFixed(2).replace(/\.00$/, "")}`;
}

/** Fecha para calendarios: 20261017T003000Z */
const fechaCal = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

type ParaCalendario = ConFechas & { titulo: string; lugar: string; url: string };

/** Enlace "Agregar a Google Calendar" (abre el formulario lleno; no pide permisos). */
export function enlaceCalendarioGoogle(e: ParaCalendario): string {
  const p = new URLSearchParams({ action: "TEMPLATE", text: e.titulo, dates: `${fechaCal(e.inicio)}/${fechaCal(e.fin)}`, details: e.url, location: e.lugar, ctz: "America/Guayaquil" });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** Archivo .ics (iPhone, Outlook y casi cualquier calendario). Escapa lo que el formato exige. */
export function textoIcs(e: ParaCalendario & { id: string }): string {
  const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mi Lindo Ecuador//Eventos//ES",
    "BEGIN:VEVENT",
    `UID:${e.id}@milindoecuador`,
    `DTSTAMP:${fechaCal(new Date().toISOString())}`,
    `DTSTART:${fechaCal(e.inicio)}`,
    `DTEND:${fechaCal(e.fin)}`,
    `SUMMARY:${esc(e.titulo)}`,
    `LOCATION:${esc(e.lugar)}`,
    `URL:${e.url}`,
    `DESCRIPTION:${esc(e.url)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
