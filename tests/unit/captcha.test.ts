import { afterEach, describe, expect, it, vi } from "vitest";
import { verificarCaptcha } from "@/lib/captcha";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const respuestaDeCloudflare = (cuerpo: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => cuerpo }));

describe("verificarCaptcha", () => {
  it("en producción sin clave secreta rechaza siempre", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(await verificarCaptcha("cualquier-cosa")).toBe(false);
  });
  it("con clave, acepta solo si Cloudflare dice success: true", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secreto");
    const f = respuestaDeCloudflare({ success: true });
    vi.stubGlobal("fetch", f);
    expect(await verificarCaptcha("token", "1.2.3.4")).toBe(true);
    const cuerpo = (f.mock.calls[0] as unknown as [string, { body: URLSearchParams }])[1].body;
    expect(cuerpo.get("secret")).toBe("secreto");
    expect(cuerpo.get("response")).toBe("token");
    expect(cuerpo.get("remoteip")).toBe("1.2.3.4");
  });
  it("rechaza si Cloudflare dice que no, falla o no responde", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secreto");
    vi.stubGlobal("fetch", respuestaDeCloudflare({ success: false }));
    expect(await verificarCaptcha("token")).toBe(false);
    vi.stubGlobal("fetch", respuestaDeCloudflare({ success: "true" }));
    expect(await verificarCaptcha("token")).toBe(false);
    vi.stubGlobal("fetch", respuestaDeCloudflare({}, false));
    expect(await verificarCaptcha("token")).toBe(false);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("sin red"); }));
    expect(await verificarCaptcha("token")).toBe(false);
  });
  it("rechaza respuestas vacías o raras sin preguntar a Cloudflare", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secreto");
    const f = respuestaDeCloudflare({ success: true });
    vi.stubGlobal("fetch", f);
    for (const malo of [undefined, null, "", 42, "x".repeat(3000)]) expect(await verificarCaptcha(malo)).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});
