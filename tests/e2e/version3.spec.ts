import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { admin, crearLugar, crearUsuario, iniciarSesion, limpiar, marca } from "./ayudas";

const archivo = (nombre: string) => readFileSync(join(__dirname, "archivos", nombre));
const archivosEnCarpeta = async (lugar: string) => (await admin().storage.from("videos-lugares").list(`lugares/${lugar}`)).data?.map((o) => o.name) ?? [];

test.afterAll(limpiar);

/*
 * Versión 3: redes del negocio y un video por negocio (fase 11), enlace corto de Google Maps (fase 12).
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

test("3 reportes ocultan solo el video; el admin lo revisa en «Videos»", async ({ page, context, baseURL, browser }, info) => {
  test.skip(info.project.name !== "escritorio", "el admin usa la computadora");
  const dueno = await crearUsuario("dueno-reportado");
  const lugar = await crearLugar("restaurantes", { owner_id: dueno.id });
  // Video subido como lo haría el servidor
  const db = admin();
  const camino = `lugares/${lugar.id}/${crypto.randomUUID()}.webm`;
  await db.storage.from("videos-lugares").upload(camino, archivo("corto.webm"), { contentType: "video/webm" });
  await db.from("place_videos").insert({ place_id: lugar.id, storage_path: camino, duration_seconds: 3, size_bytes: 33765 });

  // Tres personas con cuentas de más de 7 días lo reportan desde la ficha
  for (const apodo of ["rep1", "rep2", "rep3"]) {
    const u = await crearUsuario(apodo);
    await db.from("profiles").update({ created_at: new Date(Date.now() - 30 * 86_400_000).toISOString() }).eq("id", u.id);
    const ctx = await browser.newContext();
    await iniciarSesion(ctx, u.correo, baseURL!);
    const p = await ctx.newPage();
    await p.goto(new URL(lugar.ruta, baseURL).toString());
    await p.getByRole("button", { name: "Reportar este video" }).click();
    await p.getByRole("radio", { name: "Contenido sexual o desnudos" }).check();
    await p.getByRole("button", { name: "Enviar reporte" }).click();
    await expect(p.getByText("Gracias. Lo revisaremos pronto.")).toBeVisible();
    await ctx.close();
  }

  // El video ya no se ve, pero la ficha sí
  const visita = await browser.newPage();
  await visita.goto(new URL(lugar.ruta, baseURL).toString());
  await expect(visita.getByRole("heading", { name: "La historia" })).toBeVisible();
  await expect(visita.getByRole("region", { name: "Video" })).toHaveCount(0);

  // Si el dueño sube otro video, queda en revisión (volver a subirlo no sirve para saltarse los reportes)
  const ctxDueno = await browser.newContext();
  await iniciarSesion(ctxDueno, dueno.correo, baseURL!);
  const pd = await ctxDueno.newPage();
  await pd.goto(new URL(`/mi-negocio/${lugar.id}`, baseURL).toString());
  const sec = pd.getByRole("region", { name: "Video" });
  await expect(sec.getByText("Tu video está oculto.")).toBeVisible();
  await sec.getByLabel("Cambiar por otro video").setInputFiles({ name: "otra-vez.webm", mimeType: "video/webm", buffer: archivo("corto.webm") });
  await sec.getByRole("button", { name: "Subir y reemplazar" }).click();
  await expect(sec.getByText(/Quedó en revisión/)).toBeVisible({ timeout: 30_000 });
  await ctxDueno.close();
  await visita.reload();
  await expect(visita.getByRole("region", { name: "Video" })).toHaveCount(0);

  // El admin lo ve en «Videos» con sus reportes; lo muestra otra vez y luego lo borra
  const adm = await crearUsuario("admin-video", true);
  await iniciarSesion(context, adm.correo, baseURL!);
  await page.goto("/admin/videos");
  await expect(page.getByRole("navigation", { name: "Panel" }).getByRole("link", { name: /^Videos/ })).toContainText("3"); // reportes por revisar
  const fila = page.locator("li", { has: page.getByRole("link", { name: new RegExp(lugar.slug.slice(-4)) }) }).first();
  await expect(fila.getByText("Oculto")).toBeVisible();
  await expect(fila.getByText("3 reportes")).toBeVisible();
  await fila.getByRole("button", { name: /Mostrar otra vez el video/ }).click();
  await expect(fila.getByText("Se ve otra vez")).toBeVisible();
  await visita.reload();
  await expect(visita.getByRole("region", { name: "Video" }).locator("video")).toBeVisible();
  const { count } = await db.from("place_reports").select("id", { count: "exact", head: true }).eq("place_id", lugar.id).eq("resolved", false);
  expect(count).toBe(0);

  await page.reload();
  const fila2 = page.locator("li", { has: page.getByRole("link", { name: new RegExp(lugar.slug.slice(-4)) }) }).first();
  await fila2.getByRole("button", { name: /Borrar el video/ }).click();
  // Al borrarlo, sale de la lista
  await expect(page.getByRole("link", { name: new RegExp(lugar.slug.slice(-4)) })).toHaveCount(0);
  expect(await archivosEnCarpeta(lugar.id)).toEqual([]);
  await visita.close();
});

test("pegar el enlace corto de Google Maps en la ubicación", async ({ page, context, baseURL }, info) => {
  test.skip(info.project.name !== "celular", "el dueño usa el celular");
  const d = await crearUsuario("enlace-corto");
  const lugar = await crearLugar("restaurantes", { owner_id: d.id });
  await iniciarSesion(context, d.correo, baseURL!);
  await page.goto(`/mi-negocio/${lugar.id}`);
  await page.getByLabel("Ubicación exacta (opcional)").fill("https://maps.app.goo.gl/AbCdEf12345");
  // Con internet, el servidor lo convierte en coordenadas. Donde Google no responde (como en estas pruebas),
  // avisa con claridad qué hacer y no guarda nada raro.
  await expect(page.getByText(/Listo: sacamos el punto|No pudimos sacar el punto/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Guardar datos" }).click();
  await expect(page.getByText(/Cambios guardados|Ubicación: no la pudimos leer/)).toBeVisible();
});

test("el buscador de la base: sin tildes y con errores de escritura", async ({ page }) => {
  await crearLugar("restaurantes", { name: `${marca} Cevichería La Ría`, sector: "Urdesa" });
  await crearLugar("restaurantes", { name: `${marca} Otro sitio`, sector: "Urdesa", status: "borrador" });
  for (const q of ["cevicheria ria urdesa", "cebicheria urdesa"]) {
    await page.goto(`/buscar?q=${encodeURIComponent(q)}`);
    await expect(page.getByRole("heading", { name: `${marca} Cevichería La Ría` })).toBeVisible();
  }
  await page.goto(`/buscar?q=${encodeURIComponent("otro sitio urdesa")}`);
  await expect(page.getByText(`${marca} Otro sitio`)).toHaveCount(0); // los borradores no salen
});

test("la sesión vive en cookies httpOnly y el menú igual dice «Mi cuenta»", async ({ page, context }, info) => {
  test.skip(info.project.name !== "escritorio", "basta en un tamaño");
  const u = await crearUsuario("httponly", false, "una frase bien segura");
  await page.goto("/entrar?siguiente=%2F");
  await page.getByLabel("Tu correo").fill(u.correo);
  await page.getByLabel("Contraseña", { exact: true }).fill("una frase bien segura");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);

  const sesion = (await context.cookies()).filter((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  expect(sesion.length).toBeGreaterThan(0);
  expect(sesion.every((c) => c.httpOnly && c.sameSite === "Lax")).toBe(true);
  // Ningún script de la página puede leer la sesión
  expect(await page.evaluate(() => document.cookie)).not.toContain("auth-token");
  await expect(page.getByRole("banner").getByRole("link", { name: "Mi cuenta" })).toBeVisible();

  // Al salir, el menú vuelve a decir «Entrar»
  await page.goto("/cuenta");
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page.getByRole("banner").getByRole("link", { name: "Entrar" })).toBeVisible();
});
