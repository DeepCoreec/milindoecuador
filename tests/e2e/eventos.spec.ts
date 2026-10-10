import { expect, test } from "@playwright/test";
import { admin, crearUsuario, iniciarSesion, limpiar, marca, pngDePrueba } from "./ayudas";

/* Versión 5, fase 22: eventos que publica la gente y se borran solos al día siguiente de su fecha de fin. */
test.afterAll(limpiar);
// El tope de permisos de afiche es por día: se reinicia para que las pruebas no dependan de cuántas veces se corrieron
test.beforeAll(async () => {
  await admin().from("event_upload_permits").delete().gte("id", 0);
});

/** "2026-10-17T19:30" en hora de Guayaquil, dentro de n días. */
function enDias(n: number, hora = "19:00") {
  return new Date(Date.now() - 5 * 3600_000 + n * 86400_000).toISOString().slice(0, 10) + "T" + hora;
}

test("publicar un evento con afiche, verlo, cambiarlo y borrarlo", async ({ browser, baseURL }, info) => {
  test.skip(info.project.name !== "escritorio", "un flujo completo basta en un tamaño");
  const titulo = `${marca} Feria de emprendedores`;
  const ctx = await browser.newContext();
  const u = await crearUsuario("organiza");
  await iniciarSesion(ctx, u.correo, baseURL!);
  const p = await ctx.newPage();
  await p.goto(new URL("/guayaquil/eventos/nuevo", baseURL).toString());
  await p.getByLabel("Nombre del evento").fill(titulo);
  await p.getByLabel("Tipo de evento").selectOption("feria");
  await p.getByLabel("¿De qué se trata?").fill("Más de 40 emprendedores con comida, ropa y artesanías hechas en Guayaquil.");
  // Primero un error: termina antes de empezar
  await p.getByLabel("Empieza").fill(enDias(2, "10:00"));
  await p.getByLabel("Termina").fill(enDias(1, "18:00"));
  await p.getByLabel("Lugar").fill("Parque Samanes");
  await p.getByLabel("Organizador").fill("Red de emprendedores");
  await p.getByLabel(/Acepto los/).check();
  await p.getByRole("button", { name: "Publicar evento" }).click();
  await expect(p.getByText("El final tiene que ser después del inicio")).toBeVisible();
  // Lo escrito se mantiene; se corrige y se agrega el afiche
  await expect(p.getByLabel("Nombre del evento")).toHaveValue(titulo);
  await p.getByLabel("Termina").fill(enDias(3, "18:00"));
  await p.getByLabel("Es gratis").uncheck();
  await p.getByLabel("Precio en dólares").fill("2,50");
  await p.getByLabel("Elegir imagen").setInputFiles({ name: "afiche.png", mimeType: "image/png", buffer: pngDePrueba() });
  await p.getByLabel("¿Qué se ve en el afiche?").fill("Afiche con la fecha y el logo de la feria");
  await p.getByLabel(/Acepto los/).check();
  await p.getByRole("button", { name: "Publicar evento" }).click();
  await expect(p.getByText("¡Tu evento ya está publicado!")).toBeVisible();

  // La ficha: datos, afiche, cómo llegar, calendario
  await p.getByRole("link", { name: "Ver mi evento" }).click();
  await expect(p.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
  await expect(p.getByText("$2.50")).toBeVisible();
  await expect(p.getByRole("img", { name: "Afiche con la fecha y el logo de la feria" })).toBeVisible();
  await expect(p.getByRole("link", { name: "Cómo llegar" })).toHaveAttribute("href", /google\.com\/maps.*Parque%20Samanes/);
  const ruta = new URL(p.url()).pathname;
  const ics = await p.request.get(`${ruta}/calendario`);
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  expect(await ics.text()).toContain(`SUMMARY:${titulo}`);

  // Sale en la lista de eventos
  await p.goto(new URL("/guayaquil/eventos", baseURL).toString());
  await expect(p.getByRole("link", { name: new RegExp(titulo) })).toBeVisible();

  // Mis eventos: cambiarlo y borrarlo
  await p.goto(new URL("/cuenta/eventos", baseURL).toString());
  await p.getByRole("link", { name: "Cambiar" }).click();
  await p.getByLabel("Nombre del evento").fill(`${titulo} 2026`);
  await p.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(p.getByText("Cambios guardados")).toBeVisible();
  await p.goto(new URL("/cuenta/eventos", baseURL).toString());
  await expect(p.getByText(`${titulo} 2026`)).toBeVisible();
  p.once("dialog", (d) => d.accept());
  await p.getByRole("button", { name: `Borrar ${titulo} 2026` }).click();
  await expect(p.getByText("Todavía no has publicado eventos.")).toBeVisible();
  const { count } = await admin().storage.from("afiches-eventos").list(`eventos/${u.id}`).then((r) => ({ count: r.data?.length ?? 0 }));
  expect(count).toBe(0);
  await ctx.close();
});

test("sin cuenta se pide entrar para publicar", async ({ page }) => {
  await page.goto("/guayaquil/eventos/nuevo");
  await expect(page.getByRole("heading", { name: "Primero, tu cuenta" })).toBeVisible();
});

test("el borrado diario quita los eventos vencidos y sus afiches (y pide la clave)", async ({ request }) => {
  const db = admin();
  const u = await crearUsuario("vencido");
  const { data: ciudad } = await db.from("cities").select("id").eq("slug", "guayaquil").single();
  const camino = `eventos/${u.id}/${crypto.randomUUID()}.webp`;
  await db.storage.from("afiches-eventos").upload(camino, pngDePrueba(), { contentType: "image/webp" });
  const ahora = Date.now();
  const { data: ev, error } = await db
    .from("city_events")
    .insert({
      city_id: ciudad!.id,
      user_id: u.id,
      slug: `e2e-vencido-${ahora.toString(36)}`,
      title: `${marca} Evento que ya pasó`,
      kind: "otro",
      description: "Un evento de prueba que termina hoy y luego se vence.",
      starts_at: new Date(ahora).toISOString(),
      ends_at: new Date(ahora + 3600_000).toISOString(),
      venue: "Malecón",
      organizer: "Pruebas",
      poster_path: camino,
      poster_alt: "Afiche de prueba",
    })
    .select("id, slug")
    .single();
  expect(error).toBeNull();
  // Se vence: termina antes de hoy (la base no deja publicarlo así, por eso se cambia después)
  await db.from("city_events").update({ starts_at: new Date(ahora - 3 * 86400_000).toISOString(), ends_at: new Date(ahora - 2 * 86400_000).toISOString() }).eq("id", ev!.id);
  const ficha = await request.get(`/guayaquil/eventos/${ev!.slug}`);
  expect(ficha.status()).toBe(404);

  expect((await request.get("/api/tareas/eventos")).status()).toBe(401);
  expect((await request.get("/api/tareas/eventos", { headers: { authorization: "Bearer otra-clave-cualquiera" } })).status()).toBe(401);
  const r = await request.get("/api/tareas/eventos", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  expect(r.status()).toBe(200);
  expect((await r.json()).borrados).toBeGreaterThanOrEqual(1);
  const { data: queda } = await db.from("city_events").select("id").eq("id", ev!.id);
  expect(queda).toHaveLength(0);
  const { data: archivos } = await db.storage.from("afiches-eventos").list(`eventos/${u.id}`);
  expect(archivos ?? []).toHaveLength(0);
});

test("Paumi recomienda eventos de la guía y lleva a su ficha", async ({ request, baseURL }) => {
  const db = admin();
  await db.from("paumi_usage").delete().gte("n", 0);
  const u = await crearUsuario("paumi-eventos");
  const { data: ciudad } = await db.from("cities").select("id").eq("slug", "guayaquil").single();
  const slug = `e2e-paumi-${Date.now().toString(36)}`;
  // Empieza hace un minuto: siempre es el primero de la lista
  const { error } = await db.from("city_events").insert({
    city_id: ciudad!.id, user_id: u.id, slug, title: `${marca} Concierto para Paumi`, kind: "concierto",
    description: "Un concierto de prueba para que Paumi lo recomiende.", starts_at: new Date(Date.now() - 60_000).toISOString(),
    ends_at: new Date(Date.now() + 3600_000).toISOString(), venue: "Plaza Cívica", organizer: "Pruebas",
  });
  expect(error).toBeNull();
  const r = await request.post("/api/paumi", { data: { mensajes: [{ rol: "usuario", texto: "¿qué evento hay hoy?" }] }, headers: { origin: baseURL! } });
  expect(r.status()).toBe(200);
  const datos = await r.json();
  expect(datos.navegar).toMatch(/^\/guayaquil\/eventos\/[a-z0-9-]+$/);
  expect((await request.get(datos.navegar)).status()).toBe(200);
});
