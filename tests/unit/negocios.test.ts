import { esquemaLugar } from "@/lib/validacion/admin";
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

describe("esquemaLugar", () => {
  const ok = {
    id: "nuevo", nombre: "Parque Histórico", categoria: "turismo", sector: "Samborondón",
    descripcion: "Un parque con casas antiguas y animales de la costa.", dato: "", horario: "", direccion: "", precio: "", whatsapp: "", estado: "borrador",
  };
  it("deja vacíos los opcionales como null", () => {
    const r = esquemaLugar.parse(ok);
    expect([r.dato, r.horario, r.direccion, r.precio, r.whatsapp]).toEqual([null, null, null, null, null]);
  });
  it("convierte precio y WhatsApp", () => {
    const r = esquemaLugar.parse({ ...ok, precio: "2", whatsapp: "099 123 4567" });
    expect([r.precio, r.whatsapp]).toEqual([2, "593991234567"]);
  });
  it("rechaza estados, precios e ids inventados", () => {
    expect(esquemaLugar.safeParse({ ...ok, estado: "borrado" }).success).toBe(false);
    expect(esquemaLugar.safeParse({ ...ok, precio: "4" }).success).toBe(false);
    expect(esquemaLugar.safeParse({ ...ok, id: "1 or 1=1" }).success).toBe(false);
    expect(esquemaLugar.safeParse({ ...ok, descripcion: "corta" }).success).toBe(false);
  });
});
