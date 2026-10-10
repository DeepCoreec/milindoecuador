import { z } from "zod";
import { desdeHoraLocal, LISTA_TIPOS } from "@/lib/eventos";
import { normalizarCelular } from "@/lib/validacion/negocios";

/*
 * Formulario de eventos (versión 5, fase 22). Se valida en el servidor aunque la página ya lo haya revisado.
 * Las fechas llegan como las escribe el campo del navegador ("2026-10-17T19:30") y se leen en hora de Guayaquil.
 */

const sinInvisibles = (v: string) => !/[\p{Cc}\p{Cf}]/u.test(v.replace(/\r?\n/g, ""));
const texto = (min: number, max: number, vacio: string) =>
  z
    .string()
    .trim()
    .min(min, vacio)
    .max(max, `Máximo ${max} caracteres`)
    .refine(sinInvisibles, "Usa solo letras, números y signos comunes");
const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .refine(sinInvisibles, "Usa solo letras, números y signos comunes")
    .optional()
    .default("");

/** Página web o de entradas: se acepta "www.algo.com" (se le pone https://); http se pasa a https. */
export function normalizarWeb(valor: string): string | null {
  const t = valor.trim();
  if (!t) return "";
  const con = /^https?:\/\//i.test(t) ? t.replace(/^http:/i, "https:") : `https://${t}`;
  try {
    const u = new URL(con);
    if (u.protocol !== "https:" || !u.hostname.includes(".") || u.username || u.password) return null;
    return u.toString().slice(0, 300);
  } catch {
    return null;
  }
}

const web = z
  .string()
  .max(300, "Máximo 300 caracteres")
  .optional()
  .default("")
  .transform((v, ctx) => {
    const n = normalizarWeb(v);
    if (n == null) ctx.addIssue({ code: "custom", message: "Pega el enlace completo, por ejemplo https://mipagina.com" });
    return n ?? "";
  });

const fecha = z.string().transform((v, ctx) => {
  const d = desdeHoraLocal(v);
  if (!d) ctx.addIssue({ code: "custom", message: "Elige la fecha y la hora" });
  return d ?? new Date(0);
});

const DIA = 24 * 3600_000;

export const esquemaEvento = z
  .object({
    titulo: texto(3, 120, "Escribe el nombre del evento"),
    tipo: z.enum(LISTA_TIPOS, { error: "Elige el tipo de evento" }),
    descripcion: texto(20, 3000, "Cuenta de qué se trata (mínimo 20 caracteres)"),
    inicio: fecha,
    fin: fecha,
    enLinea: z.literal("on").optional(),
    lugar: opcional(120),
    direccion: opcional(200),
    ubicacion: opcional(300),
    gratis: z.literal("on").optional(),
    precio: z.string().trim().max(10).optional().default(""),
    organizador: texto(2, 120, "Escribe quién lo organiza"),
    whatsapp: z
      .string()
      .optional()
      .default("")
      .transform((v, ctx) => {
        if (!v.trim()) return null;
        const n = normalizarCelular(v);
        if (!n) ctx.addIssue({ code: "custom", message: "Escribe un celular de Ecuador, por ejemplo 099 123 4567" });
        return n;
      }),
    web,
    entradas: web,
    edad: z
      .string()
      .trim()
      .optional()
      .default("")
      .refine((v) => v === "" || (/^\d{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= 21), "Escribe una edad entre 1 y 21, o déjalo vacío"),
    afiche: z
      .string()
      .optional()
      .default("")
      .refine((v) => v === "" || /^eventos\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg)$/.test(v), "El afiche no es válido"),
    aficheAlt: opcional(200),
  })
  .superRefine((d, ctx) => {
    const ahora = Date.now();
    if (d.fin.getTime() < d.inicio.getTime()) ctx.addIssue({ code: "custom", path: ["fin"], message: "El final tiene que ser después del inicio" });
    else if (d.fin.getTime() - d.inicio.getTime() > 30 * DIA) ctx.addIssue({ code: "custom", path: ["fin"], message: "Un evento puede durar como mucho 30 días" });
    if (d.fin.getTime() > 0 && d.fin.getTime() < ahora) ctx.addIssue({ code: "custom", path: ["fin"], message: "Esa fecha ya pasó" });
    if (d.inicio.getTime() > ahora + 183 * DIA) ctx.addIssue({ code: "custom", path: ["inicio"], message: "Puedes publicar eventos de los próximos 6 meses" });
    if (!d.enLinea && d.lugar.length < 2) ctx.addIssue({ code: "custom", path: ["lugar"], message: "Escribe dónde es (o marca que es en línea)" });
    if (!d.gratis) {
      const p = Number(d.precio.replace(",", "."));
      if (!/^\d{1,5}([.,]\d{1,2})?$/.test(d.precio) || !(p > 0) || p > 10000)
        ctx.addIssue({ code: "custom", path: ["precio"], message: "Escribe el precio en dólares, por ejemplo 5 o 12,50 (o marca que es gratis)" });
    }
    if (d.afiche && d.aficheAlt.length < 3) ctx.addIssue({ code: "custom", path: ["aficheAlt"], message: "Describe el afiche en pocas palabras" });
  })
  .transform((d) => ({
    ...d,
    precio: d.gratis ? null : Number(d.precio.replace(",", ".")),
    edad: d.edad ? Number(d.edad) : null,
    enLinea: d.enLinea === "on",
  }));

export const esquemaEventoNuevo = z.object({ terminos: z.literal("on", { error: "Debes aceptar los términos para publicar" }) });

export const CAMPOS_EVENTO = [
  "titulo",
  "tipo",
  "descripcion",
  "inicio",
  "fin",
  "enLinea",
  "lugar",
  "direccion",
  "ubicacion",
  "gratis",
  "precio",
  "organizador",
  "whatsapp",
  "web",
  "entradas",
  "edad",
  "afiche",
  "aficheAlt",
  "terminos",
] as const;
export type CampoEvento = (typeof CAMPOS_EVENTO)[number];

export const esquemaIdEvento = z.object({ evento: z.uuid() });
export const esquemaSubidaAfiche = z.object({ formato: z.enum(["webp", "jpg"]) });
