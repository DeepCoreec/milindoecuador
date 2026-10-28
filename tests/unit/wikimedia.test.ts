import { describe, expect, it } from "vitest";
import { buscarEnWikimedia, descargarFoto, ErrorWikimedia, licenciaLibre, primerasFrases, textoPlano, type LugarParaBuscar } from "@/lib/wikimedia";

/*
 * Pruebas de la búsqueda en Wikimedia (versión 7, 29.3) con respuestas simuladas que copian el formato público de:
 * wbgetentities (Wikidata), page/summary (REST de Wikipedia), list=geosearch y prop=imageinfo (Commons).
 */

type Respuestas = Record<string, unknown>;
/** Un "fetch" falso: busca la primera clave contenida en la URL. Anota cada URL pedida. */
function simulador(respuestas: Respuestas) {
  const pedidas: string[] = [];
  const pedir = (async (url: string) => {
    pedidas.push(url);
    const clave = Object.keys(respuestas).find((k) => url.includes(k));
    if (!clave) return new Response("no", { status: 404 });
    const v = respuestas[clave];
    if (v instanceof Response) return v;
    return new Response(JSON.stringify(v), { status: 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { pedir, pedidas };
}

const entidad = (qid: string, { archivo = "Parque Seminario.jpg", titulo = "Parque Seminario", lat = -2.1947, lng = -79.8848 } = {}) => ({
  entities: {
    [qid]: {
      claims: {
        ...(archivo ? { P18: [{ mainsnak: { datavalue: { value: archivo } } }] } : {}),
        P625: [{ mainsnak: { datavalue: { value: { latitude: lat, longitude: lng } } } }],
      },
      sitelinks: titulo ? { eswiki: { title: titulo } } : {},
    },
  },
});
const resumen = (qid: string, titulo: string, extract = "El Parque Seminario es un parque del centro de Guayaquil. Es famoso por sus iguanas. Tiene una estatua de Simón Bolívar.") => ({
  type: "standard",
  title: titulo,
  extract,
  wikibase_item: qid,
  content_urls: { desktop: { page: `https://es.wikipedia.org/wiki/${titulo.replace(/ /g, "_")}` } },
});
const imagen = ({ licencia = "CC BY-SA 4.0", artista = '<a href="//commons.wikimedia.org/wiki/User:Ana">Ana &amp; Luis</a>', thumb = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Parque.jpg/960px-Parque.jpg", mime = "image/jpeg" } = {}) => ({
  query: {
    pages: {
      "123": {
        imageinfo: [
          {
            thumburl: thumb,
            thumbmime: mime,
            mime,
            descriptionurl: "https://commons.wikimedia.org/wiki/File:Parque_Seminario.jpg",
            extmetadata: { LicenseShortName: { value: licencia }, Artist: { value: artista } },
          },
        ],
      },
    },
  },
});

const lugar = (x: Partial<LugarParaBuscar> = {}): LugarParaBuscar => ({ nombre: "Parque Seminario", lat: -2.1947, lng: -79.8848, wikidata: null, wikipedia: null, ...x });

describe("Wikimedia · foto y descripción (29.3)", () => {
  it("con el enlace de OpenStreetMap a Wikidata trae foto con crédito y la descripción de Wikipedia", async () => {
    const { pedir, pedidas } = simulador({
      "wbgetentities&ids=Q100": entidad("Q100"),
      "page/summary/Parque_Seminario": resumen("Q100", "Parque Seminario"),
      "prop=imageinfo": imagen(),
    });
    const r = await buscarEnWikimedia(lugar({ wikidata: "Q100" }), pedir);
    expect(r.nada).toBeNull();
    expect(r.sinFoto).toBeNull();
    expect(r.wikidata).toBe("Q100");
    expect(r.foto).toEqual({
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Parque.jpg/960px-Parque.jpg",
      credito: "Ana & Luis",
      licencia: "CC BY-SA 4.0",
      fuente: "https://commons.wikimedia.org/wiki/File:Parque_Seminario.jpg",
    });
    expect(r.descripcion?.fuente).toBe("https://es.wikipedia.org/wiki/Parque_Seminario");
    expect(r.descripcion?.texto).toContain("iguanas");
    // Solo se habló con Wikimedia
    expect(pedidas.every((u) => /^https:\/\/(www\.wikidata\.org|es\.wikipedia\.org|commons\.wikimedia\.org)\//.test(u))).toBe(true);
  });

  it("con el enlace a Wikipedia en otro idioma encuentra la ficha y usa el artículo en español", async () => {
    const { pedir } = simulador({
      "en.wikipedia.org/api/rest_v1/page/summary/Seminario_Park": resumen("Q100", "Seminario Park", "Seminario Park is a park."),
      "wbgetentities&ids=Q100": entidad("Q100"),
      "es.wikipedia.org/api/rest_v1/page/summary/Parque_Seminario": resumen("Q100", "Parque Seminario"),
      "prop=imageinfo": imagen(),
    });
    const r = await buscarEnWikimedia(lugar({ wikipedia: "en:Seminario Park" }), pedir);
    expect(r.wikidata).toBe("Q100");
    expect(r.descripcion?.fuente).toContain("es.wikipedia.org");
  });

  it("sin enlace, acepta un artículo cercano solo si el nombre es parecido", async () => {
    const geo = { query: { geosearch: [{ title: "Palacio Municipal de Guayaquil", dist: 80 }, { title: "Parque Seminario (Guayaquil)", dist: 40 }] } };
    const { pedir } = simulador({
      "list=geosearch": geo,
      "page/summary/Parque_Seminario_(Guayaquil)": resumen("Q100", "Parque Seminario (Guayaquil)"),
      "wbgetentities&ids=Q100": entidad("Q100", { titulo: "Parque Seminario (Guayaquil)" }),
      "prop=imageinfo": imagen(),
    });
    const r = await buscarEnWikimedia(lugar(), pedir);
    expect(r.wikidata).toBe("Q100");
    expect(r.foto).not.toBeNull();

    const otro = simulador({ "list=geosearch": { query: { geosearch: [{ title: "Palacio Municipal de Guayaquil", dist: 80 }] } } });
    const nada = await buscarEnWikimedia(lugar(), otro.pedir);
    expect(nada.foto).toBeNull();
    expect(nada.descripcion).toBeNull();
    expect(nada.nada).toMatch(/Sin artículo/);
  });

  it("no usa una ficha de Wikidata que queda lejos del lugar (enlace equivocado en OpenStreetMap)", async () => {
    const { pedir } = simulador({ "wbgetentities&ids=Q100": entidad("Q100", { lat: -0.18, lng: -78.47 }) }); // Quito
    const r = await buscarEnWikimedia(lugar({ wikidata: "Q100" }), pedir);
    expect(r.foto).toBeNull();
    expect(r.nada).toMatch(/lejos/);
  });

  it("acepta la copia web desde thumb.wikimedia.org (como la sirve Wikimedia desde 2026)", async () => {
    const { pedir } = simulador({
      "wbgetentities&ids=Q100": entidad("Q100"),
      "page/summary/Parque_Seminario": resumen("Q100", "Parque Seminario"),
      "prop=imageinfo": imagen({ thumb: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Parque.jpg/960px-Parque.jpg" }),
    });
    const r = await buscarEnWikimedia(lugar({ wikidata: "Q100" }), pedir);
    expect(r.foto?.url).toMatch(/^https:\/\/thumb\.wikimedia\.org\//);
  });

  it("descarta fotos sin licencia libre, de otro sitio o que no son imágenes web", async () => {
    for (const mala of [
      imagen({ licencia: "CC BY-NC-SA 4.0" }),
      imagen({ licencia: "All rights reserved" }),
      imagen({ thumb: "https://ejemplo.com/foto.jpg" }),
      imagen({ mime: "image/svg+xml" }),
    ]) {
      const { pedir } = simulador({ "wbgetentities&ids=Q100": entidad("Q100"), "page/summary/Parque_Seminario": resumen("Q100", "Parque Seminario"), "prop=imageinfo": mala });
      const r = await buscarEnWikimedia(lugar({ wikidata: "Q100" }), pedir);
      expect(r.foto).toBeNull();
      expect(r.sinFoto).toBeTruthy(); // y dice por qué (29.8)
      expect(r.descripcion).not.toBeNull(); // la descripción vale por su lado
    }
  });

  it("no inventa: sin foto ni artículo en español, no hay nada", async () => {
    const { pedir } = simulador({ "wbgetentities&ids=Q100": entidad("Q100", { archivo: "", titulo: "" }) });
    const r = await buscarEnWikimedia(lugar({ wikidata: "Q100" }), pedir);
    expect(r).toMatchObject({ foto: null, descripcion: null });
    expect(r.sinFoto).toMatch(/P18/);
    expect(r.nada).toBeTruthy();
  });

  it("una página de desambiguación no sirve de descripción", async () => {
    const { pedir } = simulador({
      "wbgetentities&ids=Q100": entidad("Q100", { archivo: "" }),
      "page/summary/Parque_Seminario": { ...resumen("Q100", "Parque Seminario"), type: "disambiguation" },
    });
    const r = await buscarEnWikimedia(lugar({ wikidata: "Q100" }), pedir);
    expect(r.descripcion).toBeNull();
  });

  it("ignora enlaces con forma rara y avisa si Wikimedia falla", async () => {
    const { pedir, pedidas } = simulador({ "list=geosearch": { query: { geosearch: [] } } });
    await buscarEnWikimedia(lugar({ wikidata: "Q1; drop", wikipedia: "javascript:alert(1)" }), pedir);
    expect(pedidas.some((u) => u.includes("drop") || u.includes("javascript"))).toBe(false);
    const caido = simulador({ "list=geosearch": new Response("x", { status: 503 }) });
    await expect(buscarEnWikimedia(lugar(), caido.pedir)).rejects.toBeInstanceOf(ErrorWikimedia);
  });
});

describe("Wikimedia · arreglos de la revisión independiente del 2026-10-28", () => {
  const sinUbicacion = (titulo: string) => {
    const e = entidad("Q100", { titulo });
    delete (e.entities.Q100.claims as Record<string, unknown>).P625;
    return e;
  };

  it("1 · una ficha sin ubicación solo vale si su nombre coincide con el lugar", async () => {
    const malo = simulador({ "wbgetentities&ids=Q100": sinUbicacion("Logotipo de una empresa"), "prop=imageinfo": imagen() });
    const r = await buscarEnWikimedia(lugar({ wikidata: "Q100" }), malo.pedir);
    expect(r.foto).toBeNull();
    expect(r.nada).toMatch(/no tiene ubicación/);
    const bueno = simulador({
      "wbgetentities&ids=Q100": sinUbicacion("Parque Seminario"),
      "page/summary/Parque_Seminario": resumen("Q100", "Parque Seminario"),
      "prop=imageinfo": imagen(),
    });
    expect((await buscarEnWikimedia(lugar({ wikidata: "Q100" }), bueno.pedir)).foto).not.toBeNull();
  });

  it("2 · un error que no se arregla solo (400) es permanente; uno pasajero (429, 503) no", async () => {
    const malo = simulador({ "page/summary": new Response("x", { status: 400 }) });
    await expect(buscarEnWikimedia(lugar({ wikipedia: "es:Título|raro" }), malo.pedir)).rejects.toMatchObject({ permanente: true });
    for (const status of [429, 503]) {
      const pasajero = simulador({ "wbgetentities": new Response("x", { status }) });
      await expect(buscarEnWikimedia(lugar({ wikidata: "Q100" }), pasajero.pedir)).rejects.toMatchObject({ permanente: false });
    }
  });

  it("29.11 · 'demasiado ocupado' de Wikipedia es pasajero (se reintenta), no 'no hay artículo'", async () => {
    const ocupado = simulador({ "list=geosearch": { error: { code: "cirrussearch-too-busy-error", info: "Search is currently too busy" } } });
    await expect(buscarEnWikimedia(lugar(), ocupado.pedir)).rejects.toMatchObject({ permanente: false });
    const raro = simulador({ "wbgetentities": { error: { code: "no-such-entity" } } });
    await expect(buscarEnWikimedia(lugar({ wikidata: "Q100" }), raro.pedir)).rejects.toMatchObject({ permanente: true });
  });

  it("29.12 · no usa la ficha de una persona (un monumento enlazado a la persona traería su retrato)", async () => {
    const e = entidad("Q100", { titulo: "Gabriel García Moreno" });
    (e.entities.Q100.claims as Record<string, unknown>).P31 = [{ mainsnak: { datavalue: { value: { "entity-type": "item", id: "Q5" } } } }];
    const { pedir } = simulador({ "wbgetentities&ids=Q100": e, "prop=imageinfo": imagen() });
    const r = await buscarEnWikimedia(lugar({ nombre: "Presidente Gabriel García Moreno", wikidata: "Q100" }), pedir);
    expect(r.foto).toBeNull();
    expect(r.nada).toMatch(/persona/);
  });

  it("3 · se corta si se acaba el tiempo", async () => {
    const lento = (async (_u: string, init: RequestInit) =>
      new Promise((_, rechazar) => init.signal?.addEventListener("abort", () => rechazar(new DOMException("corte", "AbortError"))))) as unknown as typeof fetch;
    await expect(buscarEnWikimedia(lugar({ wikidata: "Q100" }), lento, AbortSignal.timeout(50))).rejects.toThrow();
  });

  it("6 · si Wikimedia redirige a otro sitio, no se usa la respuesta", async () => {
    const redirigido = (async () => {
      const r = new Response(JSON.stringify(entidad("Q100")), { status: 200 });
      Object.defineProperty(r, "url", { value: "https://malo.example.com/x" });
      return r;
    }) as unknown as typeof fetch;
    await expect(buscarEnWikimedia(lugar({ wikidata: "Q100" }), redirigido)).rejects.toMatchObject({ permanente: true });
  });

  it("7 · corta la descarga al pasar 5 MB aunque el servidor no diga el tamaño", async () => {
    const enorme = (async () => {
      const trozo = new Uint8Array(1_000_000);
      let n = 0;
      const cuerpo = new ReadableStream<Uint8Array>({ pull: (c) => (n++ < 10 ? c.enqueue(trozo) : c.close()) });
      return new Response(cuerpo, { status: 200, headers: { "content-type": "image/jpeg" } });
    }) as unknown as typeof fetch;
    await expect(descargarFoto("https://upload.wikimedia.org/x/a.jpg", enorme)).rejects.toThrow(/5 MB/);
  });
});

describe("Wikimedia · ayudantes", () => {
  it("licencias libres", () => {
    for (const l of ["CC BY-SA 4.0", "CC BY 2.0", "CC0", "CC0 1.0", "Public domain", "CC BY-SA 3.0 igo", "PD-US"]) expect(licenciaLibre(l), l).toBe(true);
    for (const l of ["CC BY-NC 2.0", "CC BY-ND 4.0", "GFDL", "Copyrighted", "Fair use", ""]) expect(licenciaLibre(l), l).toBe(false);
  });

  it("el crédito es texto plano, sin etiquetas ni letras invisibles", () => {
    expect(textoPlano('<a href="x" onclick="alert(1)">Juan</a> <script>x</script>&lt;b&gt;‮', 100)).toBe("Juan x <b>");
  });

  it("la descripción son las primeras frases completas, hasta 300 letras", () => {
    const largo = `${"Primera frase con datos del lugar. ".repeat(5)}${"Otra más. ".repeat(40)}`;
    const d = primerasFrases(largo);
    expect(d.length).toBeLessThanOrEqual(300);
    expect(d.endsWith(".")).toBe(true);
    const sinPunto = primerasFrases("palabra ".repeat(80));
    expect(sinPunto.length).toBeLessThanOrEqual(300);
    expect(sinPunto.endsWith("…")).toBe(true);
  });

  it("descarga solo de upload.wikimedia.org, solo imágenes web y de tamaño razonable", async () => {
    const ok = (async () => new Response(new Uint8Array(5000), { status: 200, headers: { "content-type": "image/jpeg" } })) as unknown as typeof fetch;
    const f = await descargarFoto("https://upload.wikimedia.org/x/960px-a.jpg", ok);
    expect(f.extension).toBe("jpg");
    expect((await descargarFoto("https://thumb.wikimedia.org/wikipedia/commons/x/960px-a.jpg", ok)).extension).toBe("jpg");
    await expect(descargarFoto("https://thumb.wikimedia.org.malo.com/a.jpg", ok)).rejects.toBeInstanceOf(ErrorWikimedia);
    await expect(descargarFoto("https://ejemplo.com/a.jpg", ok)).rejects.toBeInstanceOf(ErrorWikimedia);
    const svg = (async () => new Response("<svg/>", { status: 200, headers: { "content-type": "image/svg+xml" } })) as unknown as typeof fetch;
    await expect(descargarFoto("https://upload.wikimedia.org/x/a.svg", svg)).rejects.toBeInstanceOf(ErrorWikimedia);
  });
});
