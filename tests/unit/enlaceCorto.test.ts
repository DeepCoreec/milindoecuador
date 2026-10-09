import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { expandirEnlaceMaps } = await import("@/lib/enlaceCorto");
const { esEnlaceCorto, leerUbicacion } = await import("@/lib/ubicacion");

const redirige = (location: string, status = 302) => new Response(null, { status, headers: { location } });

describe("enlace corto de Google Maps", () => {
  it("reconoce los enlaces cortos de «Compartir»", () => {
    expect(esEnlaceCorto("https://maps.app.goo.gl/AbCdEf12345")).toBe(true);
    expect(esEnlaceCorto("maps.app.goo.gl/AbCdEf12345?g_st=iw")).toBe(true);
    expect(esEnlaceCorto("https://goo.gl/maps/AbCdEf12345")).toBe(true);
    expect(esEnlaceCorto("https://maps.app.goo.gl.estafa.com/x")).toBe(false);
    expect(esEnlaceCorto("-2.18, -79.88")).toBe(false);
  });

  it("saca las coordenadas del enlace largo al que lleva", async () => {
    const pedir = vi.fn(async () => redirige("https://www.google.com/maps/place/Malec%C3%B3n/@-2.19,-79.88,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-2.1894!4d-79.8808"));
    const largo = await expandirEnlaceMaps("https://maps.app.goo.gl/AbCdEf12345", pedir as unknown as typeof fetch);
    expect(leerUbicacion(largo!)).toEqual({ lat: -2.1894, lng: -79.8808 });
    expect(pedir).toHaveBeenCalledTimes(1); // el enlace largo no se abre
  });

  it("no sigue saltos fuera de Google ni pide otra cosa que enlaces cortos", async () => {
    const pedir = vi.fn(async () => redirige("https://estafa.com/maps/@-2.19,-79.88"));
    expect(await expandirEnlaceMaps("https://maps.app.goo.gl/AbCdEf12345", pedir as unknown as typeof fetch)).toBeNull();
    const nada = vi.fn();
    expect(await expandirEnlaceMaps("https://127.0.0.1/x", nada as unknown as typeof fetch)).toBeNull();
    expect(await expandirEnlaceMaps("https://google.com/maps", nada as unknown as typeof fetch)).toBeNull();
    expect(nada).not.toHaveBeenCalled();
  });

  it("si Google no responde o no redirige, devuelve null", async () => {
    const falla = vi.fn(async () => {
      throw new Error("sin red");
    });
    expect(await expandirEnlaceMaps("maps.app.goo.gl/AbCdEf12345", falla as unknown as typeof fetch)).toBeNull();
    const sinSalto = vi.fn(async () => new Response("hola", { status: 200 }));
    expect(await expandirEnlaceMaps("maps.app.goo.gl/AbCdEf12345", sinSalto as unknown as typeof fetch)).toBeNull();
  });
});
