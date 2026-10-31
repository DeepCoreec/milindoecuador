import { describe, expect, it } from "vitest";
import { DEFINICIONES, ejecutar, type Estado } from "@/lib/paumi/herramientas";

/* Paumi y "Cerca de mí" (versión 8, fase 34.3): la IA nunca da ni ve la ubicación; solo la usa el servidor. */
const estado = (ubicacion: Estado["ubicacion"] = null): Estado => ({
  vistos: new Set(),
  tarjetas: [],
  navegar: null,
  categorias: new Set(),
  urlsWeb: new Set(),
  externos: [],
  ubicacion,
});

describe("Paumi · buscar_cerca", () => {
  it("la herramienta no le pide coordenadas a la IA", () => {
    const d = DEFINICIONES.find((x) => x.name === "buscar_cerca")!;
    expect(Object.keys(d.input_schema.properties)).toEqual(["que"]);
  });

  it("sin ubicación compartida, le dice a la IA que pida tocar el botón (y no consulta nada)", async () => {
    const r = await ejecutar("buscar_cerca", {}, estado());
    expect(r.error).toBeFalsy();
    expect(String(r.resultado)).toContain("Cerca de mí");
  });

  it("ignora coordenadas que la IA intente mandar y rechaza pedidos raros", async () => {
    const r = await ejecutar("buscar_cerca", { que: "todo", lat: -2.19, lng: -79.88 }, estado());
    expect(String(r.resultado)).toContain("no compartió su ubicación");
    const malo = await ejecutar("buscar_cerca", { que: "casas" }, estado({ lat: -2.19, lng: -79.88 }));
    expect(malo.error).toBe(true);
  });
});
