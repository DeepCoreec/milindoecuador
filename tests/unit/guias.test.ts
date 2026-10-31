import { describe, expect, it } from "vitest";
import { enFrase, ESPECIALIDADES, IDIOMAS, leerLista } from "@/lib/guias";
import { esquemaPerfilGuia } from "@/lib/validacion/dueno";

const LUGAR = "3f1c2a4e-8b7d-4c6a-9e1f-2b3c4d5e6f70";
const base = { lugar: LUGAR, idiomas: ["es", "en"], especialidades: ["historia"], zonas: " Centro y Las Peñas ", credencial: " gt-0912 " };

describe("perfil del guía (versión 13, 41.2)", () => {
  it("acepta un perfil normal y ordena los datos", () => {
    const r = esquemaPerfilGuia.parse(base);
    expect(r.zonas).toBe("Centro y Las Peñas");
    expect(r.credencial).toBe("GT-0912");
  });
  it("las zonas y la credencial vacías quedan en nada", () => {
    const r = esquemaPerfilGuia.parse({ ...base, zonas: "  ", credencial: "" });
    expect(r.zonas).toBeNull();
    expect(r.credencial).toBeNull();
  });
  it("pide al menos un idioma", () => {
    expect(esquemaPerfilGuia.safeParse({ ...base, idiomas: [] }).success).toBe(false);
  });
  it("solo idiomas y especialidades de la lista", () => {
    expect(esquemaPerfilGuia.safeParse({ ...base, idiomas: ["es", "klingon"] }).success).toBe(false);
    expect(esquemaPerfilGuia.safeParse({ ...base, especialidades: ["abandonados"] }).success).toBe(false);
  });
  it("no más de 6 especialidades", () => {
    expect(esquemaPerfilGuia.safeParse({ ...base, especialidades: Object.keys(ESPECIALIDADES).slice(0, 7) }).success).toBe(false);
  });
  it("la credencial solo con letras, números, puntos y guiones", () => {
    expect(esquemaPerfilGuia.safeParse({ ...base, credencial: "<script>" }).success).toBe(false);
    expect(esquemaPerfilGuia.safeParse({ ...base, credencial: "ab" }).success).toBe(false);
  });
  it("zonas sin caracteres invisibles", () => {
    expect(esquemaPerfilGuia.safeParse({ ...base, zonas: "Centro‮" }).success).toBe(false);
  });
  it("el lugar tiene que ser un id válido", () => {
    expect(esquemaPerfilGuia.safeParse({ ...base, lugar: "1 or 1=1" }).success).toBe(false);
  });
});

describe("lectura del perfil", () => {
  it("leerLista ignora códigos desconocidos y respeta el orden de la lista", () => {
    expect(leerLista(["en", "xx", "es"], IDIOMAS)).toEqual(["es", "en"]);
    expect(leerLista(null, IDIOMAS)).toEqual([]);
  });
  it("enFrase junta con comas e «y»", () => {
    expect(enFrase(["Español"])).toBe("Español");
    expect(enFrase(["Español", "Inglés", "Francés"])).toBe("Español, Inglés y Francés");
  });
});
