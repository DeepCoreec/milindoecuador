import { describe, expect, it } from "vitest";
import { nuevoVencimiento } from "@/lib/planes";

const ahora = new Date("2026-10-05T12:00:00Z");

describe("nuevoVencimiento", () => {
  it("sin destacado previo cuenta desde ahora", () => {
    expect(nuevoVencimiento(null, 7, ahora).toISOString()).toBe("2026-10-12T12:00:00.000Z");
  });
  it("si sigue vigente, suma al final", () => {
    expect(nuevoVencimiento("2026-10-08T12:00:00Z", 7, ahora).toISOString()).toBe("2026-10-15T12:00:00.000Z");
  });
  it("si ya venció, cuenta desde ahora", () => {
    expect(nuevoVencimiento("2026-09-01T00:00:00Z", 42, ahora).toISOString()).toBe("2026-11-16T12:00:00.000Z");
  });
});
