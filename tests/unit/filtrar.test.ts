import { describe, expect, it } from "vitest";
import { filtrarLugares, sectoresDe } from "@/lib/datos/filtrar";
import type { LugarResumen } from "@/lib/datos/tipos";

const lugar = (slug: string, o: Partial<LugarResumen>): LugarResumen => ({
  slug, categoria: "restaurantes", nombre: slug, sector: "Centro", datos: "", promedio: null, cantidad: 0, precio: 1, plan: "gratis", ejemplo: true, ...o,
});

const lista = [
  lugar("a", { promedio: 4.9, cantidad: 5, precio: 2, sector: "Urdesa" }),
  lugar("b", { promedio: 4.1, cantidad: 80, plan: "destacado" }),
  lugar("c", { promedio: null, cantidad: 0, precio: 3 }),
  lugar("d", { promedio: 4.5, cantidad: 10, plan: "verificado", sector: "Urdesa" }),
];
const nombres = (l: LugarResumen[]) => l.map((x) => x.slug);
const base = { sector: null, precios: [], orden: "destacados" as const };

describe("filtrarLugares", () => {
  it("destacados primero, luego verificados, luego por calificación; sin reseñas al final", () => {
    expect(nombres(filtrarLugares([...lista], base))).toEqual(["b", "d", "a", "c"]);
  });
  it("mejor calificados", () => {
    expect(nombres(filtrarLugares([...lista], { ...base, orden: "calificacion" }))).toEqual(["a", "d", "b", "c"]);
  });
  it("más reseñas", () => {
    expect(nombres(filtrarLugares([...lista], { ...base, orden: "resenas" }))).toEqual(["b", "d", "a", "c"]);
  });
  it("filtra por sector y por precio a la vez", () => {
    expect(nombres(filtrarLugares([...lista], { ...base, sector: "Urdesa", precios: [1] }))).toEqual(["d"]);
  });
  it("con filtro de precio deja fuera los lugares sin precio", () => {
    expect(nombres(filtrarLugares([...lista, lugar("e", { precio: null })], { ...base, precios: [1, 2, 3] }))).not.toContain("e");
  });
});

describe("sectoresDe", () => {
  it("lista sin repetir y en orden alfabético", () => {
    expect(sectoresDe(lista)).toEqual(["Centro", "Urdesa"]);
  });
});
