import "server-only";

/*
 * ¿El archivo subido es de verdad lo que dice ser? (auditoría 2026-10-09)
 * El bucket solo mira el tipo que declara quien sube; aquí se leen los primeros bytes del archivo ya subido
 * (la "firma" de cada formato) antes de registrarlo. Si no coincide, el archivo se borra.
 */

export type Formato = "webp" | "jpeg" | "iso" | "webm";

function coincide(b: Uint8Array, f: Formato): boolean {
  const texto = (desde: number, largo: number) => String.fromCharCode(...b.slice(desde, desde + largo));
  switch (f) {
    case "webp":
      return texto(0, 4) === "RIFF" && texto(8, 4) === "WEBP";
    case "jpeg":
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "iso": // MP4 y MOV
      return ["ftyp", "moov", "mdat", "wide", "free", "skip"].includes(texto(4, 4));
    case "webm":
      return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
  }
}

/** Pide solo los primeros 16 bytes del archivo público y revisa su firma. Si no se puede leer, devuelve false. */
export async function firmaValida(url: string, formatos: Formato[]): Promise<boolean> {
  try {
    const r = await fetch(url, { headers: { range: "bytes=0-15" }, signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!r.ok || !r.body) return false;
    const lector = r.body.getReader();
    const partes: number[] = [];
    while (partes.length < 16) {
      const { done, value } = await lector.read();
      if (done) break;
      partes.push(...value.slice(0, 16 - partes.length));
    }
    await lector.cancel().catch(() => {});
    const b = Uint8Array.from(partes);
    return b.length >= 12 && formatos.some((f) => coincide(b, f));
  } catch {
    return false;
  }
}
