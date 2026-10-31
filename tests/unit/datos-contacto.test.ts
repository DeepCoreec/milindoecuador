import { describe, expect, it } from "vitest";
import { aDatosContacto, consultaDatosOSM } from "@/lib/osm";
import { esquemaDatosSitio } from "@/lib/validacion/admin";

/* Horario, web y teléfono de los lugares de la guía (2026-10-31): desde OpenStreetMap y a mano en el panel. */
describe("horario y web desde OpenStreetMap", () => {
  it("la consulta pide por Q de Wikidata y por id, e ignora lo que no tiene forma válida", () => {
    const q = consultaDatosOSM(["Q123", "Q1; out", "Q456"], [{ tipo: "node", id: 7 }, { tipo: "way", id: -1 }]);
    expect(q).toContain('nwr["wikidata"~"^(Q123|Q456)$"]');
    expect(q).toContain("node(id:7);");
    expect(q).not.toContain("way(id:");
    expect(q).not.toContain("out;");
  });

  it("lee horario, web http(s) y teléfono; descarta webs raras", () => {
    const m = aDatosContacto({
      elements: [
        { type: "way", id: 9, tags: { wikidata: "Q123", opening_hours: "Mo-Su 06:00-22:00", website: "https://www.guayaquil.gob.ec", phone: "+593 4 259 9100" } },
        { type: "node", id: 7, tags: { website: "javascript:alert(1)" } },
      ],
    });
    expect(m.get("Q123")).toEqual({ opening_hours: "Mo-Su 06:00-22:00", website: "https://www.guayaquil.gob.ec", phone: "+593 4 259 9100" });
    expect(m.get("way/9")?.website).toBe("https://www.guayaquil.gob.ec");
    expect(m.has("node/7")).toBe(false);
    expect(aDatosContacto(null).size).toBe(0);
  });
});

describe("datos puestos a mano", () => {
  const id = "7bfef9a0-4d04-4447-ad8b-0d364e91a5cc";
  it("acepta un horario en texto, una web https y un teléfono", () => {
    expect(esquemaDatosSitio.safeParse({ sitio: id, horario: "Todos los días de 07:00 a 24:00", web: "https://www.guayaquil.gob.ec", telefono: "04 259 9100" }).success).toBe(true);
    expect(esquemaDatosSitio.safeParse({ sitio: id }).success).toBe(true);
    expect(esquemaDatosSitio.safeParse({ sitio: id, telefono: "(593) (4) 2833807" }).success).toBe(true);
  });
  it("rechaza enlaces en el horario, webs que no son http(s) y teléfonos con letras", () => {
    expect(esquemaDatosSitio.safeParse({ sitio: id, horario: "ver www.ejemplo.com" }).success).toBe(false);
    expect(esquemaDatosSitio.safeParse({ sitio: id, web: "javascript:alert(1)" }).success).toBe(false);
    expect(esquemaDatosSitio.safeParse({ sitio: id, telefono: "llama ya" }).success).toBe(false);
    expect(esquemaDatosSitio.safeParse({ sitio: "x", horario: "" }).success).toBe(false);
  });
});
