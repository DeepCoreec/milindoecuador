import { describe, expect, it } from "vitest";
import { ahoraEnEcuador, estadoAhora, leerHorario, resumenHorario, type Horario } from "@/lib/horario";
import { esquemaLugar } from "@/lib/validacion/admin";

// Fechas en UTC: Guayaquil es UTC-5 todo el año. 2026-10-05 fue lunes.
const en = (dia: number, hora: string) => new Date(`2026-10-${String(5 + dia).padStart(2, "0")}T${hora}:00-05:00`);
const semana: Horario = { lun: ["08:00", "22:00"], mar: ["08:00", "22:00"], vie: ["18:00", "02:00"], sab: ["10:00", "10:00"] };

describe("ahoraEnEcuador", () => {
  it("usa la hora de Guayaquil", () => {
    expect(ahoraEnEcuador(new Date("2026-10-06T03:30:00Z"))).toEqual({ dia: "lun", minuto: 22 * 60 + 30 });
  });
});

describe("estadoAhora", () => {
  it("abierto dentro del horario", () => {
    expect(estadoAhora(semana, en(0, "12:00"))).toEqual({ abierto: true, texto: "Abierto · cierra a las 22:00" });
  });
  it("cerrado antes de abrir y después de cerrar", () => {
    expect(estadoAhora(semana, en(0, "07:15")).texto).toBe("Cerrado · abre a las 8:00");
    expect(estadoAhora(semana, en(0, "22:00")).texto).toBe("Cerrado · abre mañana a las 8:00");
    expect(estadoAhora(semana, en(1, "23:00")).texto).toBe("Cerrado · abre el viernes a las 18:00");
  });
  it("después de medianoche sigue abierto el horario del día anterior", () => {
    const noche: Horario = { vie: ["18:00", "02:00"], sab: ["10:00", "20:00"] };
    expect(estadoAhora(noche, en(4, "23:00")).abierto).toBe(true);
    expect(estadoAhora(noche, en(5, "01:30")).texto).toBe("Abierto · cierra a las 2:00");
    expect(estadoAhora(noche, en(5, "03:00")).texto).toBe("Cerrado · abre a las 10:00");
  });
  it("apertura igual al cierre: 24 horas", () => {
    expect(estadoAhora(semana, en(5, "23:59")).texto).toBe("Abierto las 24 horas");
  });
});

describe("resumenHorario y leerHorario", () => {
  it("junta días seguidos iguales", () => {
    expect(resumenHorario(semana)).toEqual(["Lun a mar: 8:00 – 22:00", "Mié a jue: cerrado", "Vie: 18:00 – 2:00", "Sáb: 24 horas", "Dom: cerrado"]);
  });
  it("ignora lo que no tiene la forma correcta", () => {
    expect(leerHorario({ lun: ["8", "22:00"], mar: ["08:00", "22:00"], xyz: 1 })).toEqual({ mar: ["08:00", "22:00"] });
    expect(leerHorario([1])).toBeNull();
    expect(leerHorario({})).toBeNull();
  });
});

describe("esquemaLugar.horarioDias", () => {
  const base = { id: "nuevo", nombre: "Lugar", categoria: "turismo", sector: "Centro", descripcion: "Una descripción suficientemente larga", dato: "", horario: "", direccion: "", precio: "", whatsapp: "", estado: "borrador" };
  it("acepta el JSON del editor y vacío", () => {
    expect(esquemaLugar.parse({ ...base, horarioDias: '{"lun":["08:00","22:00"]}' }).horarioDias).toEqual({ lun: ["08:00", "22:00"] });
    expect(esquemaLugar.parse({ ...base, horarioDias: "" }).horarioDias).toBeNull();
    expect(esquemaLugar.parse(base).horarioDias).toBeNull();
  });
  it("rechaza horas inválidas", () => {
    expect(esquemaLugar.safeParse({ ...base, horarioDias: '{"lun":["25:00","22:00"]}' }).success).toBe(false);
    expect(esquemaLugar.safeParse({ ...base, horarioDias: "no es json" }).success).toBe(false);
  });
});
