import { describe, expect, it } from "vitest";
import { enlaceOSM } from "@/lib/osm";
import { aCandidatos, buscarCandidatosWikidata, consultaWikidata } from "@/lib/wikidata-lugares";
import { ErrorWikimedia } from "@/lib/wikimedia";

/* Lugares turísticos desde Wikidata (versión 7, 30.1), con respuestas SPARQL simuladas en el formato público. */

const fila = (q: string, nombre: string, clase: string, lng = -79.8848, lat = -2.1947) => ({
  item: { type: "uri", value: `http://www.wikidata.org/entity/${q}` },
  nombre: { "xml:lang": "es", type: "literal", value: nombre },
  coord: { datatype: "http://www.opengis.net/ont/geosparql#wktLiteral", type: "literal", value: `Point(${lng} ${lat})` },
  clase: { type: "uri", value: `http://www.wikidata.org/entity/${clase}` },
});

describe("Wikidata · candidatos a lugares turísticos (30.1)", () => {
  it("la consulta exige foto, artículo en español, coordenadas en Guayaquil y excluye personas", () => {
    const q = consultaWikidata();
    expect(q).toContain("wdt:P18");
    expect(q).toContain("<https://es.wikipedia.org/>");
    expect(q).toContain("wikibase:box");
    expect(q).toContain('"Point(-80.05 -2.3)"');
    expect(q).toContain("FILTER NOT EXISTS { ?item wdt:P31 wd:Q5 }");
    expect(q).toContain("wd:Q33506"); // museo
  });

  it("un candidato por Q, con el tipo de la clase más importante", () => {
    const r = aCandidatos({
      results: {
        bindings: [
          fila("Q100", "Museo Municipal de Guayaquil", "Q570116"), // atracción turística…
          fila("Q100", "Museo Municipal de Guayaquil", "Q33506"), // …y museo: gana museo
          fila("Q200", "Parque Seminario", "Q22698"),
        ],
      },
    });
    expect(r).toEqual([
      { qid: "Q100", nombre: "Museo Municipal de Guayaquil", lat: -2.1947, lng: -79.8848, tipo: "museo" },
      { qid: "Q200", nombre: "Parque Seminario", lat: -2.1947, lng: -79.8848, tipo: "parque" },
    ]);
  });

  it("ignora lo raro: fuera de Guayaquil, sin nombre, nombre que es un Q, clases desconocidas, URIs falsas", () => {
    const r = aCandidatos({
      results: {
        bindings: [
          fila("Q1", "Parque en Quito", "Q22698", -78.5, -0.2),
          fila("Q2", "", "Q22698"),
          fila("Q3", "Q3", "Q22698"),
          fila("Q4", "Algo", "Q999999"),
          { ...fila("Q5", "Falso", "Q22698"), item: { value: "https://malo.example.com/entity/Q5" } },
          fila("Q6", "Tecni‮Cel", "Q33506"),
        ],
      },
    });
    expect(r.map((c) => c.qid)).toEqual(["Q6"]);
    expect(r[0]!.nombre).toBe("Tecni Cel");
    expect(aCandidatos(null)).toEqual([]);
    expect(aCandidatos({ results: { bindings: "x" } })).toEqual([]);
  });

  it("sin clase: no entra al traer todos; al agregar uno a mano entra como atracción", () => {
    const sinClase = { results: { bindings: [{ ...fila("Q300", "Malecón 2000", "Q22698"), clase: undefined }] } };
    expect(aCandidatos(sinClase)).toEqual([]);
    expect(aCandidatos(sinClase, true)).toEqual([{ qid: "Q300", nombre: "Malecón 2000", lat: -2.1947, lng: -79.8848, tipo: "atraccion" }]);
  });

  it("habla solo con query.wikidata.org y avisa si falla", async () => {
    let url = "";
    const ok = (async (u: string) => {
      url = u;
      return new Response(JSON.stringify({ results: { bindings: [fila("Q200", "Parque Seminario", "Q22698")] } }), { status: 200 });
    }) as unknown as typeof fetch;
    expect((await buscarCandidatosWikidata(ok)).length).toBe(1);
    expect(url.startsWith("https://query.wikidata.org/sparql?")).toBe(true);
    const caido = (async () => new Response("x", { status: 503 })) as unknown as typeof fetch;
    await expect(buscarCandidatosWikidata(caido)).rejects.toBeInstanceOf(ErrorWikimedia);
    const basura = (async () => new Response("<html>", { status: 200 })) as unknown as typeof fetch;
    await expect(buscarCandidatosWikidata(basura)).rejects.toBeInstanceOf(ErrorWikimedia);
  });

  it("el enlace de un lugar de Wikidata lleva a su ficha", () => {
    expect(enlaceOSM("wikidata", 2364048)).toBe("https://www.wikidata.org/wiki/Q2364048");
    expect(enlaceOSM("node", 12)).toBe("https://www.openstreetmap.org/node/12");
  });
});
