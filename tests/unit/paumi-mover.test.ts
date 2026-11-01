import { describe, expect, it } from "vitest";
import { ejecutar, type Estado } from "@/lib/paumi/herramientas";
import { contextoPagina, instrucciones } from "@/lib/paumi/personaje";
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
    expect(contextoPagina("/guayaquil/visitar/malecon-123")).toContain("AHORA la persona está viendo: la página de un lugar para visitar");
    // Las instrucciones fijas NO cambian con la página (así se guardan en la caché)
    expect(instrucciones([], false)).toBe(instrucciones([], false));
    expect(instrucciones([], false)).not.toContain("AHORA la persona");
    expect(instrucciones([], false)).toContain("mover_pagina");
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

describe("más atajos gratis: navegar sin preguntarle a Haiku (2026-11-01)", () => {
  const nada = () => false;
  it("categorías y páginas por su nombre", () => {
    expect(atajo("llévame a restaurantes", nada)?.navegar).toBe("/guayaquil/restaurantes");
    expect(atajo("Paumi, muéstrame los hoteles por favor", nada)?.navegar).toBe("/guayaquil/hoteles");
    expect(atajo("abre eventos", nada)?.navegar).toBe("/guayaquil/eventos");
    expect(atajo("cuéntame las leyendas", nada)).toBeNull(); // "cuéntame" es una pregunta: la contesta Paumi
    expect(atajo("leyendas", nada)?.navegar).toBe("/guayaquil/misterio");
    expect(atajo("ve a la guía útil", nada)?.navegar).toBe("/guayaquil/guia-util");
    expect(atajo("museos", nada)?.navegar).toBe("/guayaquil/museos");
  });
  it("partes de la página, solo si están en la página que se ve", () => {
    const hay = (ids: readonly string[]) => ids.includes("t-resenas");
    expect(atajo("baja a las reseñas", hay)?.movimiento).toEqual({ seccion: "resenas" });
    expect(atajo("baja a las reseñas", nada)).toBeNull();
    // "los guías" en Turismo baja a la sección; en otra página abre la categoría
    expect(atajo("muéstrame los guías", (ids) => ids.includes("t-guias"))?.movimiento).toEqual({ seccion: "guias" });
    expect(atajo("muéstrame los guías", nada)?.navegar).toBe("/guayaquil/guias");
  });
  it("si dicen algo más, se le pregunta a Paumi", () => {
    expect(atajo("restaurantes baratos en Urdesa", nada)).toBeNull();
    expect(atajo("¿dónde como un buen encebollado?", nada)).toBeNull();
    expect(atajo("qué hoteles me recomiendas", nada)).toBeNull();
  });
});
