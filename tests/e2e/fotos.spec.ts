import { expect, test } from "@playwright/test";
import { admin } from "./ayudas";

/* Versión 4 (pedido del usuario): las tarjetas muestran la primera foto y en la ficha la foto se abre en grande. */
test("la tarjeta muestra la foto del lugar y en la ficha se abre en grande", async ({ page }) => {
  const { data } = await admin()
    .from("places")
    .select("slug, name, categories!inner(slug), place_photos!inner(storage_path)")
    .eq("status", "publicado")
    .limit(1)
    .single<{ slug: string; name: string; categories: { slug: string }; place_photos: { storage_path: string }[] }>();
  test.skip(!data, "no hay lugares con foto en la base de prueba");
  const lugar = data!;

  await page.goto(`/guayaquil/${lugar.categories.slug}`);
  const tarjeta = page.locator("main a", { hasText: lugar.name }).first();
  await expect(tarjeta.locator("img")).toHaveAttribute("src", /lugares-fotos|storage/);

  await page.goto(`/guayaquil/${lugar.categories.slug}/${lugar.slug}`);
  await page.getByRole("button", { name: /Ver la foto en grande|Ver las \d+ fotos/ }).first().click();
  const visor = page.getByRole("dialog", { name: /Foto 1 de \d+/ });
  await expect(visor).toBeVisible();
  await expect(visor.locator("img")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(visor).toBeHidden();
});
