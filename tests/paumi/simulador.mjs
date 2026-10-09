// Simulador de la API de Anthropic para probar a Paumi SIN gastar dinero ni necesitar clave (solo pruebas).
// Uso: node tests/paumi/simulador.mjs   (escucha en http://127.0.0.1:54399)
// La página lo usa si PAUMI_API_URL=http://127.0.0.1:54399 (solo fuera de producción, ver src/lib/paumi/config.ts).
// Responde con un guion según lo que escribe la persona, imitando el formato real (texto, tool_use, stop_reason).
import { createServer } from "node:http";

const PUERTO = Number(process.env.PUERTO ?? 54399);

function respuesta(content, stop_reason) {
  return { id: "msg_sim", type: "message", role: "assistant", model: "simulador", content, stop_reason, usage: { input_tokens: 10, output_tokens: 10 } };
}
const texto = (t) => respuesta([{ type: "text", text: t }], "end_turn");
const usar = (name, input) => respuesta([{ type: "text", text: "Déjame ver… " }, { type: "tool_use", id: `tu_${Math.random().toString(36).slice(2, 10)}`, name, input }], "tool_use");

function guion(cuerpo) {
  const mensajes = cuerpo.messages ?? [];
  const primera = mensajes.find((m) => m.role === "user" && typeof m.content === "string")?.content ?? "";
  const ultima = mensajes.at(-1);
  const resultados = Array.isArray(ultima?.content) ? ultima.content.filter((b) => b.type === "tool_result") : [];
  const pedido = [...mensajes].reverse().find((m) => m.role === "user" && typeof m.content === "string")?.content.toLowerCase() ?? primera.toLowerCase();

  // La regla más importante: las herramientas tienen que estar y el sistema debe pedir no inventar
  if (!cuerpo.system?.includes("JAMÁS inventes")) return texto("FALTAN LAS INSTRUCCIONES");

  if (pedido.includes("encebollado")) {
    if (!resultados.length) return usar("buscar_lugares", { texto: "encebollado" });
    const r = JSON.parse(resultados[0].content);
    if (r.lugares) {
      if (!r.lugares.length) return texto("No encontré encebollados en la guía todavía.");
      return usar("mostrar_lugares", { ids: r.lugares.slice(0, 2).map((l) => l.id) });
    }
    return texto("¡Te recomiendo estos encebollados! Están buenazos.");
  }
  if (pedido.includes("llévame") || pedido.includes("llevame")) {
    if (!resultados.length) return usar("abrir_pagina", { ruta: "/guayaquil/restaurantes" });
    return texto("¡Vamos! Toca el botón para ver todos los restaurantes.");
  }
  if (pedido.includes("hackea")) {
    // Intenta mostrar un lugar que no vio y abrir una página externa: el servidor debe impedirlo
    if (!resultados.length) return usar("mostrar_lugares", { ids: ["11111111-1111-4111-8111-111111111111"] });
    if (resultados.length && !mensajes.some((m) => Array.isArray(m.content) && m.content.some((b) => b.type === "tool_use" && b.name === "abrir_pagina")))
      return usar("abrir_pagina", { ruta: "https://estafa.com" });
    return texto("<script>alert('x')</script> **No** puedo hacer eso.");
  }
  return texto("¡Hola! Soy Paumi. ¿Qué buscas hoy en Guayaquil?");
}

createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/v1/messages") {
    res.writeHead(404).end();
    return;
  }
  let datos = "";
  req.on("data", (d) => (datos += d));
  req.on("end", () => {
    if (!req.headers["x-api-key"] || req.headers["anthropic-version"] !== "2023-06-01") {
      res.writeHead(401, { "content-type": "application/json" }).end(JSON.stringify({ type: "error", error: { type: "authentication_error" } }));
      return;
    }
    const salida = guion(JSON.parse(datos));
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(salida));
  });
}).listen(PUERTO, "127.0.0.1", () => console.log(`Simulador de Anthropic en http://127.0.0.1:${PUERTO}`));
