import { describe, expect, it } from "vitest";
import { partirEnPantallas, pausaDespuesDe, picoAbiertoEn, suenaEn, tiempoDeLectura } from "@/lib/paumi/pantallas";

describe("el cuadro de diálogo de Paumi", () => {
  it("un texto corto cabe en una pantalla", () => {
    expect(partirEnPantallas("¡Hola! ¿Qué buscas hoy?")).toEqual(["¡Hola! ¿Qué buscas hoy?"]);
  });

  it("un texto largo se parte sin cortar palabras ni perder nada", () => {
    const texto = "El encebollado es la sopa de pescado más querida de Guayaquil. ".repeat(6).trim();
    const pantallas = partirEnPantallas(texto, 120);
    expect(pantallas.length).toBeGreaterThan(1);
    for (const p of pantallas) expect(p.length).toBeLessThanOrEqual(120);
    expect(pantallas.join(" ")).toBe(texto);
    // Prefiere terminar en un punto
    expect(pantallas[0].endsWith(".")).toBe(true);
  });

  it("una palabra larguísima se corta a la fuerza y el texto vacío da una pantalla vacía", () => {
    const pantallas = partirEnPantallas("a".repeat(250), 120);
    expect(pantallas.map((p) => p.length)).toEqual([120, 120, 10]);
    expect(partirEnPantallas("   ")).toEqual([""]);
  });

  it("el pico se abre y se cierra dentro de cada palabra y se cierra en los espacios", () => {
    const t = "Hola pana";
    expect([...t].map((_, i) => picoAbiertoEn(t, i))).toEqual([true, true, false, false, false, true, true, false, false]);
  });

  it("el blip suena solo en letras, una sí y otra no; las pausas son más largas en los signos", () => {
    expect(suenaEn("a b", 0)).toBe(true);
    expect(suenaEn("a b", 1)).toBe(false);
    expect(suenaEn("ab", 1)).toBe(false);
    expect(pausaDespuesDe(".")).toBeGreaterThan(pausaDespuesDe(","));
    expect(pausaDespuesDe(",")).toBeGreaterThan(pausaDespuesDe("a"));
  });

  it("el tiempo de lectura crece con el texto, entre 5 y 20 segundos", () => {
    expect(tiempoDeLectura("Hola")).toBe(5000);
    expect(tiempoDeLectura("palabra ".repeat(30))).toBeGreaterThan(5000);
    expect(tiempoDeLectura("palabra ".repeat(500))).toBe(20000);
  });
});
