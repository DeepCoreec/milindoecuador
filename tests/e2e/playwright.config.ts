import { defineConfig, devices } from "@playwright/test";

/*
 * Pruebas de punta a punta (flujos completos en un navegador de verdad).
 * Se corren contra una página ya levantada y conectada a Supabase:
 *   E2E_URL                        dirección de la página (por defecto http://localhost:3000)
 *   NEXT_PUBLIC_SUPABASE_URL       el mismo proyecto de Supabase que usa la página
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY      solo para preparar datos e iniciar sesión en las pruebas (nunca en el navegador)
 * Crean usuarios y datos con nombres "E2E …" y los borran al terminar.
 * Úsalas en desarrollo o en una copia de prueba; con cuidado en producción.
 */
export default defineConfig({
  testDir: ".",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    locale: "es-EC",
    timezoneId: "America/Guayaquil",
    // En la nube de Claude el navegador ya está instalado en otra carpeta
    launchOptions: process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {},
  },
  projects: [
    { name: "celular", use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "escritorio", use: { viewport: { width: 1440, height: 900 }, browserName: "chromium" } },
  ],
});
