import { describe, expect, it } from "vitest";
import { esquemaRecorrido, textoDuracion } from "@/lib/validacion/recorridos";

const L = "3f1c2a4e-8b7d-4c6a-9e1f-2b3c4d5e6f70";
const S1 = "11111111-1111-4111-8111-111111111111";
const S2 = "22222222-2222-4222-8222-222222222222";
const base = {
  lugar: L,
  recorrido: "",
  nombre: "Guayaquil histórico a pie",
  descripcion: "Caminata por el Malecón, Las Peñas y el Cerro Santa Ana con historias de la ciudad.",
  duracion: "120",
  precio: "12,50",
  encuentro: "Torre Morisca",
  paradas: [S1, "", S2, "", "", "", "", ""],
  estado: "publicado",
};

describe("recorridos (versión 13, 42.2)", () => {
  it("acepta un recorrido normal, quita las paradas vacías y lee el precio con coma", () => {
    const r = esquemaRecorrido.parse(base);
    expect(r.paradas).toEqual([S1, S2]);
    expect(r.precio).toBe(12.5);
    expect(r.recorrido).toBeNull();
    expect(r.duracion).toBe(120);
  });
  it("precio vacío = a convenir", () => {
    expect(esquemaRecorrido.parse({ ...base, precio: "" }).precio).toBeNull();
  });
  it("pide al menos 2 paradas y sin repetir", () => {
    expect(esquemaRecorrido.safeParse({ ...base, paradas: [S1] }).success).toBe(false);
    expect(esquemaRecorrido.safeParse({ ...base, paradas: [S1, S1] }).success).toBe(false);
  });
  it("paradas solo con ids válidos y como mucho 8", () => {
    expect(esquemaRecorrido.safeParse({ ...base, paradas: [S1, "x' or 1=1"] }).success).toBe(false);
    expect(esquemaRecorrido.safeParse({ ...base, paradas: Array(9).fill(S1) }).success).toBe(false);
  });
  it("duración solo de la lista", () => {
    expect(esquemaRecorrido.safeParse({ ...base, duracion: "45" }).success).toBe(false);
  });
  it("precio con formato y tope", () => {
    expect(esquemaRecorrido.safeParse({ ...base, precio: "-5" }).success).toBe(false);
    expect(esquemaRecorrido.safeParse({ ...base, precio: "diez" }).success).toBe(false);
    expect(esquemaRecorrido.safeParse({ ...base, precio: "1500" }).success).toBe(false);
  });
  it("descripción de al menos 40 letras", () => {
    expect(esquemaRecorrido.safeParse({ ...base, descripcion: "Corto" }).success).toBe(false);
  });
  it("textoDuracion", () => {
    expect(textoDuracion(30)).toBe("30 minutos");
    expect(textoDuracion(60)).toBe("1 hora");
    expect(textoDuracion(150)).toBe("2 horas y 30 minutos");
  });
});
