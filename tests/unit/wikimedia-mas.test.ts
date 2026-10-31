import { describe, expect, it } from "vitest";
import { buscarMasEnWikimedia, ErrorWikimedia } from "@/lib/wikimedia";

/*
 * Más fotos, párrafo y datos rápidos (versión 12, 40.2) con respuestas simuladas en el formato público de Wikidata
 * (wbgetentities), Commons (list=categorymembers y prop=imageinfo con varias páginas) y Wikipedia (prop=extracts).
 */

function simulador(respuestas: Record<string, unknown>) {
  const pedidas: string[] = [];
  const pedir = (async (url: string) => {
    pedidas.push(url);
    const clave = Object.keys(respuestas).find((k) => url.includes(k));
    if (!clave) return new Response("no", { status: 404 });
    return new Response(JSON.stringify(respuestas[clave]), { status: 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { pedir, pedidas };
}

const Q = "Q2364048";
const entidad = {
  entities: {
    [Q]: {
      claims: {
        P18: [{ mainsnak: { datavalue: { value: "Principal.jpg" } } }, { mainsnak: { datavalue: { value: "Otra_de_la_ficha.jpg" } } }],
        P373: [{ mainsnak: { datavalue: { value: "Parque Seminario" } } }],
        P571: [{ mainsnak: { datavalue: { value: { time: "+1895-00-00T00:00:00Z" } } } }],
        P2046: [{ mainsnak: { datavalue: { value: { amount: "+12000", unit: "http://www.wikidata.org/entity/Q25343" } } } }],
        P1435: [{ mainsnak: { datavalue: { value: { id: "Q5700000" } } } }],
        P856: [{ mainsnak: { datavalue: { value: "javascript:alert(1)" } } }],
      },
      sitelinks: { eswiki: { title: "Parque Seminario" } },
    },
  },
};
const info = (titulo: string, { ancho = 4000, alto = 3000, licencia = "CC BY-SA 4.0" } = {}) => ({
  title: `File:${titulo}`,
  imageinfo: [
    {
      thumburl: `https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/${encodeURIComponent(titulo)}/1280px-x.jpg`,
      thumbmime: "image/jpeg",
      mime: "image/jpeg",
      width: ancho,
      height: alto,
      descriptionurl: `https://commons.wikimedia.org/wiki/File:${titulo.replace(/ /g, "_")}`,
      extmetadata: { LicenseShortName: { value: licencia }, Artist: { value: "<b>Ana</b>" } },
    },
  ],
});

const respuestas = {
  "props=labels": { entities: { Q5700000: { labels: { es: { value: "Patrimonio Cultural del Ecuador" } } } } },
  "wbgetentities": entidad,
  "list=categorymembers": {
    query: { categorymembers: [{ title: "File:Iguanas.jpg" }, { title: "File:Mapa del parque.png" }, { title: "File:Pileta.jpg" }, { title: "File:Panorámica.jpg" }, { title: "File:Pequeña.jpg" }, { title: "File:No libre.jpg" }] },
  },
  "prop=imageinfo": {
    query: {
      pages: {
        "1": info("Principal.jpg"),
        "2": info("Otra de la ficha.jpg"),
        "3": info("Iguanas.jpg"),
        "4": info("Pileta.jpg"),
        "5": info("Panorámica.jpg", { ancho: 9000, alto: 2000 }),
        "6": info("Pequeña.jpg", { ancho: 640, alto: 480 }),
        "7": info("No libre.jpg", { licencia: "All rights reserved" }),
      },
    },
  },
  "prop=extracts": {
    query: {
      pages: {
        "9": {
          extract: "El Parque Seminario es un parque del centro de Guayaquil.\nEs conocido por sus iguanas, que viven entre los árboles y se acercan a la gente. Está frente a la Catedral.",
          fullurl: "https://es.wikipedia.org/wiki/Parque_Seminario",
        },
      },
    },
  },
};

describe("40.2 · más fotos, párrafo y datos rápidos", () => {
  it("trae solo fotos libres, de buen tamaño, sin mapas, sin repetir la principal y hasta el máximo", async () => {
    const { pedir } = simulador(respuestas);
    const r = await buscarMasEnWikimedia(Q, "https://commons.wikimedia.org/wiki/File:Principal.jpg", 6, pedir);
    expect(r.fotos.map((f) => f.fuente.split("File:")[1])).toEqual(["Otra_de_la_ficha.jpg", "Iguanas.jpg", "Pileta.jpg"]);
    expect(r.fotos[0]!.credito).toBe("Ana");
    expect(r.fotos.every((f) => f.url.startsWith("https://upload.wikimedia.org/"))).toBe(true);
    const dos = await buscarMasEnWikimedia(Q, null, 2, simulador(respuestas).pedir);
    expect(dos.fotos).toHaveLength(2);
  });

  it("párrafo de Wikipedia tal cual (en una línea) con su fuente, y datos rápidos validados", async () => {
    const r = await buscarMasEnWikimedia(Q, null, 6, simulador(respuestas).pedir);
    expect(r.parrafo?.fuente).toBe("https://es.wikipedia.org/wiki/Parque_Seminario");
    expect(r.parrafo?.texto).toContain("Guayaquil. Es conocido por sus iguanas");
    expect(r.datos).toEqual({ inaugurado: "1895", superficie: "1,2 hectáreas", patrimonio: "Patrimonio Cultural del Ecuador" });
    // Una "página oficial" que no es http(s) no se acepta
    expect(r.web).toBeNull();
  });

  it("no hace nada con un código raro ni con la ficha de una persona", async () => {
    const { pedir, pedidas } = simulador(respuestas);
    expect((await buscarMasEnWikimedia("Q1; drop", null, 6, pedir)).fotos).toEqual([]);
    expect(pedidas).toHaveLength(0);
    const persona = { ...respuestas, wbgetentities: { entities: { [Q]: { claims: { P31: [{ mainsnak: { datavalue: { value: { id: "Q5" } } } }], P18: entidad.entities[Q].claims.P18 } } } } };
    expect((await buscarMasEnWikimedia(Q, null, 6, simulador(persona).pedir)).fotos).toEqual([]);
  });

  it("si Wikimedia dice que está ocupado, avisa para reintentar (no lo toma como «no hay fotos»)", async () => {
    const ocupado = simulador({ wbgetentities: { error: { code: "maxlag" } } });
    await expect(buscarMasEnWikimedia(Q, null, 6, ocupado.pedir)).rejects.toBeInstanceOf(ErrorWikimedia);
  });
});
