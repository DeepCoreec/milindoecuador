import { describe, expect, it } from "vitest";
import { leerFiltros } from "@/lib/validacion/filtros";

describe("leerFiltros", () => {
  it("sin nada en la dirección usa los valores por defecto", () => {
    expect(leerFiltros({})).toEqual({ sector: null, precios: [], orden: "destacados" });
  });

  it("lee sector, varios precios y orden", () => {
    expect(leerFiltros({ sector: "Urdesa", precio: ["2", "1"], orden: "resenas" })).toEqual({
      sector: "Urdesa",
      precios: [1, 2],
      orden: "resenas",
    });
  });

  it("ignora lo que no sirve en vez de romper la página", () => {
    const f = leerFiltros({ sector: "", precio: ["9", "abc", "<script>", "2", "2"], orden: "'; drop table places;--" });
    expect(f).toEqual({ sector: null, precios: [2], orden: "destacados" });
  });

  it("ignora un sector demasiado largo", () => {
    expect(leerFiltros({ sector: "x".repeat(500) }).sector).toBeNull();
  });

  it("ignora el sector si llega repetido", () => {
    expect(leerFiltros({ sector: ["Centro", "Urdesa"] }).sector).toBeNull();
  });
});
