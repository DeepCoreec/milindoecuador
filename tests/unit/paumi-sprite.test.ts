import { describe, expect, it } from "vitest";
import { caminos, componer, LADO, PALETA, POSE_QUIETA, poseDe, type EstadoPaumi } from "@/components/paumi/sprite";

const ESTADOS: EstadoPaumi[] = ["esperando", "escuchando", "pensando", "hablando", "contento"];

describe("Paumi en pixel art", () => {
  it("cada pose de cada estado es de 32 x 32 y solo usa colores de la paleta", () => {
    for (const estado of ESTADOS)
      for (let t = 0; t < 40; t++) {
        const dibujo = componer(poseDe(estado, t, t % 2 === 0));
        expect(dibujo).toHaveLength(LADO);
        for (const fila of dibujo) {
          expect(fila).toHaveLength(LADO);
          for (const c of fila) expect(c === "." || c in PALETA).toBe(true);
        }
      }
  });

  it("los colores son variables del sistema de diseño o mezclas de ellas (nada inventado)", () => {
    for (const color of Object.values(PALETA)) expect(color).toMatch(/^(var\(--[a-z-]+\)|color-mix\(in srgb, var\(--[a-z-]+\) \d+%, var\(--[a-z-]+\)\))$/);
  });

  it("el pico se abre, el ala se levanta y los ojos cambian", () => {
    const base = componer(POSE_QUIETA);
    expect(componer({ ...POSE_QUIETA, picoAbierto: true })).not.toEqual(base);
    expect(componer({ ...POSE_QUIETA, alaArriba: true }).join("").replace(/\./g, "").length).toBeGreaterThan(base.join("").replace(/\./g, "").length);
    expect(componer({ ...POSE_QUIETA, ojos: "cerrados" })).not.toEqual(base);
    expect(componer({ ...POSE_QUIETA, puntos: 3 })).not.toEqual(base);
  });

  it("al hablar, el pico lo manda quien habla (palabra por palabra)", () => {
    expect(poseDe("hablando", 5, true).picoAbierto).toBe(true);
    expect(poseDe("hablando", 5, false).picoAbierto).toBe(false);
    expect(poseDe("esperando", 5, true).picoAbierto).toBe(false);
  });

  it("el SVG sale con un camino por color y sin nada raro", () => {
    const trazos = caminos(componer(POSE_QUIETA));
    expect(trazos.length).toBeGreaterThan(5);
    for (const { d } of trazos) expect(d).toMatch(/^(M\d+ \d+h\d+v1h-\d+z)+$/);
  });
});
