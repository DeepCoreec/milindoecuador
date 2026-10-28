import { describe, expect, it } from "vitest";
import { aplicarReglas, nombresParecidos, normalizar, type SitioParaRevisar } from "@/lib/agente/reglas";

// Las 51 decisiones del admin del 2026-10-28 (docs/revisiones/guia-util-2026-10-28.md).
const s = (nombre: string, tipo: string, grupo = "visitar"): SitioParaRevisar => ({ id: nombre, nombre, tipo, grupo });

const PUBLICADOS: SitioParaRevisar[] = [
  ...[
    "Archivo Histórico del Guayas", "Casa de la Cultura", "Guayaquil en la Historía", "Museo Antropológico y de Arte Contemporáneo",
    "Museo de la Música Popular Julio Jaramillo", "Museo del Astillero Barcelona y Emelec", 'Museo del Bombero "Félix Luque Plata"',
    'Museo Memorial BAE "Abdón Calderón"', "Museo Municipal de Guayaquil", "Museo Nahim Isaías", "Museo Naval - El Fortín de Santa Ana",
    "Museo Presley Norton", "Parque Histórico",
  ].map((n) => s(n, "museo")),
  ...["Faro del Cerro Santa Ana", "La Perla rueda moscovita", "Monumento a José Joaquín de Olmedo", "Puerto Santa Ana", "Torre Morisca"].map((n) => s(n, "atraccion")),
  ...["Mirador de Cerro Paraíso", "Mirador de Orión", "Mirador Mapasingue Este"].map((n) => s(n, "mirador")),
  ...["Cuatro Mosqueteros", "Durán", "Julián Coronel", "Parque Centenario"].map((n) => s(n, "aerovia", "transporte")),
  ...["Estación Metrovía - Guasmo Sur", "Terminal Metrovia - 25 De Julio", "Terminal Troncal 4 Metrovia, Batallón del Suburbio"].map((n) => s(n, "metrovia", "transporte")),
];

// Descartados que las reglas deben atrapar solas (los demás quedan para Claude o son duplicados)
const DESCARTADOS_POR_REGLA: SitioParaRevisar[] = [
  ...["Andrea's Home", "bazar", "Casa familia Z S", "Farmacia Bolivar", "Parque Infantil", "Parque del Bloque 3"].map((n) => s(n, "atraccion")),
  ...[
    "Etapa Zafiro", "mirador", "Mirador", "Palco Nº 2", "Palco Nº 3", "Palco Nº 4", "Romareda Etapa 3", "Servicios Higiénicos",
    "Urb. Matices", "Urbanización Renacer",
  ].map((n) => s(n, "mirador")),
];
// Descartados que necesitan criterio: las reglas no deben adivinar
const DESCARTADOS_PARA_IA = [s("dB ProMedia Durán", "atraccion"), s("QUISAPINCHA", "atraccion")];

describe("reglas del agente revisor de la Guía útil", () => {
  it("nunca descartan ni mandan a revisar uno de los 28 que el admin publicó", () => {
    for (const p of PUBLICADOS) expect(aplicarReglas(p), p.nombre).toBeNull();
  });

  it("descartan solas los 16 casos obvios que el admin descartó", () => {
    for (const p of DESCARTADOS_POR_REGLA) expect(aplicarReglas(p)?.veredicto, p.nombre).toBe("descartar");
  });

  it("dejan a Claude los casos que piden criterio", () => {
    for (const p of DESCARTADOS_PARA_IA) expect(aplicarReglas(p), p.nombre).toBeNull();
  });

  it("dan un motivo corto y entendible", () => {
    for (const p of DESCARTADOS_POR_REGLA) {
      const r = aplicarReglas(p)!;
      expect(r.motivo.length).toBeGreaterThan(5);
      expect(r.motivo.length).toBeLessThanOrEqual(200);
    }
  });

  it("detectan duplicados del mismo tipo a menos de 300 m (los 4 de la revisión)", () => {
    const pares: [string, string][] = [
      ['Museo Memorial “Abdón Calderón”', 'Museo Memorial BAE "Abdón Calderón"'],
      ["Museo Municipal de la Música Popular", "Museo de la Música Popular Julio Jaramillo"],
      ["Museo del Benemérito Cuerpo de Bomberos de Guayaquil", 'Museo del Bombero "Félix Luque Plata"'],
      ["Museo de los Equipos del Astillero", "Museo del Astillero Barcelona y Emelec"],
    ];
    let encontrados = 0;
    for (const [a, b] of pares) {
      const uno = { ...s(a, "museo"), lat: -2.19, lng: -79.88 };
      const otro = { ...s(b, "museo"), lat: -2.1905, lng: -79.8803 };
      if (aplicarReglas(uno, [otro])?.veredicto === "revisar") encontrados++;
    }
    // Con solo el nombre, al menos la mitad se reconoce; el resto lo ve Claude o el admin
    expect(encontrados).toBeGreaterThanOrEqual(2);
  });

  it("no confunden lugares distintos con palabras de tipo en común (casos reales de la primera corrida)", () => {
    const cerca = (a: string, b: string, tipo = "monumento") =>
      aplicarReglas({ ...s(a, tipo), lat: -2.19, lng: -79.88 }, [{ ...s(b, tipo), id: `otro-${b}`, lat: -2.1901, lng: -79.8801 }]);
    expect(cerca("Estatua de Las Artes Aplicadas (Oficios)", "Estatua de Las Artes Mayores")).toBeNull();
    expect(cerca('Monumento "Elemento Fuego"', 'Monumento "Elemento Tierra"')).toBeNull();
    // Y siguen siendo duplicados los que sí lo son
    expect(cerca("Los Aurigas", "Los Aurigas")?.veredicto).toBe("revisar");
    expect(cerca("Orquideas", "Monumento a Las Orquideas")?.veredicto).toBe("revisar");
  });

  it("no confunden lugares distintos aunque estén cerca", () => {
    const uno = { ...s("Museo Nahim Isaías", "museo"), lat: -2.19, lng: -79.88 };
    const otro = { ...s("Museo Municipal de Guayaquil", "museo"), lat: -2.1902, lng: -79.8801 };
    expect(aplicarReglas(uno, [otro])).toBeNull();
  });

  it("no marcan duplicado si está lejos o es de otro tipo", () => {
    const uno = { ...s("Mirador de Cerro Paraíso", "mirador"), lat: -2.19, lng: -79.88 };
    expect(aplicarReglas(uno, [{ ...s("Mirador de Cerro Paraíso", "mirador", "visitar"), id: "x", lat: -2.15, lng: -79.9 }])).toBeNull();
    expect(aplicarReglas(uno, [{ ...s("Mirador de Cerro Paraíso", "parque"), id: "y", lat: -2.19, lng: -79.88 }])).toBeNull();
  });

  it("normalizan tildes y signos", () => {
    expect(normalizar("  Urb. MATICES ")).toBe("urb matices");
    expect(nombresParecidos("Parque Histórico", "parque historico")).toBe(true);
  });
});
