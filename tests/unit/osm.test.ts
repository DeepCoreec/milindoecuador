import { describe, expect, it } from "vitest";
import { aSitios, consultaOverpass, enlaceOSM } from "@/lib/osm";

const respuesta = {
  elements: [
    { type: "way", id: 11, center: { lat: -2.195, lon: -79.882 }, tags: { name: "Parque Seminario", leisure: "park" } },
    { type: "node", id: 12, lat: -2.18, lon: -79.87, tags: { name: "Museo Antropológico y de Arte Contemporáneo", tourism: "museum", website: "https://maac.gob.ec", "addr:street": "Malecón Simón Bolívar" } },
    { type: "node", id: 13, lat: -2.17, lon: -79.89, tags: { name: "Farmacia X", amenity: "pharmacy", phone: "+593 4 123 4567", website: "javascript:alert(1)" } },
    { type: "node", id: 14, lat: -2.17, lon: -79.89, tags: { name: "Estación Garzota", public_transport: "station", network: "Metrovía" } },
    { type: "node", id: 15, lat: -2.17, lon: -79.89, tags: { name: "Estación de tren", public_transport: "station" } },
    { type: "node", id: 16, lat: -2.17, lon: -79.89, tags: { name: "Capilla del barrio", amenity: "place_of_worship" } },
    { type: "node", id: 17, lat: -2.17, lon: -79.89, tags: { name: "Catedral", amenity: "place_of_worship", wikidata: "Q1" } },
    { type: "node", id: 18, lat: -0.2, lon: -78.5, tags: { name: "Parque en Quito", leisure: "park" } },
    { type: "node", id: 19, lat: -2.17, lon: -79.89, tags: { leisure: "park" } },
    { type: "node", id: 12, lat: -2.18, lon: -79.87, tags: { name: "Repetido", tourism: "museum" } },
    { type: "node", id: 20, lat: -2.17, lon: -79.89, tags: { name: "Tecni‮Cel", shop: "mobile_phone" } },
    { type: "evil", id: 21, lat: -2.17, lon: -79.89, tags: { name: "Raro", leisure: "park" } },
  ],
};

describe("importar de OpenStreetMap", () => {
  it("traduce lo útil y descarta lo incompleto, lo repetido y lo de otra ciudad", () => {
    const s = aSitios(respuesta);
    expect(s.map((x) => `${x.osm_type}/${x.osm_id}:${x.tipo}`)).toEqual([
      "way/11:parque",
      "node/12:museo",
      "node/13:farmacia",
      "node/14:metrovia",
      "node/17:iglesia",
      "node/20:celulares",
    ]);
    expect(s[0]).toMatchObject({ latitude: -2.195, longitude: -79.882, grupo: "visitar" });
    expect(s[1]).toMatchObject({ website: "https://maac.gob.ec", address: "Malecón Simón Bolívar" });
    expect(s[2]).toMatchObject({ website: null, phone: "+593 4 123 4567", grupo: "salud" });
    expect(s[5]!.name).toBe("Tecni Cel"); // sin letras invisibles
  });

  it("una respuesta rara no rompe nada", () => {
    expect(aSitios(null)).toEqual([]);
    expect(aSitios({ elements: "x" })).toEqual([]);
  });

  it("la consulta pide solo lugares con nombre dentro de Guayaquil", () => {
    const q = consultaOverpass();
    expect(q).toContain('nwr["tourism"="museum"]["name"](-2.3,-80.05,-2.05,-79.84);');
    expect(q).toContain("out center tags");
    expect(enlaceOSM("way", 11)).toBe("https://www.openstreetmap.org/way/11");
  });
});

describe("horario de OpenStreetMap en español", () => {
  it("traduce los días y las horas", async () => {
    const { horarioLegible } = await import("@/lib/osm");
    expect(horarioLegible("Mo-Fr 08:00-18:00; Sa 09:00-13:00")).toBe("lun a vie de 08:00 a 18:00; sáb de 09:00 a 13:00");
    expect(horarioLegible("24/7")).toBe("Abierto las 24 horas");
    expect(horarioLegible("Su off")).toBe("dom cerrado");
  });
});

describe("buscar en la Guía útil", () => {
  it("encuentra por tipo (con o sin tilde, en plural) y por nombre", async () => {
    const { buscarEnSitios } = await import("@/lib/osm");
    const s = [
      { nombre: "Cerrajería El Rápido", tipo: "cerrajeria" as const },
      { nombre: "Farmacia Cruz Azul", tipo: "farmacia" as const },
      { nombre: "Parque Seminario", tipo: "parque" as const },
    ];
    expect(buscarEnSitios(s, "cerrajeria").map((x) => x.nombre)).toEqual(["Cerrajería El Rápido"]);
    expect(buscarEnSitios(s, "farmacias").map((x) => x.nombre)).toEqual(["Farmacia Cruz Azul"]);
    expect(buscarEnSitios(s, "seminario").map((x) => x.nombre)).toEqual(["Parque Seminario"]);
    expect(buscarEnSitios(s, "ab")).toEqual([]);
  });
});
