import { describe, expect, it } from "vitest";
import { enlaceComoLlegar, enlaceWhatsApp, fechaLarga, mostrarWhatsApp } from "@/lib/enlaces";

describe("enlaceWhatsApp", () => {
  it("arma el enlace con el saludo escapado", () => {
    const e = enlaceWhatsApp("593986225038", "Café & Pan")!;
    expect(e.startsWith("https://wa.me/593986225038?text=")).toBe(true);
    expect(e).toContain("Caf%C3%A9%20%26%20Pan");
    expect(e).not.toContain(" ");
  });
  it("sin número o con un número raro no hay enlace", () => {
    expect(enlaceWhatsApp(null, "x")).toBeNull();
    expect(enlaceWhatsApp("0986225038", "x")).toBeNull();
    expect(enlaceWhatsApp("593986225038?text=hack", "x")).toBeNull();
    expect(enlaceWhatsApp("javascript:alert(1)", "x")).toBeNull();
  });
});

describe("mostrarWhatsApp", () => {
  it("separa el número para leerlo fácil", () => {
    expect(mostrarWhatsApp("593986225038")).toBe("+593 98 622 5038");
  });
});

describe("enlaceComoLlegar", () => {
  it("busca nombre, dirección y ciudad en Google Maps", () => {
    expect(enlaceComoLlegar("Malecón 2000", "Av. Malecón", "Guayaquil")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Malec%C3%B3n%202000%2C%20Av.%20Malec%C3%B3n%2C%20Guayaquil%2C%20Ecuador",
    );
  });
  it("funciona sin dirección", () => {
    expect(enlaceComoLlegar("Isla Santay", null, "Guayaquil")).toContain("Isla%20Santay%2C%20Guayaquil");
  });
});

describe("fechaLarga", () => {
  it("usa la hora de Ecuador: las 3 de la mañana UTC todavía es el día anterior", () => {
    expect(fechaLarga("2026-09-13T03:00:00Z")).toBe("12 de septiembre de 2026");
  });
});
