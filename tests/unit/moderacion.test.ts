import { describe, expect, it } from "vitest";
import { mensajeModeracion } from "@/lib/moderacion";
import { esquemaPalabra } from "@/lib/validacion/admin";

describe("mensajeModeracion", () => {
  it("traduce los rechazos de la base", () => {
    expect(mensajeModeracion({ message: "texto_no_permitido:descripcion:telefono" })).toMatch(/^La descripción no puede llevar números de teléfono/);
    expect(mensajeModeracion({ message: "texto_no_permitido:resena:palabra" })).toMatch(/^Tu reseña tiene palabras que no se permiten/);
    expect(mensajeModeracion({ message: "texto_no_permitido:respuesta:enlace" })).toMatch(/^La respuesta no puede llevar enlaces/);
    expect(mensajeModeracion({ message: "limite_fotos" })).toMatch(/15 fotos/);
  });
  it("ignora otros errores", () => {
    expect(mensajeModeracion({ message: "duplicate key" })).toBeNull();
    expect(mensajeModeracion(null)).toBeNull();
  });
});

describe("esquemaPalabra", () => {
  it("acepta letras con tildes y espacios, nada más", () => {
    expect(esquemaPalabra.safeParse({ palabra: " Hijo de puta " }).success).toBe(true);
    expect(esquemaPalabra.safeParse({ palabra: "coño" }).success).toBe(true);
    expect(esquemaPalabra.safeParse({ palabra: "a%" }).success).toBe(false);
    expect(esquemaPalabra.safeParse({ palabra: "x" }).success).toBe(false);
  });
});
