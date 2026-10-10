import "server-only";
import { configSupabase } from "@/lib/supabase/config";

/*
 * Configuración de Paumi (versión 3, fase 14). Todo sale de variables de entorno SOLO del servidor:
 *   PAUMI_ACTIVO=si            interruptor (sin esto, Paumi no aparece ni responde)
 *   ANTHROPIC_API_KEY          clave de la Consola de Anthropic (con tope de gasto puesto allá)
 *   PAUMI_MODELO               por defecto Claude Haiku 4.5
 *   PAUMI_BUSQUEDA_WEB=no      apaga la búsqueda en fuentes confiables de internet (viene encendida; cuesta un poco más)
 *   PAUMI_MAX_PERSONA          mensajes por persona al día (por defecto 25)
 *   PAUMI_MAX_DIA              mensajes en total al día (por defecto 400)
 *   PAUMI_API_URL              solo para pruebas (un servidor falso); en producción, la API de Anthropic
 */

export function paumiActivo(): boolean {
  return process.env.PAUMI_ACTIVO === "si" && !!process.env.ANTHROPIC_API_KEY && !!configSupabase();
}

const simulador = () => process.env.NODE_ENV !== "production" && !!process.env.PAUMI_API_URL;

const entero = (v: string | undefined, porDefecto: number, max: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : porDefecto;
};

export function configPaumi() {
  return {
    // Con el simulador (solo fuera de producción) NUNCA se manda la clave real
    clave: simulador() ? "clave-de-prueba" : (process.env.ANTHROPIC_API_KEY ?? ""),
    modelo: process.env.PAUMI_MODELO || "claude-haiku-4-5-20251001",
    url: simulador() ? process.env.PAUMI_API_URL! : "https://api.anthropic.com",
    // Encendida salvo que se apague con PAUMI_BUSQUEDA_WEB=no (así Paumi no se queda corta cuando la guía no tiene algo)
    busquedaWeb: process.env.PAUMI_BUSQUEDA_WEB !== "no",
    maxPersona: entero(process.env.PAUMI_MAX_PERSONA, 25, 200),
    maxDia: entero(process.env.PAUMI_MAX_DIA, 400, 20000),
  };
}

/** Fuentes en las que Paumi puede buscar en internet (si la búsqueda está activa); solo de estas se muestran enlaces. */
export const FUENTES_CONFIABLES = [
  "turismo.gob.ec",
  "ecuador.travel",
  "guayaquil.gob.ec",
  "galapagos.gob.ec",
  "ambiente.gob.ec",
  "inec.gob.ec",
  // Para ofrecer lugares que todavía no están en la guía: turismo oficial de Guayaquil, reseñas y prensa del país
  "guayaquilesmidestino.com",
  "tripadvisor.com",
  "tripadvisor.es",
  "tripadvisor.com.mx",
  "tripadvisor.co",
  "booking.com",
  "restaurantguru.com",
  "foursquare.com",
  "minube.com",
  "lonelyplanet.com",
  "eluniverso.com",
  "expreso.ec",
  "extra.ec",
  "primicias.ec",
  "elcomercio.com",
  "eltelegrafo.com.ec",
  "metroecuador.com.ec",
  "lahora.com.ec",
  "vistazo.com",
  "gk.city",
  "ecuavisa.com",
  "teleamazonas.com",
];
