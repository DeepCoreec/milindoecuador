import { describe, expect, it } from "vitest";
import { ENLACES_COMPROBADOS, ENLACES_UTILES } from "@/lib/enlaces-utiles";

/* Enlaces oficiales de "Información útil" (versión 8, fase 33): solo HTTPS y solo sitios oficiales comprobados. */
const OFICIALES = new Set(["atm.gob.ec", "ttg.ec", "www.tagsa.aero", "www.ecu911.gob.ec"]);

describe("enlaces oficiales de Información útil", () => {
  it("todos son HTTPS, de un sitio oficial de la lista y dicen a qué sitio llevan", () => {
    const todos = ENLACES_UTILES.flatMap((g) => g.enlaces);
    expect(todos.length).toBeGreaterThanOrEqual(7);
    for (const e of todos) {
      const u = new URL(e.url);
      expect(u.protocol, e.url).toBe("https:");
      expect(OFICIALES.has(u.hostname), e.url).toBe(true);
      expect(u.hostname.endsWith(e.sitio), e.url).toBe(true);
      expect(e.titulo.length).toBeGreaterThan(3);
    }
  });

  it("tiene la fecha de la última comprobación", () => {
    expect(ENLACES_COMPROBADOS).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
