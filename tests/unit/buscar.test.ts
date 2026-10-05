import { describe, expect, it } from "vitest";
import { buscarEn } from "@/lib/datos/buscar";
import { buscarLugares } from "@/lib/datos/lugares";
import { leerBusqueda, normalizar } from "@/lib/validacion/busqueda";

describe("leerBusqueda", () => {
  it("recorta espacios", () => expect(leerBusqueda({ q: "  malecón  " })).toBe("malecón"));
  it("ignora textos muy cortos, muy largos o repetidos", () => {
    expect(leerBusqueda({ q: "a" })).toBeNull();
    expect(leerBusqueda({ q: "x".repeat(81) })).toBeNull();
    expect(leerBusqueda({ q: ["a", "b"] })).toBeNull();
    expect(leerBusqueda({})).toBeNull();
  });
});

describe("normalizar", () => {
  it("quita tildes y mayúsculas", () => expect(normalizar("Malecón PEÑAS")).toBe("malecon penas"));
});

describe("buscarLugares", () => {
  const nombres = async (q: string) => (await buscarLugares("guayaquil", q)).map((l) => l.nombre);
  it("encuentra sin tildes", async () => expect(await nombres("malecon")).toContain("Malecón 2000"));
  it("busca por sector y por categoría", async () => {
    expect(await nombres("urdesa")).toEqual(expect.arrayContaining(["Cangrejal Doña Tere", "El Rincón de Doña Rosa"]));
    expect((await nombres("restaurante")).length).toBeGreaterThan(5);
  });
  it("exige todas las palabras", async () => expect(await nombres("restaurante urdesa")).toHaveLength(2));
  it("pone primero lo que coincide en el nombre", () => {
    const base = { categoria: "restaurantes", datos: "", promedio: null, cantidad: 0, precio: null, destacado: false, verificado: false, ejemplo: false, textoCategoria: "" };
    const lista = [
      { ...base, slug: "a", nombre: "Alfa", sector: "Manglar" },
      { ...base, slug: "b", nombre: "Sabor a Manglar", sector: "Centro" },
    ];
    expect(buscarEn(lista, "manglar").map((l) => l.nombre)).toEqual(["Sabor a Manglar", "Alfa"]);
  });
  it("los caracteres raros no rompen nada", async () => expect(await nombres("<script>%' or 1=1")).toEqual([]));
  it("otra ciudad no tiene lugares todavía", async () => expect(await buscarLugares("quito", "malecon")).toEqual([]));
});
