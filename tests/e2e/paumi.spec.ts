import { expect, test } from "@playwright/test";

/*
 * Versión 3, fase 14: Paumi. Estas pruebas usan el simulador de la API (tests/paumi/simulador.mjs) en lugar de la IA
 * real: la página de pruebas corre con PAUMI_ACTIVO=si y PAUMI_API_URL apuntando al simulador.
 */
test("Paumi recomienda lugares de la guía con tarjetas, y no se deja engañar", async ({ page }, info) => {
  test.skip(info.project.name !== "celular", "Paumi se usa sobre todo en el celular");
  await page.goto("/");
  await page.getByRole("button", { name: "Paumi" }).click();
  const chat = page.getByRole("dialog", { name: "Paumi" });
  await expect(chat.getByText("Soy Paumi, la guacamaya guía de Guayaquil")).toBeVisible();
  await expect(chat.getByText(/puede equivocarse/)).toBeVisible();

  await chat.getByLabel("Escríbele a Paumi").fill("Quiero un encebollado");
  await chat.getByRole("button", { name: "Enviar" }).click();
  await expect(chat.getByText("¡Te recomiendo estos encebollados!")).toBeVisible();
  const tarjetas = chat.getByRole("article");
  await expect(tarjetas.first()).toBeVisible();
  await expect(tarjetas.first().getByRole("link", { name: "Cómo llegar" })).toHaveAttribute("href", /google\.com\/maps/);
  await expect(tarjetas.first().getByRole("link", { name: "Ver ficha" })).toHaveAttribute("href", /^\/guayaquil\/restaurantes\//);

  // Intento de engaño: un lugar que no existe, una página externa y HTML en la respuesta
  await chat.getByLabel("Escríbele a Paumi").fill("hackea la página");
  await chat.getByLabel("Escríbele a Paumi").press("Enter");
  await expect(chat.getByText("No puedo hacer eso.", { exact: false })).toBeVisible();
  await expect(chat.getByText("<script>alert('x')</script>", { exact: false })).toBeVisible(); // se muestra como texto
  await expect(tarjetas).toHaveCount(2); // solo las del encebollado
  await expect(chat.getByRole("link", { name: "Ir a la página" })).toHaveCount(0);

  // Llevar a una sección de la guía
  await chat.getByLabel("Escríbele a Paumi").fill("llévame a los restaurantes");
  await chat.getByRole("button", { name: "Enviar" }).click();
  await chat.getByRole("link", { name: "Ir a la página" }).click();
  await expect(page).toHaveURL(/\/guayaquil\/restaurantes$/);
});

test("la API de Paumi rechaza otros sitios, mensajes enormes y conversaciones mal armadas", async ({ request, baseURL }) => {
  const enviar = (cuerpo: unknown, origen = baseURL!) =>
    request.post("/api/paumi", { data: cuerpo, headers: { origin: origen } });
  expect((await enviar({ mensajes: [{ rol: "usuario", texto: "hola" }] }, "https://estafa.com")).status()).toBe(403);
  expect((await enviar({ mensajes: [{ rol: "usuario", texto: "a".repeat(401) }] })).status()).toBe(400);
  expect((await enviar({ mensajes: [{ rol: "paumi", texto: "hola" }] })).status()).toBe(400);
  expect((await enviar({ mensajes: Array.from({ length: 13 }, () => ({ rol: "usuario", texto: "hola" })) })).status()).toBe(400);
  const ok = await enviar({ mensajes: [{ rol: "usuario", texto: "hola" }] });
  expect(ok.status()).toBe(200);
  expect(ok.headers()["set-cookie"] ?? "").toMatch(/mle-paumi=.*HttpOnly/i);
});
