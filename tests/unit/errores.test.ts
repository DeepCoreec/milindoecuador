import { describe, expect, it } from "vitest";
import { limpiarError } from "@/lib/errores";

describe("limpiarError", () => {
  it("no guarda lo que va entre comillas (suele ser lo que mandó alguien)", () => {
    expect(limpiarError(new Error('Unexpected token \'z\', "zAUDa visitá mi sitio" is not valid JSON'), "/", "action").mensaje).toBe('Unexpected token "…", "…" is not valid JSON');
  });

  it("guarda solo la ruta, sin lo que buscó la persona", () => {
    expect(limpiarError(new Error("x"), "/buscar?q=mi+casa", "render").ruta).toBe("/buscar");
  });

  it("tapa correos, tokens y teléfonos del mensaje", () => {
    const e = limpiarError(new Error("Falló para ana@correo.com con eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefghij y 0991234567"), "/cuenta", "action");
    expect(e.mensaje).toBe("Falló para [correo] con [token] y [teléfono]");
  });

  it("guarda el código (digest) de los errores de React y recorta lo largo", () => {
    const err = Object.assign(new Error("hola ".repeat(200)), { digest: "1234567890" });
    const e = limpiarError(err, "/", "render");
    expect(e.codigo).toBe("1234567890");
    expect(e.mensaje.length).toBe(500);
  });

  it("acepta cualquier cosa lanzada", () => {
    expect(limpiarError("texto", "", "route")).toEqual({ ruta: "/", tipo: "route", mensaje: "texto", codigo: null });
    expect(limpiarError(null, "/x", "proxy").mensaje).toBe("Error sin mensaje");
  });
});
