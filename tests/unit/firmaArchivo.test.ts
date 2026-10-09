import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { firmaValida } = await import("@/lib/firmaArchivo");

describe("firmaValida", () => {
  it("reconoce WebP, JPEG, MP4 y WebM por sus primeros bytes, y rechaza lo demás", async () => {
    const con = (bytes: number[]) => vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(new Uint8Array([...bytes, ...Array(16).fill(0)]), { status: 206 }));
    const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
    con([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")]);
    expect(await firmaValida("https://x/a.webp", ["webp"])).toBe(true);
    con([0xff, 0xd8, 0xff, 0xe0]);
    expect(await firmaValida("https://x/a.jpg", ["webp", "jpeg"])).toBe(true);
    con([0, 0, 0, 0x20, ...ascii("ftypisom")]);
    expect(await firmaValida("https://x/a.mp4", ["iso"])).toBe(true);
    con([0x1a, 0x45, 0xdf, 0xa3]);
    expect(await firmaValida("https://x/a.webm", ["webm"])).toBe(true);
    con(ascii("<html><script>alert(1)"));
    expect(await firmaValida("https://x/a.webp", ["webp"])).toBe(false);
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("sin red"));
    expect(await firmaValida("https://x/a.webp", ["webp"])).toBe(false);
  });
});
