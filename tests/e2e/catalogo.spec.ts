import { expect, test } from "@playwright/test";
import { crearLugar, limpiar } from "./ayudas";

// Lo que ve cualquier visitante, en celular y escritorio
test.afterAll(limpiar);

const sinDesborde = async (page: import("@playwright/test").Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

test("inicio, categoría, ficha y buscador se ven bien y sin errores", async ({ page }) => {
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(e.message));
  const lugar = await crearLugar("restaurantes", { price_level: 1 });

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Guayaquil, de punta a punta");
  await sinDesborde(page);

  await page.goto("/guayaquil/restaurantes?precio=1");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Restaurantes");
  await expect(page.locator("main h3").first()).toBeVisible();
  await sinDesborde(page);

  await page.goto(lugar.ruta);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E");
  await expect(page.getByRole("link", { name: "Cómo llegar" })).toHaveAttribute("href", /google\.com\/maps/);
  await sinDesborde(page);

  await page.goto("/buscar?q=" + encodeURIComponent("<script>alert(1)</script>"));
  await expect(page.getByText("No encontramos lugares")).toBeVisible();
  expect(errores).toEqual([]);
});

test("lo que no existe o es borrador responde 404", async ({ page }) => {
  const borrador = await crearLugar("restaurantes", { status: "borrador" });
  for (const ruta of [borrador.ruta, "/guayaquil/restaurantes/no-existe", "/lima/restaurantes", "/guayaquil/xyz"]) {
    const r = await page.goto(ruta);
    expect(r?.status(), ruta).toBe(404);
  }
});
