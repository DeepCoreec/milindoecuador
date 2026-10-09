import "server-only";
import { esEnlaceCorto } from "@/lib/ubicacion";

/*
 * Abre un enlace corto de Google Maps (maps.app.goo.gl/…) para saber a qué enlace largo lleva (versión 3, paso 12.1).
 * Cuidado (es el servidor el que hace la petición): solo se pide a los dominios de enlaces cortos de Google,
 * sin seguir saltos a otros sitios, con tiempo límite y sin leer el cuerpo. El enlace largo NO se abre: solo se
 * leen de su texto las coordenadas.
 */

const CORTOS = new Set(["maps.app.goo.gl", "goo.gl"]);
const LARGOS = /^(?:www\.|maps\.)?google\.[a-z.]{2,6}$/;

export async function expandirEnlaceMaps(texto: string, pedir: typeof fetch = fetch): Promise<string | null> {
  if (!esEnlaceCorto(texto)) return null;
  let actual = new URL(/^https?:\/\//i.test(texto.trim()) ? texto.trim().replace(/^http:/i, "https:") : `https://${texto.trim()}`);
  for (let salto = 0; salto < 3; salto++) {
    if (actual.protocol !== "https:" || !CORTOS.has(actual.hostname) || actual.port || actual.username) return null;
    let r: Response;
    try {
      r = await pedir(actual, { redirect: "manual", signal: AbortSignal.timeout(5000), headers: { "user-agent": "Mozilla/5.0 (MiLindoEcuador)" } });
    } catch {
      return null;
    }
    await r.body?.cancel().catch(() => {});
    const destino = r.headers.get("location");
    if (r.status < 300 || r.status >= 400 || !destino) return null;
    let siguiente: URL;
    try {
      siguiente = new URL(destino, actual);
    } catch {
      return null;
    }
    if (LARGOS.test(siguiente.hostname) && siguiente.protocol === "https:") return siguiente.toString();
    actual = siguiente; // otro enlace corto: se sigue solo si también es de Google (se revisa arriba)
  }
  return null;
}
