import { describe, expect, it } from "vitest";
import { sugerirCategoria } from "@/lib/busqueda-dicha";
import { buscarConSugerencia } from "@/lib/datos/lugares";

const cat = (q: string) => sugerirCategoria(q)?.categoria ?? null;

describe("diccionario del buscador (fase 44.1)", () => {
  it("entiende lo que la gente dice, no solo el nombre de la categoría", () => {
    expect(cat("almuerzo")).toBe("restaurantes");
    expect(cat("donde comer ceviche")).toBe("restaurantes");
    expect(cat("encebollado")).toBe("restaurantes");
    expect(cat("hostal barato")).toBe("hoteles");
    expect(cat("gimnasio")).toBe("ejercicio");
    expect(cat("piscina")).toBe("ejercicio");
    expect(cat("karaoke")).toBe("vida-nocturna");
    expect(cat("helado")).toBe("cafes");
    expect(cat("museo de arte")).toBe("museos");
    expect(cat("arreglar celular")).toBe("reparaciones");
    expect(cat("tour por la ciudad")).toBe("guias");
    expect(cat("juegos para ninos")).toBe("ninos");
  });

  it("no le importan las tildes ni las mayúsculas", () => {
    expect(cat("Almuerzo")).toBe("restaurantes");
    expect(cat("CAFÉ")).toBe("cafes");
    expect(cat("niños")).toBe("ninos");
    expect(cat("guía")).toBe("guias");
  });

  it("perdona un error de escritura en palabras largas", () => {
    expect(cat("encebolado")).toBe("restaurantes"); // falta una letra
    expect(cat("parrilada")).toBe("restaurantes"); // falta una «l»
    expect(cat("parilada")).toBeNull(); // faltan dos letras: ya no se adivina
    expect(cat("discoteka")).toBe("vida-nocturna");
  });

  it("no inventa: palabras cortas o desconocidas no se adivinan", () => {
    expect(cat("zzzzzz")).toBeNull();
    expect(cat("xyz")).toBeNull();
    expect(cat("")).toBeNull();
    expect(cat("   ")).toBeNull();
    expect(cat("bar")).toBe("vida-nocturna"); // exacta
    expect(cat("baz")).toBeNull(); // parecida a «bar» pero corta: no se perdona
  });

  it("si hay palabras de varias categorías, gana la que más acierta", () => {
    expect(cat("comer ceviche y helado")).toBe("restaurantes"); // 2 de restaurantes y 1 de cafés
  });

  it("los caracteres raros no rompen nada", () => {
    expect(cat("<script>%' or 1=1")).toBeNull();
    expect(cat("almuerzo <b>")).toBe("restaurantes");
  });

  it("devuelve el nombre de la categoría para mostrarlo", () => {
    expect(sugerirCategoria("gimnasio")).toEqual({ categoria: "ejercicio", nombre: "Dónde hacer ejercicio" });
  });
});

describe("buscarConSugerencia (la búsqueda completa)", () => {
  it("«almuerzo» ya no sale vacío: muestra los restaurantes y dice por qué", async () => {
    const r = await buscarConSugerencia("guayaquil", "almuerzo");
    expect(r.sugerida?.categoria).toBe("restaurantes");
    expect(r.lugares.length).toBeGreaterThan(5);
    expect(r.lugares.every((l) => l.categoria === "restaurantes")).toBe(true);
  });
  it("«donde comer ceviche» también", async () => {
    expect((await buscarConSugerencia("guayaquil", "donde comer ceviche")).sugerida?.categoria).toBe("restaurantes");
  });
  it("si la búsqueda normal encuentra algo, no se usa el diccionario", async () => {
    const r = await buscarConSugerencia("guayaquil", "malecon");
    expect(r.sugerida).toBeNull();
    expect(r.lugares.map((l) => l.nombre)).toContain("Malecón 2000");
  });
  it("lo que no se entiende sigue saliendo vacío (la página ofrecerá las categorías)", async () => {
    expect(await buscarConSugerencia("guayaquil", "zzzzzz")).toEqual({ lugares: [], sugerida: null });
  });
  it("otra ciudad no tiene lugares todavía", async () => {
    expect(await buscarConSugerencia("quito", "almuerzo")).toEqual({ lugares: [], sugerida: null });
  });
});
