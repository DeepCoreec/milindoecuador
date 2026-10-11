import { expect, test } from "@playwright/test";
import { admin, crearUsuario, iniciarSesion, limpiar } from "./ayudas";

/*
 * Versión 5, fase 23: Guía útil, aparte de los negocios. La importación usa una imitación de la API Overpass
 * (tests/paumi/simulador.mjs, OVERPASS_URL) con 6 lugares de prueba (ids 900001 a 900006).
 */
test.afterAll(async () => {
  await admin().from("city_spots").delete().gte("osm_id", 900000).lte("osm_id", 900099);
  await limpiar();
});

test("el admin trae lugares de OpenStreetMap, publica algunos y se ven en la Guía útil y en Paumi", async ({ browser, baseURL, request }, info) => {
  test.skip(info.project.name !== "escritorio", "un flujo completo basta en un tamaño");
  const db = admin();
  await db.from("city_spots").delete().gte("osm_id", 900000).lte("osm_id", 900099);
  const a = await crearUsuario("admin-guia", true);
  const ctx = await browser.newContext();
  await iniciarSesion(ctx, a.correo, baseURL!);
  const p = await ctx.newPage();
  await p.goto(new URL("/admin/guia", baseURL).toString());
  await p.getByRole("button", { name: "Traer lugares de OpenStreetMap" }).click();
  // 6 en la respuesta: el del nombre con groserías lo frena el filtro de palabras
  await expect(p.getByText(/6 lugares en OpenStreetMap, 5 nuevos para revisar y 1 saltados/)).toBeVisible();
  await p.reload();
  await expect(p.getByText("Farmacia de prueba OSM")).toBeVisible();
  // Nada se ve en público hasta publicarlo
  expect(await (await request.get("/guayaquil/guia-util")).text()).not.toContain("Farmacia de prueba OSM");

  await p.getByLabel(/Farmacia de prueba OSM/).check();
  await p.getByLabel(/Museo de prueba OSM/).check();
  await p.getByRole("button", { name: "Publicar marcados" }).click();
  await expect(p.getByText("2 lugares publicados")).toBeVisible();

  const pub = await ctx.newPage();
  await pub.goto(new URL("/guayaquil/guia-util", baseURL).toString());
  await expect(pub.getByText("Museo de prueba OSM")).toBeVisible();
  await expect(pub.getByRole("link", { name: "Cómo llegar a Farmacia de prueba OSM" })).toHaveAttribute("href", /google\.com\/maps\/dir\/.*destination=-2\.16,-79\.9/);
  await expect(pub.getByText("Tecnicel de prueba OSM")).toHaveCount(0); // sigue pendiente
  await expect(pub.getByRole("link", { name: "colaboradores de OpenStreetMap" })).toBeVisible();

  // Paumi lo recomienda con su tarjeta (y no muestra ids que no buscó)
  await db.from("paumi_usage").delete().gte("n", 0);
  const r = await request.post("/api/paumi", { data: { mensajes: [{ rol: "usuario", texto: "necesito una farmacia" }] }, headers: { origin: baseURL! } });
  const datos = await r.json();
  expect(datos.externos).toHaveLength(1);
  expect(datos.externos[0]).toMatchObject({ nombre: "Farmacia de prueba OSM", origen: "guia-util" });
  expect(datos.externos[0].fuente.url).toBe("https://www.openstreetmap.org/node/900004");

  await ctx.close();
});
