import { expect, test } from "@playwright/test";
import { crearLugar, crearUsuario, iniciarSesion, limpiar } from "./ayudas";

test.afterAll(limpiar);

test("escribir, editar, borrar y reportar reseñas", async ({ page, context, baseURL, browser }, info) => {
  test.skip(info.project.name !== "escritorio", "un flujo completo basta en un tamaño");
  const lugar = await crearLugar();

  await page.goto(lugar.ruta);
  await expect(page.getByRole("link", { name: "Entra para escribir una reseña" })).toHaveAttribute("href", /siguiente=/);

  const autora = await crearUsuario("autora");
  await iniciarSesion(context, autora.correo, baseURL!);
  await page.goto(lugar.ruta);
  await page.getByLabel("Tu reseña").fill("Muy rico todo y rápido.");
  await page.getByRole("button", { name: "Publicar reseña" }).click();
  await expect(page.getByText("Elige de 1 a 5 estrellas")).toBeVisible();

  await page.locator('label:has(input[name="estrellas"][value="4"])').click();
  await page.getByRole("button", { name: "Publicar reseña" }).click();
  await expect(page.getByText("Tu reseña está publicada")).toBeVisible();
  await expect(page.locator("article", { hasText: "Muy rico todo y rápido." })).toBeVisible();

  await page.locator('label:has(input[name="estrellas"][value="5"])').click();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Reseña actualizada")).toBeVisible();

  // Otra persona la reporta
  const otro = await browser.newContext();
  const vecino = await crearUsuario("vecino");
  await iniciarSesion(otro, vecino.correo, baseURL!);
  const p2 = await otro.newPage();
  await p2.goto(lugar.ruta);
  await p2.locator("article", { hasText: "Muy rico todo y rápido." }).getByRole("button", { name: "Reportar" }).click();
  await p2.getByLabel("Es falsa o publicidad").check();
  await p2.getByRole("button", { name: "Enviar reporte" }).click();
  await expect(p2.getByText("Gracias. La revisaremos pronto.")).toBeVisible();
  await otro.close();

  // La autora la borra
  await page.getByRole("button", { name: "Borrar mi reseña" }).click();
  await page.getByRole("button", { name: "Sí, borrar" }).click();
  await expect(page.getByRole("button", { name: "Publicar reseña" })).toBeVisible();
});
