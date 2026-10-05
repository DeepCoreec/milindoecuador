import { describe, expect, it } from "vitest";
import { esquemaResena } from "@/lib/validacion/resenas";

const base = { lugar: "6f1c2a8e-3b9d-4c1e-9a7f-2d5b8c0e1f3a", ruta: "/guayaquil/restaurantes/cangrejal", estrellas: "4", texto: "Muy rico todo, volveré." };

describe("esquemaResena", () => {
  it("acepta una reseña normal y convierte las estrellas a número", () => {
    const r = esquemaResena.parse(base);
    expect(r.estrellas).toBe(4);
  });
  it("pide de 1 a 5 estrellas enteras", () => {
    for (const e of ["0", "6", "4.5", "", "abc", null]) expect(esquemaResena.safeParse({ ...base, estrellas: e }).success).toBe(false);
  });
  it("pide de 10 a 1000 caracteres, sin contar espacios de los extremos", () => {
    expect(esquemaResena.safeParse({ ...base, texto: "   corto    " }).success).toBe(false);
    expect(esquemaResena.safeParse({ ...base, texto: "x".repeat(1001) }).success).toBe(false);
  });
  it("rechaza lugares y rutas que no son de una ficha", () => {
    expect(esquemaResena.safeParse({ ...base, lugar: "1; drop table reviews" }).success).toBe(false);
    for (const ruta of ["https://malo.com/a/b", "/guayaquil/restaurantes", "/../../etc/passwd", "/a/b/c?x=1", "/A/B/C"]) {
      expect(esquemaResena.safeParse({ ...base, ruta }).success).toBe(false);
    }
  });
});
