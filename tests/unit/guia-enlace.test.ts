import { describe, expect, it } from "vitest";
import { leerEnlace } from "@/lib/guia/enlace";
import { consultaWikidata } from "@/lib/wikidata-lugares";
import { ErrorWikimedia } from "@/lib/wikimedia";

/* "Agregar un lugar" pegando su enlace (versión 7, 30.3). */

describe("leer el enlace que pega el admin", () => {
  it("entiende Wikidata, Wikipedia (también móvil) y OpenStreetMap", () => {
    expect(leerEnlace("https://www.wikidata.org/wiki/Q2364048")).toEqual({ fuente: "wikidata", qid: "Q2364048" });
    expect(leerEnlace("  Q2364048 ")).toEqual({ fuente: "wikidata", qid: "Q2364048" });
    expect(leerEnlace("https://es.wikipedia.org/wiki/Parque_Seminario")).toEqual({ fuente: "wikipedia", idioma: "es", titulo: "Parque Seminario" });
    expect(leerEnlace("https://es.m.wikipedia.org/wiki/Malec%C3%B3n_2000")).toEqual({ fuente: "wikipedia", idioma: "es", titulo: "Malecón 2000" });
    expect(leerEnlace("https://en.wikipedia.org/wiki/Malec%C3%B3n_2000#History")).toEqual({ fuente: "wikipedia", idioma: "en", titulo: "Malecón 2000" });
    expect(leerEnlace("https://www.openstreetmap.org/way/123456789")).toEqual({ fuente: "osm", tipo: "way", id: 123456789 });
    expect(leerEnlace("https://www.openstreetmap.org/node/42#map=19/-2.19/-79.88")).toEqual({ fuente: "osm", tipo: "node", id: 42 });
  });

  it("rechaza lo demás: Google Maps, redes, sitios parecidos, esquemas raros y textos sueltos", () => {
    for (const malo of [
      "https://maps.app.goo.gl/abc",
      "https://www.google.com/maps/place/Parque+Seminario",
      "https://www.instagram.com/p/xyz",
      "https://es.wikipedia.org.malo.com/wiki/X",
      "https://wikidata.org.malo.com/wiki/Q1",
      "javascript:alert(1)",
      "ftp://es.wikipedia.org/wiki/X",
      "https://www.wikidata.org/wiki/Q0",
      "https://www.wikidata.org/wiki/Property:P18",
      "https://es.wikipedia.org/w/index.php?title=X",
      "https://www.openstreetmap.org/user/alguien",
      "https://www.openstreetmap.org/node/abc",
      "Parque Seminario",
      "https://es.wikipedia.org/wiki/%E0%A4%A",
      "https://www.wikipedia.org/wiki/X",
    ]) {
      expect(leerEnlace(malo), malo).toBeNull();
    }
  });
});

describe("consulta de Wikidata para un solo lugar", () => {
  it("agrega el Q a la consulta con sus mismas exigencias de calidad", () => {
    const q = consultaWikidata("Q2364048");
    expect(q).toContain("VALUES ?item { wd:Q2364048 }");
    expect(q).toContain("OPTIONAL { VALUES ?clase"); // la clase turística es opcional con un solo lugar
    expect(consultaWikidata()).not.toContain("OPTIONAL"); // y obligatoria al traer todos
    expect(q).toContain("wdt:P18");
    expect(q).toContain("wikibase:box");
  });

  it("no deja pasar nada que no sea un Q válido", () => {
    for (const malo of ["Q1 } ; DROP", "q12", "Q", "wd:Q1", "Q0"]) expect(() => consultaWikidata(malo), malo).toThrow(ErrorWikimedia);
  });
});
