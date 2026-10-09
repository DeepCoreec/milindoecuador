import { TIPOS_VIDEO, VIDEO_MAX_BYTES, VIDEO_MAX_SEGUNDOS, type TipoVideo } from "@/lib/validacion/video";

/*
 * Revisa un video en el navegador ANTES de subirlo (versión 3, paso 11.3): tipo, tamaño y duración,
 * y saca una portada (una foto del video) en WebP. Si el navegador no puede abrir el video,
 * tampoco lo podrían ver los visitantes con ese navegador: se avisa antes de gastar datos en subirlo.
 */

const EXTENSIONES: Record<string, TipoVideo> = { mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm" };

/** El tipo del archivo. Algunos teléfonos no lo dicen: se deduce de la extensión. */
export function tipoDeVideo(archivo: File): TipoVideo | null {
  if (archivo.type in TIPOS_VIDEO) return archivo.type as TipoVideo;
  const ext = archivo.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSIONES[ext] ?? null;
}

const NO_SE_LEE =
  "Este navegador no puede abrir ese video. Expórtalo en MP4 (en iPhone: Ajustes → Cámara → Formatos → «Más compatible») o prueba con otro navegador.";

function esperar(video: HTMLVideoElement, evento: string, segundos = 20): Promise<void> {
  return new Promise((ok, mal) => {
    const fin = setTimeout(() => {
      limpiar();
      mal(new Error(NO_SE_LEE));
    }, segundos * 1000);
    const listo = () => {
      limpiar();
      ok();
    };
    const error = () => {
      limpiar();
      mal(new Error(NO_SE_LEE));
    };
    const limpiar = () => {
      clearTimeout(fin);
      video.removeEventListener(evento, listo);
      video.removeEventListener("error", error);
    };
    video.addEventListener(evento, listo, { once: true });
    video.addEventListener("error", error, { once: true });
  });
}

export async function revisarVideo(archivo: File): Promise<{ tipo: TipoVideo; duracion: number; portada: Blob }> {
  const tipo = tipoDeVideo(archivo);
  if (!tipo) throw new Error("Usa un video MP4, MOV o WebM");
  if (archivo.size > VIDEO_MAX_BYTES) throw new Error("El video pesa más de 50 MB. Recórtalo o grábalo en menor calidad (1080p o 720p).");

  const url = URL.createObjectURL(archivo);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    const metadatos = esperar(video, "loadedmetadata");
    video.src = url;
    await metadatos;
    let duracion = video.duration;
    if (!Number.isFinite(duracion)) {
      // Algunos WebM no traen la duración: se adelanta al final para que el navegador la calcule
      const cambio = esperar(video, "durationchange");
      video.currentTime = 1e7;
      await cambio;
      duracion = video.duration;
    }
    if (!Number.isFinite(duracion) || duracion <= 0) throw new Error(NO_SE_LEE);
    if (duracion > VIDEO_MAX_SEGUNDOS + 0.5)
      throw new Error(`El video dura ${Math.round(duracion)} segundos. El máximo es ${VIDEO_MAX_SEGUNDOS}: recórtalo y vuelve a intentarlo.`);
    if (!video.videoWidth || !video.videoHeight) throw new Error(NO_SE_LEE);

    // Portada: un cuadro a 1 segundo (o al tercio si es más corto), de 1280 px de ancho como máximo
    const salto = esperar(video, "seeked");
    video.currentTime = Math.min(1, duracion / 3);
    await salto;
    const escala = Math.min(1, 1280 / video.videoWidth);
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(video.videoWidth * escala);
    lienzo.height = Math.round(video.videoHeight * escala);
    const ctx = lienzo.getContext("2d");
    if (!ctx) throw new Error("Este navegador no puede preparar la portada del video");
    ctx.drawImage(video, 0, 0, lienzo.width, lienzo.height);
    // WebP si el navegador sabe guardarlo; si no (Safari devuelve PNG), JPG
    let portada = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/webp", 0.8));
    if (!portada || portada.type !== "image/webp") portada = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/jpeg", 0.82));
    if (!portada || (portada.type !== "image/webp" && portada.type !== "image/jpeg")) throw new Error("Este navegador no puede preparar la portada del video.");
    return { tipo, duracion: Math.round(duracion * 10) / 10, portada };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
