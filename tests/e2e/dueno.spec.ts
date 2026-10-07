import { expect, test } from "@playwright/test";
import { admin, crearLugar, crearUsuario, iniciarSesion, limpiar, marca, pngDePrueba } from "./ayudas";

test.afterAll(limpiar);

/*
 * Versión 2, puerta de la fase 9: el dueño llena su ficha solo, publica al instante y responde reseñas;
 * el filtro bloquea lo que no se permite; nadie más puede tocar su negocio.
 */
test("el dueño completa, publica y maneja su negocio", async ({ page, context, baseURL, browser }, info) => {
  test.skip(info.project.name !== "celular", "un flujo completo basta en un tamaño (el dueño usa el celular)");
  const d = await crearUsuario("duena");
  const lugar = await crearLugar("restaurantes", {
    owner_id: d.id,
    status: "borrador",
    description: "Descripción pendiente: escríbela desde «Mi negocio» o desde el panel antes de publicar.",
  });

  // Nadie más entra a su negocio
  const ctxOtro = await browser.newContext();
  const otro = await crearUsuario("curioso");
  await iniciarSesion(ctxOtro, otro.correo, baseURL!);
  const po = await ctxOtro.newPage();
  expect((await po.goto(new URL(`/mi-negocio/${lugar.id}`, baseURL).toString()))?.status()).toBe(404);
  await ctxOtro.close();

  await iniciarSesion(context, d.correo, baseURL!);
  await page.goto("/cuenta");
  await page.getByRole("link", { name: /Mi negocio/ }).click();
  await page.getByRole("link", { name: new RegExp(`${marca}`) }).click();
  await expect(page.getByRole("button", { name: "Publicar mi ficha" })).toBeDisabled();

  // El filtro: teléfonos en la descripción no
  await page.getByLabel("La historia").fill("El mejor encebollado de la Alborada. Pide al 099 123 4567 y te lo llevamos.");
  await page.getByLabel("Sector").fill("Alborada");
  await page.getByRole("button", { name: "Guardar datos" }).click();
  await expect(page.getByText(/no puede llevar números de teléfono/)).toBeVisible();

  await page.getByLabel("La historia").fill("El mejor encebollado de la Alborada, con chifles y pan, desde las seis de la mañana.");
  await page.getByLabel("Horario (opcional)").fill("Todos los días, de 6:00 a 13:00");
  await page.getByLabel("Ubicación exacta (opcional)").fill("-2.140100, -79.906500");
  await page.getByRole("button", { name: "Guardar datos" }).click();
  await expect(page.getByText("Cambios guardados")).toBeVisible();

  // Foto (permiso de subida firmado por el servidor)
  await page.getByLabel("Foto", { exact: true }).setInputFiles({
    name: "plato.png",
    mimeType: "image/png",
    buffer: pngDePrueba(),
  });
  await page.getByLabel("¿Qué se ve en la foto?").fill("Plato de encebollado");
  await page.getByRole("button", { name: "Subir foto" }).click();
  await expect(page.getByText("Foto agregada")).toBeVisible();
  await expect(page.getByText("Llevas 1 de 15.")).toBeVisible();

  // Publicar: sale al instante
  await page.getByRole("button", { name: "Publicar mi ficha" }).click();
  await expect(page.getByText("¡Tu ficha ya se ve en la guía!")).toBeVisible();
  const visita = await browser.newPage();
  await visita.goto(new URL(lugar.ruta, baseURL).toString());
  await expect(visita.getByText("con chifles y pan")).toBeVisible();

  // Responder una reseña: con insulto no; normal sí, y se ve en la ficha
  const cliente = await crearUsuario("cliente");
  await admin().from("reviews").insert({
    place_id: lugar.id,
    user_id: cliente.id,
    stars: 3,
    text: "Rico pero se demoraron bastante.",
  });
  await page.reload();
  const resena = page.locator("article", { hasText: "se demoraron bastante" });
  await resena.getByLabel("Tu respuesta").fill("Gracias, pendejo");
  await resena.getByRole("button", { name: "Responder" }).click();
  await expect(resena.getByText(/palabras que no se permiten/)).toBeVisible();
  await resena.getByLabel("Tu respuesta").fill("¡Gracias por venir! Ya pusimos una persona más en la mañana.");
  await resena.getByRole("button", { name: "Responder" }).click();
  await expect(resena.getByText("Respuesta publicada")).toBeVisible();
  await visita.reload();
  await expect(visita.getByText("Ya pusimos una persona más")).toBeVisible();
  await visita.close();

  // Todo quedó anotado para el admin
  const { data: cambios } = await admin().from("place_changes").select("kind").eq("place_id", lugar.id);
  expect(new Set((cambios ?? []).map((c) => c.kind))).toEqual(new Set(["ficha", "foto-nueva", "estado", "respuesta"]));
});

test("reportes de lugares y cambios recientes en el panel", async ({ page, context, baseURL, browser }, info) => {
  test.skip(info.project.name !== "escritorio", "un flujo completo basta en un tamaño");
  const d = await crearUsuario("duenob");
  const lugar = await crearLugar("restaurantes", { owner_id: d.id });
  await admin().from("place_changes").insert({
    place_id: lugar.id,
    user_id: d.id,
    kind: "foto-nueva",
    detail: "Subió una foto: prueba de cambios",
  });

  // Tres personas lo reportan: se oculta solo
  for (const apodo of ["rep1", "rep2", "rep3"]) {
    const ctx = await browser.newContext();
    const u = await crearUsuario(apodo);
    await iniciarSesion(ctx, u.correo, baseURL!);
    const p = await ctx.newPage();
    await p.goto(new URL(lugar.ruta, baseURL).toString());
    await p.getByRole("button", { name: "Reportar este lugar" }).click();
    await p.getByLabel("Estafa o publicidad engañosa").check();
    await p.getByRole("button", { name: "Enviar reporte" }).click();
    await expect(p.getByText("Gracias. Lo revisaremos pronto.")).toBeVisible();
    await ctx.close();
  }
  const anon = await browser.newPage();
  expect((await anon.goto(new URL(lugar.ruta, baseURL).toString()))?.status()).toBe(404);

  // El admin lo ve, lo muestra otra vez y revisa los cambios
  const jefe = await crearUsuario("adminb", true);
  await iniciarSesion(context, jefe.correo, baseURL!);
  const { data: fila } = await admin().from("places").select("name").eq("id", lugar.id).single();
  await page.goto("/admin/lugares-reportados");
  const reportado = page.locator("li", {
    has: page.getByRole("link", { name: fila!.name }),
  });
  await expect(reportado.getByText("3 reportes")).toBeVisible();
  await reportado.getByRole("button", { name: `Mostrar otra vez ${fila!.name}` }).click();
  await expect(reportado).toHaveCount(0); // reportes cerrados: sale de la lista
  expect((await anon.goto(new URL(lugar.ruta, baseURL).toString()))?.status()).toBe(200);

  await page.goto("/admin/cambios");
  const item = page.locator("li", { hasText: "prueba de cambios" });
  await expect(item).toBeVisible();
  await item.getByRole("button", { name: /Ocultar/ }).click();
  await expect(item.getByText("Oculta", { exact: true })).toBeVisible();
  expect((await anon.goto(new URL(lugar.ruta, baseURL).toString()))?.status()).toBe(404);
  await anon.close();

  // Palabras prohibidas: el admin agrega una y se bloquea al instante
  await page.goto("/admin/palabras");
  await page.getByLabel("Agregar palabra o frase").fill("Estafadores");
  await page.getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByText("Agregada: «Estafadores»")).toBeVisible();
  const { error } = await admin().from("places").update({ short_fact: "Unos estafadores" }).eq("id", lugar.id);
  expect(error?.message).toMatch(/texto_no_permitido:dato:palabra/);
  await admin().from("banned_words").delete().eq("word", "estafadores");
});
