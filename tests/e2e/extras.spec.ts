import { expect, test } from "@playwright/test";
import { admin, crearLugar, crearUsuario, iniciarSesion, limpiar } from "./ayudas";

test.afterAll(limpiar);

/* Versión 2, fase 10: horario por día con "Abierto ahora", estadísticas para el dueño y favoritos. */
test("horario, estadísticas y favoritos", async ({ page, context, baseURL, browser }, info) => {
  test.skip(info.project.name !== "celular", "un flujo completo basta en un tamaño");
  const d = await crearUsuario("duenoc");
  const lugar = await crearLugar("restaurantes", { owner_id: d.id, whatsapp: "593987654321" });

  // El dueño pone el horario por día: abierto las 24 horas toda la semana
  await iniciarSesion(context, d.correo, baseURL!);
  await page.goto(`/mi-negocio/${lugar.id}`);
  for (const dia of ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]) {
    await page.getByLabel(dia, { exact: true }).check();
    await page.getByLabel(`${dia}: abre`).fill("00:00");
    await page.getByLabel(`${dia}: cierra`).fill("00:00");
  }
  await page.getByRole("button", { name: "Guardar datos" }).click();
  await expect(page.getByText("Cambios guardados")).toBeVisible();
  const { data: fila } = await admin().from("places").select("opening_hours").eq("id", lugar.id).single();
  expect(Object.keys(fila!.opening_hours as object)).toHaveLength(7);

  // La gente ve "Abierto las 24 horas"; la visita y el toque a WhatsApp se cuentan
  const visita = await browser.newContext();
  const pv = await visita.newPage();
  await pv.route(/wa\.me/, (r) => r.abort());
  await pv.goto(new URL(lugar.ruta, baseURL).toString());
  await expect(pv.getByText("Abierto las 24 horas")).toBeVisible();
  await expect(pv.getByText("Lun a dom: 24 horas")).toBeVisible();
  const [popup] = await Promise.all([pv.waitForEvent("popup"), pv.getByRole("link", { name: "Escribir por WhatsApp" }).first().click()]);
  await popup.close();
  const leer = async () => (await admin().from("place_stats").select("views, whatsapp").eq("place_id", lugar.id).maybeSingle()).data;
  await expect.poll(leer, { timeout: 15_000 }).toEqual({ views: 1, whatsapp: 1 });
  await pv.reload(); // la misma persona el mismo día no cuenta dos veces
  await pv.waitForTimeout(1000);
  expect((await leer())?.views).toBe(1);

  // Favoritos: sin sesión manda a entrar; con sesión guarda y sale en Mi cuenta
  await expect(pv.getByRole("link", { name: "Guardar" })).toHaveAttribute("href", /\/entrar\?siguiente=/);
  await visita.close();
  const fan = await crearUsuario("fan");
  const ctxFan = await browser.newContext();
  await iniciarSesion(ctxFan, fan.correo, baseURL!);
  const pf = await ctxFan.newPage();
  await pf.goto(new URL(lugar.ruta, baseURL).toString());
  await pf.getByRole("button", { name: "Guardar" }).click();
  await expect(pf.getByRole("button", { name: "Guardado" })).toHaveAttribute("aria-pressed", "true");
  await pf.goto(new URL("/cuenta", baseURL).toString());
  const { data: nombre } = await admin().from("places").select("name").eq("id", lugar.id).single();
  await expect(pf.getByRole("link", { name: nombre!.name })).toBeVisible();
  await pf.goto(new URL(lugar.ruta, baseURL).toString());
  await pf.getByRole("button", { name: "Guardado" }).click();
  await expect(pf.getByRole("button", { name: "Guardar" })).toHaveAttribute("aria-pressed", "false");
  await ctxFan.close();

  // El dueño ve sus números
  await page.reload();
  const numeros = page.locator("section", { has: page.getByRole("heading", { name: "Cómo te va" }) });
  await expect(numeros.getByText("Vieron tu ficha").first()).toBeVisible();
  await expect(numeros.locator("dl > div", { hasText: "Tocaron WhatsApp" }).first().locator("dd")).toHaveText("1");
});
