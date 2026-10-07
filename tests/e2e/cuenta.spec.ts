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

test("entrar con correo y contraseña y cambiarla", async ({ page }, info) => {
  test.skip(info.project.name !== "celular", "un flujo completo basta en un tamaño");
  const u = await crearUsuario("clave", false, "primera frase segura");

  await page.goto("/entrar?siguiente=%2Fcuenta");
  await expect(page.getByRole("button", { name: "Entrar con Google" })).toHaveCount(0); // sin NEXT_PUBLIC_GOOGLE_ACTIVO
  await page.getByLabel("Tu correo").fill(u.correo);
  await page.getByLabel("Contraseña", { exact: true }).fill("equivocada");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("El correo o la contraseña no son correctos.")).toBeVisible();

  await page.getByLabel("Contraseña", { exact: true }).fill("primera frase segura");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/cuenta$/);

  await page.getByLabel("Contraseña nueva", { exact: true }).fill("segunda frase segura");
  await page.getByLabel("Repite la contraseña nueva").fill("segunda frase segura");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByText("Contraseña guardada")).toBeVisible();

  await page.getByRole("button", { name: "Salir" }).click();
  await page.goto("/entrar?siguiente=%2Fcuenta");
  await page.getByLabel("Tu correo").fill(u.correo);
  await page.getByLabel("Contraseña", { exact: true }).fill("segunda frase segura");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
});
