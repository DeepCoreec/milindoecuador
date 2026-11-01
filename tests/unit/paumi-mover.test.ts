import { describe, expect, it } from "vitest";
import { ejecutar, type Estado } from "@/lib/paumi/herramientas";
import { instrucciones } from "@/lib/paumi/personaje";
import { describirPagina, leerMovimiento, rutaConFiltros } from "@/lib/paumi/secciones";
import { leerFiltros } from "@/lib/validacion/filtros";

/* Paumi mueve la página por dentro y filtra (2026-11-01) */
const estado = (): Estado => ({ vistos: new Set(), tarjetas: [], navegar: null, categorias: new Set(["restaurantes", "hoteles"]), urlsWeb: new Set(), externos: [] });

describe("mover la página", () => {
  it("solo acepta partes y acciones de la lista", async () => {
    const e = estado();
    expect((await ejecutar("mover_pagina", { seccion: "resenas" }, e)).error).toBeFalsy();
    expect(e.mover).toEqual({ seccion: "resenas", accion: undefined });
    expect((await ejecutar("mover_pagina", { seccion: "document.cookie" }, estado())).error).toBe(true);
    expect((await ejecutar("mover_pagina", {}, estado())).error).toBe(true);
    expect((await ejecutar("mover_pagina", { accion: "foto_siguiente" }, e)).error).toBeFalsy();
  });
  it("la página vuelve a revisar lo que llega", () => {
    expect(leerMovimiento({ seccion: "fotos" })).toEqual({ seccion: "fotos", accion: undefined });
    expect(leerMovimiento({ seccion: "<script>", accion: "borrar" })).toBeNull();
    expect(leerMovimiento("arriba")).toBeNull();
  });
});

describe("filtrar una categoría", () => {
  it("arma la dirección con los filtros que lee la página", async () => {
    const e = estado();
    await ejecutar("filtrar_categoria", { categoria: "restaurantes", sector: "Urdesa", precio_max: 2, orden: "calificacion" }, e);
    expect(e.navegar).toBe("/guayaquil/restaurantes?sector=Urdesa&precio=1&precio=2&orden=calificacion");
    const q = new URL(`https://x${e.navegar}`).searchParams;
    expect(leerFiltros({ sector: q.get("sector") ?? undefined, precio: q.getAll("precio"), orden: q.get("orden") ?? undefined })).toEqual({ sector: "Urdesa", precios: [1, 2], orden: "calificacion" });
  });
  it("rechaza categorías que no existen y sectores raros", async () => {
    expect((await ejecutar("filtrar_categoria", { categoria: "armas" }, estado())).error).toBe(true);
    expect((await ejecutar("filtrar_categoria", { categoria: "hoteles", sector: "x&orden=<b>" }, estado())).error).toBe(true);
  });
  it("sin filtros, solo la categoría", () => {
    expect(rutaConFiltros("guayaquil", "hoteles", {})).toBe("/guayaquil/hoteles");
  });
});

describe("Paumi sabe dónde está la persona", () => {
  it("describe la página en palabras (nunca la ruta tal cual)", () => {
    expect(describirPagina("/")).toBe("la portada");
    expect(describirPagina("/guayaquil/restaurantes")).toContain("restaurantes");
    expect(describirPagina("/guayaquil/restaurantes/la-sazon")).toContain("ficha de un lugar");
    expect(describirPagina("/admin")).toBe("otra página");
    const t = instrucciones([], false, "/guayaquil/visitar/malecon-123");
    expect(t).toContain("AHORA la persona está viendo: la página de un lugar para visitar");
    expect(t).toContain("mover_pagina");
  });
});

import { atajo } from "@/lib/paumi/secciones";

describe("atajos que hace la página sin la IA", () => {
  it("reconoce frases cortas y claras", () => {
    expect(atajo("pasa a la siguiente foto")?.movimiento).toEqual({ accion: "foto_siguiente" });
    expect(atajo("¡Otra foto!")?.movimiento).toEqual({ accion: "foto_siguiente" });
    expect(atajo("foto anterior")?.movimiento).toEqual({ accion: "foto_anterior" });
    expect(atajo("Sube")?.movimiento).toEqual({ accion: "arriba" });
    expect(atajo("muéstrame las categorías")?.movimiento).toEqual({ accion: "todas_las_categorias" });
  });
  it("lo demás se le pregunta a Paumi", () => {
    expect(atajo("dónde como encebollado")).toBeNull();
    expect(atajo("sube el volumen de la música que suena en el bar de la esquina por favor")).toBeNull();
    expect(atajo("arriba el Barcelona")).toBeNull();
  });
  it("Paumi trata de tú, como en Ecuador", async () => {
    const { instrucciones } = await import("@/lib/paumi/personaje");
    expect(instrucciones([], false)).toContain("NUNCA de vos");
  });
});
