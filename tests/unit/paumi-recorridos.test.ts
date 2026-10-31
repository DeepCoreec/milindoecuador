import { describe, expect, it } from "vitest";
import { DEFINICIONES, rutaPermitida } from "@/lib/paumi/herramientas";
import { instrucciones } from "@/lib/paumi/personaje";

/* Paumi recomienda guías y recorridos (versión 13, 42.4). */
describe("Paumi · recorridos", () => {
  it("existe buscar_recorridos y solo recibe texto", () => {
    const d = DEFINICIONES.find((x) => x.name === "buscar_recorridos")!;
    expect(Object.keys(d.input_schema.properties)).toEqual(["texto"]);
  });
  it("solo abre la ruta de un recorrido que devolvió la herramienta en esta respuesta", () => {
    const ruta = "/guayaquil/guias/ana-torres/recorridos/3f1c2a4e-8b7d-4c6a-9e1f-2b3c4d5e6f70";
    expect(rutaPermitida(ruta, new Set(["guias"]))).toBeNull();
    expect(rutaPermitida(ruta, new Set(["guias"]), new Set(), new Set([ruta]))).toBe(ruta);
    expect(rutaPermitida("/guayaquil/guias/otro/recorridos/x", new Set(["guias"]), new Set(), new Set([ruta]))).toBeNull();
  });
  it("las instrucciones piden recomendar acreditados primero y no entrar a lugares abandonados", () => {
    const t = instrucciones([{ slug: "guias", nombre: "Guías turísticos" }], false);
    expect(t).toContain("buscar_recorridos");
    expect(t).toContain("acreditados");
    expect(t).toContain("abandonados");
  });
});
