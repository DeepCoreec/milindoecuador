import { describe, expect, it } from "vitest";
import { distanciaM, textoDistancia, ubicacionAproximada } from "@/lib/cerca";

/* "Cerca de mí" (versión 8, fase 34): la ubicación se acepta solo en Ecuador y redondeada (~100 m). */
describe("cerca de mí", () => {
  it("redondea la ubicación a 3 decimales (unos 100 m) y solo la acepta dentro de Ecuador", () => {
    expect(ubicacionAproximada({ lat: -2.1894123, lng: -79.8807876 })).toEqual({ lat: -2.189, lng: -79.881 });
    expect(ubicacionAproximada({ lat: 40.4, lng: -3.7 })).toBeNull(); // Madrid
    expect(ubicacionAproximada({ lat: "-2.18", lng: -79.88 })).toBeNull();
    expect(ubicacionAproximada({ lat: Number.NaN, lng: -79.88 })).toBeNull();
    expect(ubicacionAproximada(null)).toBeNull();
  });

  it("mide distancias razonables dentro de la ciudad", () => {
    // Malecón 2000 (cerca de La Rotonda) → Parque Seminario: unos 600 m
    const d = distanciaM({ lat: -2.1919, lng: -79.8794 }, { lat: -2.1947, lng: -79.8848 });
    expect(d).toBeGreaterThan(500);
    expect(d).toBeLessThan(750);
  });

  it("dice la distancia en palabras sencillas", () => {
    expect(textoDistancia(20)).toBe("a 100 m");
    expect(textoDistancia(349)).toBe("a 350 m");
    expect(textoDistancia(1234)).toBe("a 1,2 km");
  });
});

describe("cerca de mí · lo que ve Paumi", () => {
  it("a la IA solo le llegan tramos de distancia, no metros exactos", async () => {
    const { tramoDistancia } = await import("@/lib/cerca");
    expect(tramoDistancia(120)).toBe("a menos de 300 m");
    expect(tramoDistancia(450)).toBe("a unos 300–600 m");
    expect(tramoDistancia(1500)).toBe("a 1–2 km");
    expect(tramoDistancia(7000)).toBe("a 5–8 km");
  });
});
