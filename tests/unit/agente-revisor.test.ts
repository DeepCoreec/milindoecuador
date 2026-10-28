import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ErrorAgente, revisarLoteConIA } from "@/lib/agente/revisor";
import type { SitioParaRevisar } from "@/lib/agente/reglas";

const lugar = (id: string, nombre: string, tipo = "museo"): SitioParaRevisar => ({ id, nombre, tipo, grupo: "visitar" });

/** Una respuesta de la API de Anthropic con la herramienta "recomendar". */
function respuesta(input: unknown, status = 200) {
  let pedido: { url: string; cuerpo: Record<string, unknown>; cabeceras: Record<string, string> } | null = null;
  const pedir = (async (url: string, init: RequestInit) => {
    pedido = { url, cuerpo: JSON.parse(String(init.body)), cabeceras: init.headers as Record<string, string> };
    return new Response(JSON.stringify({ content: [{ type: "tool_use", name: "recomendar", input }], usage: { input_tokens: 500, output_tokens: 60 } }), { status });
  }) as unknown as typeof fetch;
  return { pedir, pedido: () => pedido! };
}

describe("agente revisor · criterio con Claude", () => {
  const antes = { ...process.env };
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "clave-de-prueba-unitaria";
    delete process.env.PAUMI_API_URL;
    delete process.env.AGENTE_MODELO;
  });
  afterEach(() => {
    process.env = { ...antes };
  });

  it("pide a Claude Haiku 5.5 con la herramienta obligatoria y los datos marcados como datos", async () => {
    const { pedir, pedido } = respuesta({ lugares: [{ id: "L1", veredicto: "publicar", motivo: "Museo conocido del Malecón" }] });
    const r = await revisarLoteConIA([lugar("uuid-1", "Museo Nahim Isaías")], pedir);
    const p = pedido();
    expect(p.url).toBe("https://api.anthropic.com/v1/messages");
    expect(p.cuerpo.model).toBe("claude-haiku-5-5");
    expect(p.cuerpo.tool_choice).toEqual({ type: "tool", name: "recomendar" });
    expect(JSON.stringify(p.cuerpo.messages)).toContain("<datos>");
    expect(JSON.stringify(p.cuerpo.messages)).not.toContain("uuid-1"); // el id real nunca sale
    expect(r.recomendaciones.get("uuid-1")).toEqual({ veredicto: "publicar", motivo: "Museo conocido del Malecón" });
    expect(r.tokensEntrada).toBe(500);
  });

  it("ignora ids que no son del lote, decisiones no permitidas y respuestas mal formadas", async () => {
    const lote = [lugar("a", "Museo Uno"), lugar("b", "Museo Dos")];
    const inventado = await revisarLoteConIA(lote, respuesta({ lugares: [{ id: "L9", veredicto: "publicar", motivo: "Otro lugar" }, { id: "L2", veredicto: "descartar", motivo: "No existe" }] }).pedir);
    expect([...inventado.recomendaciones.keys()]).toEqual(["b"]);
    const raro = await revisarLoteConIA(lote, respuesta({ lugares: [{ id: "L1", veredicto: "borrar", motivo: "x" }] }).pedir);
    expect(raro.recomendaciones.size).toBe(0);
    const basura = await revisarLoteConIA(lote, respuesta("no es json").pedir);
    expect(basura.recomendaciones.size).toBe(0);
  });

  it("limpia el motivo y respeta los 200 caracteres", async () => {
    const r = await revisarLoteConIA([lugar("a", "Museo")], respuesta({ lugares: [{ id: "L1", veredicto: "revisar", motivo: "Dudoso‮ " + "x".repeat(250) }] }).pedir);
    const m = r.recomendaciones.get("a")!.motivo;
    expect(m.length).toBeLessThanOrEqual(200);
    expect(m).not.toContain("‮");
  });

  it("falla con un error claro si la API responde mal o falta la clave", async () => {
    await expect(revisarLoteConIA([lugar("a", "Museo")], respuesta({}, 529).pedir)).rejects.toBeInstanceOf(ErrorAgente);
    delete process.env.ANTHROPIC_API_KEY;
    await expect(revisarLoteConIA([lugar("a", "Museo")], respuesta({}).pedir)).rejects.toThrow("ANTHROPIC_API_KEY");
  });

  it("no acepta más de 20 lugares por lote ni llama si no hay ninguno", async () => {
    const muchos = Array.from({ length: 21 }, (_, i) => lugar(String(i), `Museo ${i}`));
    await expect(revisarLoteConIA(muchos, respuesta({}).pedir)).rejects.toBeInstanceOf(ErrorAgente);
    const vacio = await revisarLoteConIA([], (() => {
      throw new Error("no debía llamar");
    }) as unknown as typeof fetch);
    expect(vacio.recomendaciones.size).toBe(0);
  });
});
