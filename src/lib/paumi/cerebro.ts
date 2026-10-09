import "server-only";
import { getCategorias } from "@/lib/datos/lugares";
import { configPaumi, FUENTES_CONFIABLES } from "./config";
import { DEFINICIONES, ejecutar, type Estado } from "./herramientas";
import { instrucciones } from "./personaje";
import type { MensajePaumi, RespuestaPaumi } from "./tipos";

/*
 * El "cerebro" de Paumi (versión 3, paso 14.1): habla con la API de Anthropic (Claude Haiku) directamente con fetch,
 * sin librerías nuevas. Ciclo: la IA responde o pide usar una herramienta → el servidor la ejecuta (solo lectura de lo
 * público) → se le devuelve el resultado → hasta 5 vueltas. La respuesta final es SOLO texto: la página la muestra
 * como texto (nunca como HTML), y las tarjetas las arma el servidor.
 */

type Bloque = { type: string; [k: string]: unknown };
type MensajeApi = { role: "user" | "assistant"; content: string | Bloque[] };

export class ErrorPaumi extends Error {}

const VUELTAS = 5;

/** Convierte el historial de la página al formato de la API: empieza con la persona y alterna. */
export function aMensajesApi(historial: MensajePaumi[]): MensajeApi[] {
  const salida: MensajeApi[] = [];
  for (const m of historial) {
    const role = m.rol === "usuario" ? "user" : "assistant";
    if (!salida.length && role === "assistant") continue; // el saludo de Paumi no se manda
    const ultimo = salida.at(-1);
    if (ultimo && ultimo.role === role) ultimo.content = `${ultimo.content as string}\n${m.texto}`;
    else salida.push({ role, content: m.texto });
  }
  return salida;
}

/** Texto plano: sin marcas de formato que la página mostraría tal cual. */
export function limpiarTexto(t: string): string {
  return t
    .replace(/\*\*?|__|`|#{1,6} /g, "")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 1200);
}

export async function conversar(historial: MensajePaumi[]): Promise<RespuestaPaumi> {
  const c = configPaumi();
  const categorias = (await getCategorias()).map(({ slug, nombre }) => ({ slug, nombre }));
  const estado: Estado = { vistos: new Set(), tarjetas: [], navegar: null, categorias: new Set(categorias.map((x) => x.slug)) };
  const herramientas: unknown[] = [...DEFINICIONES];
  if (c.busquedaWeb) herramientas.push({ type: "web_search_20250305", name: "web_search", max_uses: 2, allowed_domains: FUENTES_CONFIABLES });

  const mensajes = aMensajesApi(historial);
  if (!mensajes.length || mensajes.at(-1)!.role !== "user") throw new ErrorPaumi("Conversación inválida");
  let texto = "";
  const fuentes = new Map<string, string>();

  for (let vuelta = 0; vuelta < VUELTAS; vuelta++) {
    const r = await fetch(`${c.url}/v1/messages`, {
      method: "POST",
      headers: { "x-api-key": c.clave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: c.modelo, max_tokens: 700, system: instrucciones(categorias, c.busquedaWeb), messages: mensajes, tools: herramientas }),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    if (!r.ok) throw new ErrorPaumi(`La API respondió ${r.status}`);
    const datos = (await r.json()) as { content?: Bloque[]; stop_reason?: string };
    const bloques = Array.isArray(datos.content) ? datos.content : [];
    mensajes.push({ role: "assistant", content: bloques });

    texto = bloques
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("");
    for (const b of bloques) {
      if (b.type !== "text" || !Array.isArray(b.citations)) continue;
      for (const cita of b.citations as { url?: unknown; title?: unknown }[]) {
        if (typeof cita.url !== "string") continue;
        try {
          const u = new URL(cita.url);
          if (u.protocol === "https:" && FUENTES_CONFIABLES.some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`)))
            fuentes.set(u.toString(), typeof cita.title === "string" ? cita.title.slice(0, 120) : u.hostname);
        } catch {}
      }
    }

    if (datos.stop_reason === "pause_turn") continue; // la búsqueda web sigue en la próxima vuelta
    if (datos.stop_reason !== "tool_use") break;
    const resultados: Bloque[] = [];
    for (const b of bloques) {
      if (b.type !== "tool_use" || typeof b.id !== "string" || typeof b.name !== "string") continue;
      const { resultado, error } = await ejecutar(b.name, b.input, estado);
      resultados.push({ type: "tool_result", tool_use_id: b.id, content: JSON.stringify(resultado), ...(error ? { is_error: true } : {}) });
    }
    if (!resultados.length) break;
    mensajes.push({ role: "user", content: resultados });
  }

  const final = limpiarTexto(texto);
  return {
    texto: final || "Uy, me enredé las plumas 🦜. ¿Me lo preguntas de otra forma?",
    lugares: estado.tarjetas,
    navegar: estado.navegar,
    fuentes: [...fuentes].slice(0, 3).map(([url, titulo]) => ({ url, titulo })),
  };
}
