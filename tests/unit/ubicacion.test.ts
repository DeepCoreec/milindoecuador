import { describe, expect, it } from "vitest";
import { enEcuador, enlaceRutaGoogle, enlaceRutaWaze, leerUbicacion, textoUbicacion } from "@/lib/ubicacion";
import { esquemaLugar } from "@/lib/validacion/admin";

describe("leerUbicacion", () => {
  it("lee las coordenadas como las copia Google Maps", () => {
    expect(leerUbicacion("-2.189400, -79.880800")).toEqual({ lat: -2.1894, lng: -79.8808 });
    expect(leerUbicacion("  -2.1894,-79.8808 ")).toEqual({ lat: -2.1894, lng: -79.8808 });
    expect(leerUbicacion("-2.1894 -79.8808")).toEqual({ lat: -2.1894, lng: -79.8808 });
  });
  it("lee enlaces largos de Google Maps y prefiere el pin del lugar", () => {
    expect(leerUbicacion("https://www.google.com/maps/place/Malec%C3%B3n/@-2.19,-79.88,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-2.191234!4d-79.879876")).toEqual({
      lat: -2.191234,
      lng: -79.879876,
    });
    expect(leerUbicacion("https://www.google.com/maps/@-2.2,-79.9,15z")).toEqual({ lat: -2.2, lng: -79.9 });
    expect(leerUbicacion("https://maps.google.com/?q=-2.17,-79.92")).toEqual({ lat: -2.17, lng: -79.92 });
  });
  it("vacío es null; lo que no entiende es inválido", () => {
    expect(leerUbicacion("   ")).toBeNull();
    expect(leerUbicacion("https://maps.app.goo.gl/AbCdEf123")).toBe("invalida");
    expect(leerUbicacion("Malecón 2000")).toBe("invalida");
    expect(leerUbicacion("200, 300")).toBe("invalida");
  });
});

describe("enEcuador", () => {
  it("acepta Guayaquil y Galápagos, rechaza el signo cambiado", () => {
    expect(enEcuador({ lat: -2.19, lng: -79.88 })).toBe(true);
    expect(enEcuador({ lat: -0.74, lng: -90.31 })).toBe(true);
    expect(enEcuador({ lat: 2.19, lng: 79.88 })).toBe(false);
  });
});

describe("enlaces de ruta", () => {
  const u = { lat: -2.1894, lng: -79.8808 };
  it("abren Google Maps y Waze con la ruta", () => {
    expect(enlaceRutaGoogle(u)).toBe("https://www.google.com/maps/dir/?api=1&destination=-2.1894,-79.8808");
    expect(enlaceRutaWaze(u)).toBe("https://waze.com/ul?ll=-2.1894,-79.8808&navigate=yes");
    expect(textoUbicacion(u)).toBe("-2.189400, -79.880800");
  });
});

describe("esquemaLugar.ubicacion", () => {
  const base = { id: "nuevo", nombre: "Lugar", categoria: "turismo", sector: "Centro", descripcion: "Una descripción suficientemente larga", dato: "", horario: "", direccion: "", precio: "", whatsapp: "", estado: "borrador" };
  it("acepta vacío y coordenadas válidas", () => {
    expect(esquemaLugar.parse({ ...base, ubicacion: "" }).ubicacion).toBeNull();
    expect(esquemaLugar.parse({ ...base, ubicacion: "-2.1894, -79.8808" }).ubicacion).toEqual({ lat: -2.1894, lng: -79.8808 });
  });
  it("explica el error si el punto está fuera de Ecuador", () => {
    const r = esquemaLugar.safeParse({ ...base, ubicacion: "2.1894, 79.8808" });
    expect(r.error?.issues[0]?.message).toMatch(/fuera de Ecuador/);
  });
});
