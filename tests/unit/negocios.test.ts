import { describe, expect, it } from "vitest";
import { esquemaSolicitud, normalizarCelular } from "@/lib/validacion/negocios";

describe("normalizarCelular", () => {
  it("acepta como lo escribe la gente", () => {
    for (const v of ["099 123 4567", "0991234567", "99-123-4567", "+593 99 123 4567", "593991234567", "(099) 123-4567"]) {
      expect(normalizarCelular(v)).toBe("593991234567");
    }
  });
  it("rechaza fijos, números cortos o largos y cosas raras", () => {
    for (const v of ["04 223 4567", "09912345", "09912345678", "abc", "", null, "0891234567"]) expect(normalizarCelular(v)).toBeNull();
  });
});

describe("esquemaSolicitud", () => {
  const ok = { negocio: "Encebollados El Puerto", categoria: "restaurantes", sector: "Alborada", contacto: "Juan", whatsapp: "099 123 4567", descripcion: "", terminos: "on" };
  it("acepta una solicitud normal y deja el celular en formato 593", () => {
    expect(esquemaSolicitud.parse(ok).whatsapp).toBe("593991234567");
  });
  it("exige aceptar los términos", () => {
    expect(esquemaSolicitud.safeParse({ ...ok, terminos: undefined }).success).toBe(false);
  });
  it("marca cada campo malo con su mensaje", () => {
    const r = esquemaSolicitud.safeParse({ ...ok, negocio: "x", whatsapp: "123", categoria: "../admin" });
    const campos = r.error?.issues.map((i) => i.path[0]);
    expect(campos).toEqual(expect.arrayContaining(["negocio", "whatsapp", "categoria"]));
  });
  it("rechaza caracteres invisibles", () => {
    expect(esquemaSolicitud.safeParse({ ...ok, negocio: "Mi‮negocio" }).success).toBe(false);
  });
});
