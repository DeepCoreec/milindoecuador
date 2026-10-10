import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agruparEventos, aHoraLocal, desdeHoraLocal, diaGye, enlaceCalendarioGoogle, finDeSemana, textoFechas, textoIcs, textoPrecio, vigente } from "@/lib/eventos";
import { esquemaEvento, normalizarWeb } from "@/lib/validacion/eventos";

// Miércoles 14 de octubre de 2026, 23:30 en Guayaquil (ya es jueves en UTC)
const AHORA = new Date("2026-10-15T04:30:00Z");

describe("fechas de eventos en hora de Guayaquil", () => {
  it("lee y escribe la hora local sin depender del servidor", () => {
    expect(desdeHoraLocal("2026-10-17T19:30")?.toISOString()).toBe("2026-10-18T00:30:00.000Z");
    expect(aHoraLocal("2026-10-18T00:30:00Z")).toBe("2026-10-17T19:30");
    expect(desdeHoraLocal("17/10/2026")).toBeNull();
  });

  it("el día es el de Guayaquil, no el de UTC", () => {
    expect(diaGye(AHORA)).toBe("2026-10-14");
  });

  it("el fin de semana es el que viene, o el actual si ya es sábado o domingo", () => {
    expect(finDeSemana(AHORA)).toEqual(["2026-10-17", "2026-10-18"]);
    expect(finDeSemana(new Date("2026-10-17T15:00:00Z"))).toEqual(["2026-10-17", "2026-10-18"]);
    expect(finDeSemana(new Date("2026-10-18T15:00:00Z"))).toEqual(["2026-10-17", "2026-10-18"]);
  });

  it("un evento se ve hasta el final del día de su fecha de fin", () => {
    expect(vigente({ fin: "2026-10-14T15:00:00Z" }, AHORA)).toBe(true); // terminó hoy a las 10:00
    expect(vigente({ fin: "2026-10-14T04:00:00Z" }, AHORA)).toBe(false); // terminó ayer a las 23:00
  });
});

describe("grupos de la página de eventos", () => {
  const e = (id: string, inicio: string, fin: string) => ({ id, inicio, fin });
  it("separa Hoy, Este fin de semana y Próximos sin repetir ni mostrar vencidos", () => {
    const g = agruparEventos(
      [
        e("proximo", "2026-10-20T15:00:00Z", "2026-10-20T20:00:00Z"),
        e("hoy", "2026-10-14T15:00:00Z", "2026-10-14T20:00:00Z"),
        e("varios-dias", "2026-10-10T15:00:00Z", "2026-10-25T20:00:00Z"),
        e("sabado", "2026-10-17T20:00:00Z", "2026-10-18T03:00:00Z"),
        e("vencido", "2026-10-12T15:00:00Z", "2026-10-13T20:00:00Z"),
      ],
      AHORA,
    );
    expect(g.hoy.map((x) => x.id)).toEqual(["varios-dias", "hoy"]);
    expect(g.finDeSemana.map((x) => x.id)).toEqual(["sabado"]);
    expect(g.proximos.map((x) => x.id)).toEqual(["proximo"]);
  });
});

describe("textos y calendario", () => {
  it("fechas legibles", () => {
    expect(textoFechas("2026-10-18T00:00:00Z", "2026-10-18T04:00:00Z")).toBe("Sábado 17 de octubre, de 19:00 a 23:00");
    expect(textoFechas("2026-10-17T15:00:00Z", "2026-10-20T03:00:00Z")).toBe("Del 17 de octubre (10:00) al 19 de octubre (22:00)");
    expect(textoPrecio(null)).toBe("Gratis");
    expect(textoPrecio(12.5)).toBe("$12.50");
    expect(textoPrecio(5)).toBe("$5");
  });

  it("enlace de Google Calendar y archivo .ics bien escapado", () => {
    const ev = { id: "abc", titulo: "Feria, libros; y más", inicio: "2026-10-18T00:00:00Z", fin: "2026-10-18T04:00:00Z", lugar: "Malecón 2000", url: "https://x.ec/e" };
    const g = new URL(enlaceCalendarioGoogle(ev));
    expect(g.searchParams.get("dates")).toBe("20261018T000000Z/20261018T040000Z");
    expect(g.searchParams.get("text")).toBe("Feria, libros; y más");
    const ics = textoIcs(ev);
    expect(ics).toContain("SUMMARY:Feria\\, libros\\; y más\r\n");
    expect(ics).toContain("DTSTART:20261018T000000Z");
  });
});

describe("formulario de eventos", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
  });
  afterEach(() => vi.useRealTimers());

  const base = {
    titulo: "Feria del libro",
    tipo: "feria",
    descripcion: "Libros nuevos y usados, charlas y actividades para niños.",
    inicio: "2026-10-17T10:00",
    fin: "2026-10-17T18:00",
    lugar: "Malecón 2000",
    gratis: "on",
    organizador: "Biblioteca Municipal",
  };

  it("acepta un evento bien llenado", () => {
    const r = esquemaEvento.safeParse(base);
    expect(r.success).toBe(true);
    expect(r.data?.precio).toBeNull();
    expect(r.data?.inicio.toISOString()).toBe("2026-10-17T15:00:00.000Z");
  });

  it("revisa fechas, lugar y precio", () => {
    const errores = (d: object) => {
      const r = esquemaEvento.safeParse({ ...base, ...d });
      return r.success ? [] : r.error.issues.map((i) => i.path[0]);
    };
    expect(errores({ fin: "2026-10-16T10:00" })).toContain("fin"); // antes del inicio
    expect(errores({ fin: "2026-11-30T10:00" })).toContain("fin"); // más de 30 días
    expect(errores({ inicio: "2026-10-01T10:00", fin: "2026-10-13T10:00" })).toContain("fin"); // ya pasó
    expect(errores({ inicio: "2027-06-01T10:00", fin: "2027-06-01T12:00" })).toContain("inicio"); // más de 6 meses
    expect(errores({ lugar: "" })).toContain("lugar");
    expect(errores({ lugar: "", enLinea: "on" })).toEqual([]);
    expect(errores({ gratis: undefined, precio: "" })).toContain("precio");
    expect(esquemaEvento.safeParse({ ...base, gratis: undefined, precio: "12,50" }).data?.precio).toBe(12.5);
    expect(errores({ afiche: "eventos/../x.webp" })).toContain("afiche");
    expect(errores({ tipo: "rave" })).toContain("tipo");
  });

  it("los enlaces quedan en https y se rechaza lo raro", () => {
    expect(normalizarWeb("www.ticketshow.com.ec/evento")).toBe("https://www.ticketshow.com.ec/evento");
    expect(normalizarWeb("http://mipagina.ec")).toBe("https://mipagina.ec/");
    expect(normalizarWeb("javascript:alert(1)")).toBeNull();
    expect(normalizarWeb("https://user:pass@x.com")).toBeNull();
    expect(normalizarWeb("")).toBe("");
  });
});
