import { expect, test } from "@playwright/test";
import { admin, crearUsuario, iniciarSesion, limpiar, marca, pngDePrueba } from "./ayudas";

test.afterAll(limpiar);

test("puerta de la fase 4: un negocio de punta a punta", async ({ page, context, baseURL, browser }, info) => {
  test.skip(info.project.name !== "escritorio", "un flujo completo basta en un tamaño");
  const negocio = `${marca} Encebollados`;

  // 1. El dueño envía la solicitud, sin cuenta
  const dueno = await browser.newPage();
  await dueno.goto(new URL("/negocios/registro", baseURL).toString());
  await dueno.getByLabel("Nombre del negocio").fill(negocio);
  await dueno.getByLabel("Categoría").selectOption("restaurantes");
  await dueno.getByLabel("Sector").fill("Alborada");
  await dueno.getByLabel("Tu nombre").fill("Luis Andrade");
  await dueno.getByLabel("WhatsApp del negocio").fill("098 765 4321");
  await dueno.getByLabel(/Acepto los/).check();
  await dueno.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(dueno.getByText("¡Solicitud enviada!")).toBeVisible();
  await dueno.close();

  // 2. Un usuario normal no ve el panel
  const normal = await browser.newContext();
  const n = await crearUsuario("normal");
  await iniciarSesion(normal, n.correo, baseURL!);
  const pn = await normal.newPage();
  expect((await pn.goto(new URL("/admin/solicitudes", baseURL).toString()))?.status()).toBe(404);
  await normal.close();

  // 3. El admin aprueba, completa la ficha, sube una foto, la destaca y la publica
  const jefe = await crearUsuario("admin", true);
  await iniciarSesion(context, jefe.correo, baseURL!);
  await page.goto("/admin/solicitudes");
  await page.getByRole("button", { name: `Aprobar ${negocio}` }).click();
  await expect(page.locator("tr", { hasText: negocio }).getByText("Aprobada")).toBeVisible();

  const { data: lugar } = await admin().from("places").select("id, slug, status").eq("name", negocio).single();
  expect(lugar?.status).toBe("borrador");
  await page.goto(`/admin/lugares/${lugar!.id}`);
  await page.getByLabel("Precio").selectOption("1");
  await page.getByLabel("Horario (opcional)").fill("Todos los días, de 6:00 a 13:00");
  // Ubicación con el signo cambiado: se explica el error y no se pierde lo escrito
  await page.getByLabel("Ubicación exacta (opcional)").fill("2.140100, 79.906500");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText(/fuera de Ecuador/)).toBeVisible();
  await expect(page.getByLabel("Horario (opcional)")).toHaveValue("Todos los días, de 6:00 a 13:00");
  await page.getByLabel("Ubicación exacta (opcional)").fill("-2.140100, -79.906500");
  await expect(page.getByRole("link", { name: "Ver el punto en Google Maps" })).toHaveAttribute("href", /query=-2\.1401,-79\.9065/);
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados")).toBeVisible();

  await page.getByLabel("Foto", { exact: true }).setInputFiles({ name: "plato.png", mimeType: "image/png", buffer: pngDePrueba() });
  await page.getByLabel("¿Qué se ve en la foto?").fill("Plato de prueba");
  await page.getByRole("button", { name: "Subir foto" }).click();
  await expect(page.getByText("Foto agregada")).toBeVisible();

  await page.getByRole("button", { name: "Destacar 7 días (1 $)" }).click();
  await expect(page.getByText("Plan actualizado")).toBeVisible();
  await page.getByLabel("Estado").selectOption("publicado");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  // El precio no se pierde al guardar otra vez (fallo corregido en 4.5)
  const leer = async () => (await admin().from("places").select("price_level, is_featured, status").eq("id", lugar!.id).single()).data;
  await expect.poll(leer, { timeout: 15_000 }).toEqual({ price_level: 1, is_featured: true, status: "publicado" });

  // 4. Se ve en la guía: primero en su categoría, con Destacado y WhatsApp
  const visita = await browser.newPage();
  await visita.goto(new URL("/guayaquil/restaurantes", baseURL).toString());
  await expect(visita.locator("main a", { hasText: negocio }).getByText("Destacado")).toBeVisible();
  await visita.goto(new URL(`/guayaquil/restaurantes/${lugar!.slug}`, baseURL).toString());
  await expect(visita.getByRole("link", { name: "Escribir por WhatsApp" }).first()).toHaveAttribute("href", /wa\.me\/593987654321/);
  // Fase 7: con la ubicación exacta, "Cómo llegar" abre la ruta en Google Maps y hay enlace a Waze
  await expect(visita.getByRole("link", { name: "Cómo llegar" })).toHaveAttribute("href", "https://www.google.com/maps/dir/?api=1&destination=-2.1401,-79.9065");
  await expect(visita.getByRole("link", { name: "Waze" })).toHaveAttribute("href", "https://waze.com/ul?ll=-2.1401,-79.9065&navigate=yes");
  await visita.close();
});
