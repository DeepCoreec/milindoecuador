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
    const crudo = resultados[0].content;
    if (crudo.startsWith("<datos_de_la_guia")) {
      const r = JSON.parse(crudo.replace(/^<datos_de_la_guia[^>]*>/, "").replace(/<\/datos_de_la_guia>$/, ""));
      if (!r.lugares?.length) return texto("No encontré encebollados en la guía todavía.");
      return usar("mostrar_lugares", { ids: r.lugares.slice(0, 2).map((l) => l.id) });
    }
    // Un resultado de búsqueda sin marcar es un error del servidor (debe ir dentro de <datos_de_la_guia>)
    if (crudo.includes("lugares")) return texto("FALTA MARCAR LOS DATOS DE LA GUÍA");
    return texto("¡Te recomiendo estos encebollados! Están buenazos.");
  }
  // Versión 5, fase 23: Guía útil. Busca una farmacia, muestra la primera y un id inventado (que el servidor ignora)
  if (pedido.includes("farmacia")) {
    const usadas = mensajes.filter((m) => Array.isArray(m.content) && m.content.some((b) => b.type === "tool_use")).length;
    if (usadas === 0) return usar("buscar_sitios", { tipo: "farmacia" });
    if (usadas === 1) {
      const crudo = resultados[0]?.content ?? "";
      const lista = JSON.parse(crudo.replace(/^<datos_de_la_guia[^>]*>/, "").replace(/<\/datos_de_la_guia>$/, ""));
      if (!Array.isArray(lista) || !lista.length) return texto("No hay farmacias en la Guía útil.");
      return usar("mostrar_sitios", { ids: [lista[0].id, "11111111-1111-4111-8111-111111111111"] });
    }
    return texto("Esta farmacia está en nuestra Guía útil.");
  }
  // Versión 5: eventos. Busca, abre la ficha del primero y lo nombra (solo lo que devolvió la herramienta)
  if (pedido.includes("evento")) {
    const usadas = mensajes.filter((m) => Array.isArray(m.content) && m.content.some((b) => b.type === "tool_use")).length;
    if (usadas === 0) return usar("buscar_eventos", { cuando: "todos" });
    if (usadas === 1) {
      const crudo = resultados[0]?.content ?? "";
      const lista = JSON.parse(crudo.replace(/^<datos_de_la_guia[^>]*>/, "").replace(/<\/datos_de_la_guia>$/, ""));
      if (!Array.isArray(lista) || !lista.length) return texto("No hay eventos publicados todavía.");
      return usar("abrir_pagina", { ruta: lista[0].ruta });
    }
    return texto("Mira este evento: toca el botón para ver la fecha y cómo llegar.");
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
  // Algo que no está en la guía: busca en internet y muestra lugares externos (uno real y uno con fuente inventada)
  if (pedido.includes("bolón")) {
    if (!resultados.length)
      return respuesta(
        [
          { type: "server_tool_use", id: "srvtoolu_1", name: "web_search", input: { query: "bolón Urdesa Guayaquil" } },
          {
            type: "web_search_tool_result",
            tool_use_id: "srvtoolu_1",
            content: [{ type: "web_search_result", url: "https://www.tripadvisor.com/Restaurant_Review-Bolon_Urdesa", title: "Bolones de Urdesa" }],
          },
          { type: "tool_use", id: "tu_ext1", name: "sugerir_externo", input: { nombre: "Bolones de Urdesa", sector: "Urdesa", fuente_url: "https://www.tripadvisor.com/Restaurant_Review-Bolon_Urdesa/" } },
          { type: "tool_use", id: "tu_ext2", name: "sugerir_externo", input: { nombre: "Bolón Inventado", fuente_url: "https://www.tripadvisor.com/no-lo-busco" } },
          { type: "tool_use", id: "tu_ext3", name: "sugerir_externo", input: { nombre: "Sitio Falso", fuente_url: "https://estafa.com/bolon" } },
        ],
        "tool_use",
      );
    return texto("En la guía todavía no hay bolones en Urdesa, pero encontré este en internet.");
  }
  // Una cuenta sin la búsqueda web habilitada: la API rechaza la herramienta (Paumi debe seguir sin internet)
  if (pedido.includes("sin internet")) {
    if (cuerpo.tools?.some((t) => t.type?.startsWith("web_search"))) return { error: 400 };
    return texto("Te respondo sin buscar en internet.");
  }
  if (pedido.includes("contacto")) return texto("Llama al 0991234567 o entra a www.estafa.com para reservar.");
  return texto("¡Hola! Soy Paumi. ¿Qué buscas hoy en Guayaquil?");
}

// Versión 5, fase 23: imita la API Overpass de OpenStreetMap (OVERPASS_URL=http://127.0.0.1:54399/api/interpreter)
const OVERPASS = {
  elements: [
    { type: "way", id: 900001, center: { lat: -2.1951, lon: -79.8826 }, tags: { name: "Parque Seminario (prueba OSM)", leisure: "park" } },
    { type: "node", id: 900002, lat: -2.1832, lon: -79.8761, tags: { name: "Museo de prueba OSM", tourism: "museum", website: "https://museo.example.org" } },
    { type: "node", id: 900003, lat: -2.17, lon: -79.89, tags: { name: "Tecnicel de prueba OSM", shop: "mobile_phone", "addr:street": "Av. 9 de Octubre" } },
    { type: "node", id: 900004, lat: -2.16, lon: -79.9, tags: { name: "Farmacia de prueba OSM", amenity: "pharmacy" } },
    { type: "node", id: 900005, lat: -2.15, lon: -79.89, tags: { name: "Estación de prueba OSM", public_transport: "station", network: "Metrovía" } },
    { type: "node", id: 900006, lat: -2.15, lon: -79.89, tags: { name: "Bar Mierda", tourism: "attraction" } },
  ],
};

createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/interpreter") {
    req.resume();
    req.on("end", () => res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(OVERPASS)));
    return;
  }
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
    if (salida.error) {
      res.writeHead(salida.error, { "content-type": "application/json" }).end(JSON.stringify({ type: "error", error: { type: "invalid_request_error" } }));
      return;
    }
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(salida));
  });
}).listen(PUERTO, "127.0.0.1", () => console.log(`Simulador de Anthropic en http://127.0.0.1:${PUERTO}`));
