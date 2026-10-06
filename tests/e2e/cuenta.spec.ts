import { expect, test } from "@playwright/test";
import { admin, crearUsuario, iniciarSesion, limpiar } from "./ayudas";

test.afterAll(limpiar);

test("sin sesión, Mi cuenta manda a Entrar y vuelve después", async ({ page }) => {
  await page.goto("/cuenta");
  await expect(page).toHaveURL(/\/entrar\?siguiente=%2Fcuenta/);
});

test("cambiar el nombre visible y borrar la cuenta", async ({ page, context, baseURL }, info) => {
  test.skip(info.project.name !== "escritorio", "un flujo completo basta en un tamaño");
  const u = await crearUsuario("cuenta");
  await iniciarSesion(context, u.correo, baseURL!);
  await page.goto("/cuenta");
  await expect(page.getByLabel("Nombre visible")).toHaveValue("Visitante"); // nunca sale del correo

  await page.getByLabel("Nombre visible").fill("Prueba E.");
  await page.getByRole("button", { name: "Guardar nombre" }).click();
  await expect(page.getByText("Nombre guardado")).toBeVisible();

  await page.getByLabel("Escribe BORRAR para confirmar").fill("borrar");
  await page.getByRole("button", { name: /Borrar mi cuenta/ }).click();
  await expect(page.getByText("Escribe BORRAR en mayúsculas")).toBeVisible();

  await page.getByLabel("Escribe BORRAR para confirmar").fill("BORRAR");
  await page.getByRole("button", { name: /Borrar mi cuenta/ }).click();
  await expect(page).toHaveURL(/\/$/);
  const { data } = await admin().auth.admin.getUserById(u.id);
  expect(data.user).toBeNull();
});
