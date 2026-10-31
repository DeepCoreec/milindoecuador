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

import { enlaceMapaRecorrido, enlacePedido, fechaEnPalabras, mensajePedido, textoPrecio } from "@/lib/recorridos";

describe("mapa y pedido del recorrido (42.3)", () => {
  const a = { lat: -2.19, lng: -79.88 };
  const b = { lat: -2.18, lng: -79.875 };
  const c = { lat: -2.181, lng: -79.874 };
  it("Google Maps a pie, de la primera a la última, con las del medio en orden", () => {
    const u = new URL(enlaceMapaRecorrido([a, b, c])!);
    expect(u.hostname).toBe("www.google.com");
    expect(u.searchParams.get("origin")).toBe("-2.190000,-79.880000");
    expect(u.searchParams.get("destination")).toBe("-2.181000,-79.874000");
    expect(u.searchParams.get("waypoints")).toBe("-2.180000,-79.875000");
    expect(u.searchParams.get("travelmode")).toBe("walking");
  });
  it("sin mapa con menos de 2 paradas", () => {
    expect(enlaceMapaRecorrido([a])).toBeNull();
  });
  it("fecha en palabras sin cambiar de día", () => {
    expect(fechaEnPalabras("2026-11-07")).toBe("sábado, 7 de noviembre");
    expect(fechaEnPalabras("2026-02-31")).toBeNull();
    expect(fechaEnPalabras("mañana")).toBeNull();
  });
  it("el mensaje lleva el recorrido, la fecha y las personas", () => {
    const m = mensajePedido("Centro a pie", "2026-11-07", 3);
    expect(m).toContain("«Centro a pie»");
    expect(m).toContain("7 de noviembre");
    expect(m).toContain("3 personas");
    expect(mensajePedido("X", "", 1)).toContain("para 1 persona");
    expect(mensajePedido("X", "", 999)).toContain("50 personas");
  });
  it("el enlace solo con un WhatsApp válido y el texto codificado", () => {
    expect(enlacePedido("0991234567", "X", "", 2)).toBeNull();
    const e = enlacePedido("593991234567", "X & Y", "", 2)!;
    expect(e.startsWith("https://wa.me/593991234567?text=")).toBe(true);
    expect(e).not.toContain("&Y");
  });
  it("texto del precio", () => {
    expect(textoPrecio(null)).toBe("Precio a convenir");
    expect(textoPrecio(15)).toBe("15 $ por persona");
    expect(textoPrecio(12.5)).toBe("12.50 $ por persona");
  });
});
