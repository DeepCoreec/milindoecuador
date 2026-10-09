import "server-only";
import { configSupabase } from "@/lib/supabase/config";

/*
 * Configuración de Paumi (versión 3, fase 14). Todo sale de variables de entorno SOLO del servidor:
 *   PAUMI_ACTIVO=si            interruptor (sin esto, Paumi no aparece ni responde)
 *   ANTHROPIC_API_KEY          clave de la Consola de Anthropic (con tope de gasto puesto allá)
 *   PAUMI_MODELO               por defecto Claude Haiku 4.5
 *   PAUMI_BUSQUEDA_WEB=si      deja que busque en fuentes confiables de internet (cuesta un poco más)
 *   PAUMI_MAX_PERSONA          mensajes por persona al día (por defecto 25)
 *   PAUMI_MAX_DIA              mensajes en total al día (por defecto 400)
 *   PAUMI_API_URL              solo para pruebas (un servidor falso); en producción, la API de Anthropic
 */

export function paumiActivo(): boolean {
  return process.env.PAUMI_ACTIVO === "si" && !!process.env.ANTHROPIC_API_KEY && !!configSupabase();
}

const entero = (v: string | undefined, porDefecto: number, max: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : porDefecto;
};

export function configPaumi() {
  return {
    clave: process.env.ANTHROPIC_API_KEY ?? "",
    modelo: process.env.PAUMI_MODELO || "claude-haiku-4-5-20251001",
    url: process.env.NODE_ENV !== "production" && process.env.PAUMI_API_URL ? process.env.PAUMI_API_URL : "https://api.anthropic.com",
    busquedaWeb: process.env.PAUMI_BUSQUEDA_WEB === "si",
    maxPersona: entero(process.env.PAUMI_MAX_PERSONA, 25, 200),
    maxDia: entero(process.env.PAUMI_MAX_DIA, 400, 20000),
  };
}

/** Fuentes en las que Paumi puede buscar en internet (si la búsqueda está activa). */
export const FUENTES_CONFIABLES = [
  "turismo.gob.ec",
  "ecuador.travel",
  "guayaquil.gob.ec",
  "galapagos.gob.ec",
  "ambiente.gob.ec",
  "inec.gob.ec",
  "es.wikipedia.org",
];
