import { expect, test } from "@playwright/test";
import { crearLugar, crearUsuario, iniciarSesion, limpiar } from "./ayudas";

test.afterAll(limpiar);

/*
 * Versión 3, fase 11: redes del negocio y un video por negocio.
 */
test("el dueño pone sus redes y su página web, y salen en la ficha", async ({ page, context, baseURL, browser }, info) => {
  test.skip(info.project.name !== "celular", "el dueño usa el celular");
  const d = await crearUsuario("redes");
  const lugar = await crearLugar("restaurantes", { owner_id: d.id });
  await iniciarSesion(context, d.correo, baseURL!);
  await page.goto(`/mi-negocio/${lugar.id}`);

  // Un enlace de otra red se rechaza con un mensaje claro
  await page.getByLabel("Facebook").fill("https://www.instagram.com/milindo");
  await page.getByRole("button", { name: "Guardar datos" }).click();
  await expect(page.getByText("Facebook: ese enlace no es de Facebook")).toBeVisible();
  // Lo escrito no se pierde
  await expect(page.getByLabel("Facebook")).toHaveValue("https://www.instagram.com/milindo");

  await page.getByLabel("Facebook").fill("facebook.com/milindoec");
  await page.getByLabel("Instagram").fill("@milindo.ec");
  await page.getByLabel("TikTok").fill("@milindo");
  await page.getByLabel("Página web").fill("www.milindo.ec");
  await page.getByRole("button", { name: "Guardar datos" }).click();
  await expect(page.getByText("Cambios guardados y publicados")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Instagram")).toHaveValue("https://www.instagram.com/milindo.ec");

  const visita = await browser.newPage();
  await visita.goto(new URL(lugar.ruta, baseURL).toString());
  const redes = visita.getByRole("region", { name: "Síguenos" });
  await expect(redes.getByRole("link", { name: /^Instagram de/ })).toHaveAttribute("href", "https://www.instagram.com/milindo.ec");
  await expect(redes.getByRole("link", { name: /^TikTok de/ })).toHaveAttribute("href", "https://www.tiktok.com/@milindo");
  await expect(redes.getByRole("link", { name: /^Facebook de/ })).toHaveAttribute("href", "https://facebook.com/milindoec");
  await expect(redes.getByRole("link", { name: /Página web: milindo\.ec/ })).toHaveAttribute("rel", /nofollow/);
  await expect(redes.getByRole("link", { name: /YouTube/ })).toHaveCount(0);
  await visita.close();
});
