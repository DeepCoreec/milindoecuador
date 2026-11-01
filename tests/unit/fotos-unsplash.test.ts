import { describe, expect, it } from "vitest";
import { FOTOS_UNSPLASH } from "../../next.config";
import { FOTOS_CATEGORIAS } from "@/lib/fotos-categorias";
import { FOTOS_GUAYAQUIL } from "@/lib/fondos-ciudad";

/* Cada foto de Unsplash que usa la página tiene que estar permitida por su dirección exacta en next.config.ts */
describe("fotos de Unsplash permitidas", () => {
  it("todas las de la portada y las categorías están en la lista (y solo de images.unsplash.com)", () => {
    for (const f of [...FOTOS_GUAYAQUIL, ...Object.values(FOTOS_CATEGORIAS)]) {
      const u = new URL(f.src);
      expect(u.hostname).toBe("images.unsplash.com");
      expect(u.search).toBe("");
      expect(FOTOS_UNSPLASH).toContain(u.pathname);
    }
  });
});
