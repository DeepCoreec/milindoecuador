import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { admin, crearLugar, crearUsuario, iniciarSesion, limpiar } from "./ayudas";

const archivo = (nombre: string) => readFileSync(join(__dirname, "archivos", nombre));
const archivosEnCarpeta = async (lugar: string) => (await admin().storage.from("videos-lugares").list(`lugares/${lugar}`)).data?.map((o) => o.name) ?? [];

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

test("el dueño sube, cambia y borra el video de su negocio", async ({ page, context, baseURL, browser }, info) => {
  test.skip(info.project.name !== "celular", "el dueño usa el celular");
  const d = await crearUsuario("video");
  const lugar = await crearLugar("restaurantes", { owner_id: d.id });
  await iniciarSesion(context, d.correo, baseURL!);
  await page.goto(`/mi-negocio/${lugar.id}`);
  const seccion = page.getByRole("region", { name: "Video" });

  // Lo que no es un video, o un video de más de 90 segundos, se rechaza ANTES de subir
  await seccion.getByLabel("Elige tu video").setInputFiles({ name: "falso.mp4", mimeType: "video/mp4", buffer: Buffer.from("esto no es un video") });
  await seccion.getByRole("button", { name: "Subir video" }).click();
  await expect(seccion.getByText(/no puede abrir ese video/)).toBeVisible();
  await seccion.getByLabel("Elige tu video").setInputFiles({ name: "largo.webm", mimeType: "video/webm", buffer: archivo("largo.webm") });
  await seccion.getByRole("button", { name: "Subir video" }).click();
  await expect(seccion.getByText(/dura 95 segundos/)).toBeVisible();
  expect(await archivosEnCarpeta(lugar.id)).toEqual([]);

  // Un video corto sube y sale al instante
  await seccion.getByLabel("Elige tu video").setInputFiles({ name: "local.webm", mimeType: "video/webm", buffer: archivo("corto.webm") });
  await seccion.getByRole("button", { name: "Subir video" }).click();
  await expect(seccion.getByText("¡Listo! Tu video ya se ve en tu ficha.")).toBeVisible({ timeout: 30_000 });
  await expect(seccion.locator("video")).toHaveAttribute("src", /videos-lugares\/lugares\/.+\.webm$/);
  await expect(seccion.locator("video")).toHaveAttribute("poster", /\.(webp|jpg)$/);
  const primero = await seccion.locator("video").getAttribute("src");
  expect(await archivosEnCarpeta(lugar.id)).toHaveLength(2); // video + portada

  // Cambiarlo reemplaza al anterior (y borra sus archivos)
  await seccion.getByLabel("Cambiar por otro video").setInputFiles({ name: "otro.webm", mimeType: "video/webm", buffer: archivo("corto.webm") });
  await seccion.getByRole("button", { name: "Subir y reemplazar" }).click();
  await expect(seccion.getByText("¡Listo! Tu video ya se ve en tu ficha.")).toBeVisible({ timeout: 30_000 });
  await expect(seccion.locator("video")).not.toHaveAttribute("src", primero!);
  expect(await archivosEnCarpeta(lugar.id)).toHaveLength(2);
  const { data: cambios } = await admin().from("place_changes").select("kind").eq("place_id", lugar.id).like("kind", "video-%");
  expect(cambios?.filter((c) => c.kind === "video-nuevo")).toHaveLength(2);

  // En la ficha: con portada, sin descargar hasta "play", y cuenta la reproducción para el dueño
  const visita = await browser.newPage();
  await visita.goto(new URL(lugar.ruta, baseURL).toString());
  const enFicha = visita.getByRole("region", { name: "Video" }).locator("video");
  await expect(enFicha).toHaveAttribute("preload", "none");
  await expect(enFicha).toHaveAttribute("poster", /videos-lugares/);
  await enFicha.evaluate((v: HTMLVideoElement) => v.play());
  await expect.poll(async () => (await admin().from("place_stats").select("video").eq("place_id", lugar.id).maybeSingle()).data?.video, { timeout: 10_000 }).toBe(1);
  await visita.close();
  await page.reload();
  await expect(page.getByText("Vieron tu video").first()).toBeVisible();

  // Borrarlo, en dos toques
  await seccion.getByRole("button", { name: "Borrar video" }).click();
  await seccion.getByRole("button", { name: "Sí, borrar el video" }).click();
  await expect(seccion.getByText("Video borrado")).toBeVisible();
  await expect(seccion.locator("video")).toHaveCount(0);
  expect(await archivosEnCarpeta(lugar.id)).toEqual([]);
});
