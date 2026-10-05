import { describe, expect, it } from "vitest";
import { aSlug, slugLibre } from "@/lib/slug";

describe("aSlug", () => {
  it("quita tildes, eñes y signos", () => {
    expect(aSlug("Cevichería Doña Tere #2")).toBe("cevicheria-dona-tere-2");
    expect(aSlug("  ¡Café & Pan!  ")).toBe("cafe-pan");
  });
  it("cumple la regla de la base", () => {
    for (const t of ["--A--B--", "Ñandú 100%", "x".repeat(100) + " y", "🦀🦀"]) {
      const s = aSlug(t);
      expect(s === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)).toBe(true);
      expect(s.length).toBeLessThanOrEqual(60);
    }
  });
});

describe("slugLibre", () => {
  it("agrega un número si ya existe", () => {
    expect(slugLibre("Malecón 2000", new Set())).toBe("malecon-2000");
    expect(slugLibre("Malecón 2000", new Set(["malecon-2000", "malecon-2000-2"]))).toBe("malecon-2000-3");
    expect(slugLibre("🦀", new Set())).toBe("lugar");
  });
});
