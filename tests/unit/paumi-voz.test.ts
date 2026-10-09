import { describe, expect, it } from "vitest";
import { elegirVoz, idiomaMicrofono, textoParaVoz } from "@/lib/paumi/voz";

describe("la voz de Paumi", () => {
  it("elige español de Ecuador o de América antes que de España, y las voces del propio teléfono primero", () => {
    const voces = [
      { lang: "en-US", name: "Inglés" },
      { lang: "es-ES", name: "España" },
      { lang: "es-MX", name: "México en línea", localService: false },
      { lang: "es-MX", name: "México", localService: true },
    ];
    expect(elegirVoz(voces)?.name).toBe("México");
    expect(elegirVoz([...voces, { lang: "es_EC", name: "Ecuador" }])?.name).toBe("Ecuador");
    expect(elegirVoz([{ lang: "es-ES", name: "España" }, { lang: "es-AR", name: "Argentina" }])?.name).toBe("Argentina");
    expect(elegirVoz([{ lang: "en-US", name: "Inglés" }])).toBeNull();
  });

  it("escucha en el español del teléfono o, si no, en español de Ecuador", () => {
    expect(idiomaMicrofono("es-EC")).toBe("es-EC");
    expect(idiomaMicrofono("es-419")).toBe("es-419");
    expect(idiomaMicrofono("en-US")).toBe("es-EC");
    expect(idiomaMicrofono(undefined)).toBe("es-EC");
  });

  it("lee el texto sin deletrear signos", () => {
    expect(textoParaVoz("Llama (mira el WhatsApp en la ficha). Precio: $")).toBe("Llama mira el WhatsApp en la ficha . Precio: dólares");
  });
});
