/*
 * Prepara una foto en el navegador antes de subirla:
 * - la gira según la cámara y la achica a 1600 px de lado como máximo;
 * - la vuelve a dibujar en un lienzo y la guarda como WebP (o JPG en Safari, que no sabe guardar WebP).
 * Al redibujarla se pierden los datos EXIF (por ejemplo, la ubicación GPS del teléfono).
 */

const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const MAXIMO_ORIGINAL = 25 * 1024 * 1024; // 25 MB antes de convertir
const MAXIMO_FINAL = 5 * 1024 * 1024; // límite del bucket

export async function prepararFoto(archivo: File, lado = 1600, calidad = 0.82): Promise<{ foto: Blob; formato: "webp" | "jpg" }> {
  if (!TIPOS.includes(archivo.type)) throw new Error("Usa una foto JPG, PNG o WebP");
  if (archivo.size > MAXIMO_ORIGINAL) throw new Error("La foto pesa demasiado (máximo 25 MB)");
  let imagen: ImageBitmap;
  try {
    imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  } catch {
    throw new Error("No se pudo abrir esa foto. Puede estar dañada: prueba con otra.");
  }
  const escala = Math.min(1, lado / Math.max(imagen.width, imagen.height));
  const ancho = Math.round(imagen.width * escala);
  const alto = Math.round(imagen.height * escala);
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("Este navegador no puede preparar la foto");
  ctx.drawImage(imagen, 0, 0, ancho, alto);
  imagen.close();
  let blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/webp", calidad));
  // Safari (iPhone) no sabe guardar WebP y devuelve PNG: ahí se guarda como JPG (también sin EXIF)
  if (!blob || blob.type !== "image/webp") blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/jpeg", calidad));
  if (!blob || (blob.type !== "image/webp" && blob.type !== "image/jpeg")) throw new Error("Este navegador no puede preparar la foto. Prueba con otro navegador.");
  if (blob.size > MAXIMO_FINAL) throw new Error("La foto sigue pesando más de 5 MB. Prueba con otra.");
  return { foto: blob, formato: blob.type === "image/webp" ? "webp" : "jpg" };
}
