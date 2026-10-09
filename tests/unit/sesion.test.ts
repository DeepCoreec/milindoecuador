import { afterEach, describe, expect, it, vi } from "vitest";
import { googleActivo } from "@/lib/sitio";
import { esquemaCorreo, esquemaCrearCuenta, esquemaEntrar, esquemaNuevaContrasena, rutaSegura } from "@/lib/validacion/sesion";

describe("rutaSegura", () => {
  it("acepta rutas internas", () => {
    expect(rutaSegura("/guayaquil/restaurantes/x")).toBe("/guayaquil/restaurantes/x");
    expect(rutaSegura("/cuenta?tab=1")).toBe("/cuenta?tab=1");
  });
  it("rechaza todo lo que pueda mandar a otro sitio", () => {
    for (const malo of ["https://malo.com", "//malo.com", "/\\malo.com", "malo.com", "javascript:alert(1)", "/a\r\nSet-Cookie: x", "", null, 5, "/" + "a".repeat(300), "/\u3002evil", "/.//evil.example", "/a/../b", "/\t/evil.com"]) {
      expect(rutaSegura(malo)).toBe("/cuenta");
    }
  });
});

describe("esquemaCorreo", () => {
  it("normaliza el correo", () => {
    expect(esquemaCorreo.parse({ correo: "  Ana@Gmail.COM " }).correo).toBe("ana@gmail.com");
  });
  it("rechaza correos inválidos con un mensaje claro", () => {
    const r = esquemaCorreo.safeParse({ correo: "ana@" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/correo válido/);
    expect(esquemaCorreo.safeParse({ correo: null }).success).toBe(false);
  });
});

describe("googleActivo", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("solo se activa con NEXT_PUBLIC_GOOGLE_ACTIVO=si", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_ACTIVO", "");
    expect(googleActivo()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_ACTIVO", "true");
    expect(googleActivo()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_ACTIVO", "si");
    expect(googleActivo()).toBe(true);
  });
});

describe("contraseñas", () => {
  const correo = "ana@gmail.com";
  it("crear cuenta exige 8 caracteres y que las dos sean iguales", () => {
    expect(esquemaCrearCuenta.safeParse({ correo, contrasena: "corta", repetir: "corta" }).error?.issues[0]?.message).toMatch(/8 caracteres/);
    const distinta = esquemaCrearCuenta.safeParse({ correo, contrasena: "una frase larga", repetir: "otra frase larga" });
    expect(distinta.error?.issues[0]?.path).toEqual(["repetir"]);
    expect(esquemaCrearCuenta.safeParse({ correo, contrasena: "una frase larga", repetir: "una frase larga" }).success).toBe(true);
  });
  it("no recorta los espacios: son parte de la contraseña", () => {
    expect(esquemaNuevaContrasena.parse({ contrasena: " con espacios ", repetir: " con espacios " }).contrasena).toBe(" con espacios ");
  });
  it("rechaza más de 72 bytes (bcrypt ignora el resto), también con tildes", () => {
    expect(esquemaNuevaContrasena.safeParse({ contrasena: "a".repeat(73), repetir: "a".repeat(73) }).success).toBe(false);
    const tildes = "á".repeat(40); // 40 letras pero 80 bytes
    expect(esquemaNuevaContrasena.safeParse({ contrasena: tildes, repetir: tildes }).success).toBe(false);
  });
  it("entrar no exige el mínimo (no da pistas) pero sí que no esté vacía", () => {
    expect(esquemaEntrar.safeParse({ correo, contrasena: "x" }).success).toBe(true);
    expect(esquemaEntrar.safeParse({ correo, contrasena: "" }).success).toBe(false);
  });
});
