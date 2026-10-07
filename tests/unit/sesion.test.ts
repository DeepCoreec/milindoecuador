import { afterEach, describe, expect, it, vi } from "vitest";
import { googleActivo } from "@/lib/sitio";
import { esquemaCorreo, rutaSegura } from "@/lib/validacion/sesion";

describe("rutaSegura", () => {
  it("acepta rutas internas", () => {
    expect(rutaSegura("/guayaquil/restaurantes/x")).toBe("/guayaquil/restaurantes/x");
    expect(rutaSegura("/cuenta?tab=1")).toBe("/cuenta?tab=1");
  });
  it("rechaza todo lo que pueda mandar a otro sitio", () => {
    for (const malo of ["https://malo.com", "//malo.com", "/\\malo.com", "malo.com", "javascript:alert(1)", "/a\r\nSet-Cookie: x", "", null, 5, "/" + "a".repeat(300)]) {
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
