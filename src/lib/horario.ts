/*
 * Horario por día y "Abierto ahora / Cerrado" (versión 2, paso 10.1). Siempre en hora de Ecuador.
 * Forma guardada (columna opening_hours): {"lun": ["08:00", "22:00"], "dom": ["10:00", "02:00"]}.
 * Un día que no aparece = cerrado. Cierre menor que apertura = cierra después de medianoche.
 * Apertura igual al cierre = abierto las 24 horas.
 */

export const DIAS = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const;
export type Dia = (typeof DIAS)[number];
export type Horario = Partial<Record<Dia, [string, string]>>;

export const NOMBRE_DIA: Record<Dia, string> = { lun: "Lunes", mar: "Martes", mie: "Miércoles", jue: "Jueves", vie: "Viernes", sab: "Sábado", dom: "Domingo" };
const CORTO: Record<Dia, string> = { lun: "Lun", mar: "Mar", mie: "Mié", jue: "Jue", vie: "Vie", sab: "Sáb", dom: "Dom" };

export const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

/** Lee lo que viene de la base; cualquier cosa rara se ignora (no rompe la ficha). */
export function leerHorario(valor: unknown): Horario | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const h: Horario = {};
  for (const d of DIAS) {
    const r = (valor as Record<string, unknown>)[d];
    if (Array.isArray(r) && r.length === 2 && typeof r[0] === "string" && typeof r[1] === "string" && HORA.test(r[0]) && HORA.test(r[1])) h[d] = [r[0], r[1]];
  }
  return Object.keys(h).length ? h : null;
}

/** Día de la semana y minuto del día en Guayaquil. */
export function ahoraEnEcuador(fecha: Date): { dia: Dia; minuto: number } {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: "America/Guayaquil", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(fecha);
  const valor = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const indice = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(valor("weekday"));
  return { dia: DIAS[indice < 0 ? 0 : indice]!, minuto: Number(valor("hour")) * 60 + Number(valor("minute")) };
}

/** "8:00", "22:30" (sin cero adelante, como se dice en Ecuador). */
const bonita = (h: string) => h.replace(/^0(\d)/, "$1");

export type EstadoAhora = { abierto: boolean; texto: string };

export function estadoAhora(horario: Horario, fecha: Date): EstadoAhora {
  const { dia, minuto } = ahoraEnEcuador(fecha);
  const i = DIAS.indexOf(dia);
  const hoy = horario[dia];
  const ayer = horario[DIAS[(i + 6) % 7]!];

  if (hoy) {
    const [a, c] = hoy.map(minutos) as [number, number];
    if (a === c) return { abierto: true, texto: "Abierto las 24 horas" };
    if ((c > a && minuto >= a && minuto < c) || (c < a && minuto >= a)) return { abierto: true, texto: `Abierto · cierra a las ${bonita(hoy[1])}` };
  }
  if (ayer) {
    const [a, c] = ayer.map(minutos) as [number, number];
    if (c < a && minuto < c) return { abierto: true, texto: `Abierto · cierra a las ${bonita(ayer[1])}` };
  }
  // Cerrado: ¿cuándo abre?
  if (hoy && minuto < minutos(hoy[0])) return { abierto: false, texto: `Cerrado · abre a las ${bonita(hoy[0])}` };
  for (let k = 1; k <= 7; k++) {
    const d = DIAS[(i + k) % 7]!;
    const r = horario[d];
    if (r) return { abierto: false, texto: `Cerrado · abre ${k === 1 ? "mañana" : `el ${NOMBRE_DIA[d].toLowerCase()}`} a las ${bonita(r[0])}` };
  }
  return { abierto: false, texto: "Cerrado" };
}

/** Resumen para la ficha, juntando días seguidos con el mismo horario: "Lun a vie: 8:00 – 22:00". */
export function resumenHorario(horario: Horario): string[] {
  const lineas: string[] = [];
  let i = 0;
  while (i < DIAS.length) {
    const d = DIAS[i]!;
    const r = horario[d];
    let j = i;
    while (j + 1 < DIAS.length && JSON.stringify(horario[DIAS[j + 1]!]) === JSON.stringify(r)) j++;
    const dias = i === j ? CORTO[d] : `${CORTO[d]} a ${CORTO[DIAS[j]!].toLowerCase()}`;
    lineas.push(`${dias}: ${!r ? "cerrado" : r[0] === r[1] ? "24 horas" : `${bonita(r[0])} – ${bonita(r[1])}`}`);
    i = j + 1;
  }
  return lineas;
}
