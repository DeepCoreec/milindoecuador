import { describe, expect, it } from "vitest";
import { idDeRutaSitio, rutaSitio, slugSitio } from "@/lib/datos/sitios";
import { TIPOS_OCULTOS, TIPOS_POR_CATEGORIA } from "@/lib/osm";

/* Versión 11 (fase 39): página de cada lugar para visitar, y Turismo sin estatuas (2026-10-31). */

const ID = "7bfef9a0-4d04-4447-ad8b-0d364e91a5cc";

describe("39.1 · dirección de la página de un lugar", () => {
  it("nombre sin tildes ni signos, y el id al final", () => {
    expect(slugSitio("Malecón 2000")).toBe("malecon-2000");
    expect(slugSitio("Museo de la Música Popular «Julio Jaramillo»")).toBe("museo-de-la-musica-popular-julio-jaramillo");
    expect(slugSitio("¡¡¡")).toBe("");
    expect(slugSitio("a".repeat(100)).length).toBe(60);
    expect(rutaSitio({ id: ID, nombre: "Malecón 2000" })).toBe(`/guayaquil/visitar/malecon-2000-${ID}`);
    expect(rutaSitio({ id: ID, nombre: "¡¡¡" })).toBe(`/guayaquil/visitar/${ID}`);
  });

  it("solo acepta direcciones con un id válido al final", () => {
    expect(idDeRutaSitio(`malecon-2000-${ID}`)).toBe(ID);
    expect(idDeRutaSitio(ID)).toBe(ID);
    expect(idDeRutaSitio("malecon-2000")).toBeNull();
    expect(idDeRutaSitio(`malecon-2000-${ID}x`)).toBeNull();
    expect(idDeRutaSitio(`../${ID}`)).toBeNull();
    expect(idDeRutaSitio(`MALECON-${ID}`)).toBeNull();
    expect(idDeRutaSitio(`${"a".repeat(200)}-${ID}`)).toBeNull();
  });
});

describe("Turismo sin estatuas (pedido del usuario, 2026-10-31)", () => {
  it("los monumentos no se muestran al público y Turismo es de lugares con actividades", () => {
    expect(TIPOS_OCULTOS).toContain("monumento");
    for (const tipos of Object.values(TIPOS_POR_CATEGORIA)) expect(tipos).not.toContain("monumento");
    expect(TIPOS_POR_CATEGORIA.turismo).not.toContain("iglesia");
    expect(TIPOS_POR_CATEGORIA.turismo).toEqual(expect.arrayContaining(["parque", "reserva", "atraccion"]));
  });
});
