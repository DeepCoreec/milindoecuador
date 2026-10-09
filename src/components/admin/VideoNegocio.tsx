"use client";

import { startTransition, useActionState, useState } from "react";
import { borrarVideo, pedirSubidaVideo, registrarVideo, type EstadoVideo } from "@/acciones/videos";
import { clasesBoton } from "@/components/ui/Boton";
import { claseAyuda, claseEtiqueta } from "@/components/ui/clasesFormulario";
import type { VideoLugar } from "@/lib/datos/video";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { VIDEO_MAX_SEGUNDOS } from "@/lib/validacion/video";
import { revisarVideo } from "@/lib/video";

const inicial: EstadoVideo = { estado: "inicio" };

/**
 * El video del negocio en "Mi negocio" y en el panel (versión 3, paso 11.3). Un video; subir otro lo reemplaza.
 * 1) el navegador revisa el video y saca la portada; 2) el servidor da permisos de subida de un solo uso;
 * 3) se suben video y portada directo al bucket; 4) el servidor comprueba los archivos y lo publica.
 */
export function VideoNegocio({ lugar, video, modo = "dueno" }: { lugar: string; video: VideoLugar | null; modo?: "dueno" | "admin" }) {
  const [registro, registrar, registrando] = useActionState(registrarVideo, inicial);
  const [borrado, borrar, borrando] = useActionState(borrarVideo, inicial);
  const [paso, setPaso] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [ultimo, setUltimo] = useState<"registrar" | "borrar">("registrar");
  const ocupado = paso !== null || registrando || borrando;

  async function subir(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const archivo = (form.elements.namedItem("video") as HTMLInputElement).files?.[0];
    if (!archivo) return setAviso("Elige un video");
    setAviso(null);
    try {
      setPaso("Revisando el video…");
      const { tipo, duracion, portada } = await revisarVideo(archivo);
      const permiso = await pedirSubidaVideo({ lugar, modo, tipo, tamano: archivo.size, portada: portada.type === "image/webp" ? "webp" : "jpg" });
      if ("error" in permiso) throw new Error(permiso.error);
      setPaso(`Subiendo el video (${(archivo.size / 1048576).toFixed(1)} MB). Con datos móviles puede tardar unos minutos: no cierres esta página…`);
      const bucket = crearClienteNavegador().storage.from("videos-lugares");
      const [v, p] = await Promise.all([
        bucket.uploadToSignedUrl(permiso.video.camino, permiso.video.token, archivo, { contentType: tipo }),
        bucket.uploadToSignedUrl(permiso.portada.camino, permiso.portada.token, portada, { contentType: portada.type }),
      ]);
      if (v.error || p.error) throw new Error("No se pudo subir el video. Revisa tu conexión e inténtalo de nuevo.");
      const datos = new FormData();
      datos.set("lugar", lugar);
      datos.set("modo", modo);
      datos.set("video", permiso.video.camino);
      datos.set("portada", permiso.portada.camino);
      datos.set("duracion", String(duracion));
      setUltimo("registrar");
      startTransition(() => registrar(datos));
      form.reset();
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "No se pudo subir el video");
    } finally {
      setPaso(null);
    }
  }

  const final = ultimo === "borrar" ? borrado : registro;
  const resultado = aviso
    ? { tipo: "error", texto: aviso }
    : paso
      ? { tipo: "paso", texto: paso }
      : registrando
        ? { tipo: "paso", texto: "Guardando…" }
        : final.estado !== "inicio"
          ? { tipo: final.estado === "ok" ? "ok" : "error", texto: final.mensaje ?? "" }
          : null;

  return (
    <section aria-labelledby="t-video" className="grid gap-5 rounded-xl border border-linea bg-papel-alto p-6">
      <div className="grid gap-1">
        <h2 id="t-video" className="m-0 text-xl leading-[26px] font-semibold">
          Video
        </h2>
        <p className={`m-0 ${claseAyuda}`}>
          Un video corto de tu negocio: hasta {VIDEO_MAX_SEGUNDOS} segundos y 50 MB, en MP4, MOV o WebM. Sale al instante en tu ficha. Graba tu local,
          tus platos o tu servicio; sin música con derechos de autor.
        </p>
      </div>

      {video && (
        <div className="grid gap-3">
          {video.oculto && (
            <p role="status" className="m-0 rounded-md bg-mango-suave px-4 py-3 text-sm leading-5">
              <b>Tu video está oculto.</b>{" "}
              {modo === "admin" ? "Lo ocultaron los reportes o el panel." : "Lo estamos revisando. Si subes otro, también quedará en revisión hasta que lo veamos. Si tienes dudas, escríbenos por WhatsApp."}
            </p>
          )}
          {modo === "admin" && video.reportes > 0 && (
            <p className="m-0 text-sm leading-5 text-error">
              {video.reportes} {video.reportes === 1 ? "reporte" : "reportes"} sin resolver
            </p>
          )}
          <video
            controls
            playsInline
            preload="none"
            poster={video.portada ?? undefined}
            src={video.src}
            className="max-h-[480px] w-full rounded-md bg-celeste-suave object-contain"
            aria-label={`Video del negocio (${Math.round(video.duracion)} segundos)`}
          />
          <div className="flex flex-wrap items-center gap-3">
            {confirmar ? (
              <>
                <form action={borrar}>
                  <input type="hidden" name="lugar" value={lugar} />
                  <input type="hidden" name="modo" value={modo} />
                  <button type="submit" disabled={ocupado} className={clasesBoton("secundario", "chico", "text-error!")} onClick={() => {
                      setUltimo("borrar");
                      setAviso(null);
                      setTimeout(() => setConfirmar(false));
                    }}
                  >
                    Sí, borrar el video
                  </button>
                </form>
                <button type="button" className={clasesBoton("texto", "chico")} onClick={() => setConfirmar(false)}>
                  No, dejarlo
                </button>
              </>
            ) : (
              <button type="button" disabled={ocupado} className={clasesBoton("texto", "chico", "text-error!")} onClick={() => setConfirmar(true)}>
                Borrar video
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={subir} className={`grid gap-4 ${video ? "border-t border-linea pt-5" : ""}`}>
        <div className="grid gap-1.5">
          <label htmlFor="v-archivo" className={claseEtiqueta}>
            {video ? "Cambiar por otro video" : "Elige tu video"}
          </label>
          <input
            id="v-archivo"
            name="video"
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v"
            className="text-[15px] file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-md file:border file:border-linea-fuerte file:bg-papel file:px-4 file:font-semibold file:text-rio"
          />
        </div>
        {resultado && resultado.texto && (
          <p
            role={resultado.tipo === "error" ? "alert" : "status"}
            className={`m-0 text-sm leading-5 font-semibold ${resultado.tipo === "error" ? "text-error" : resultado.tipo === "ok" ? "text-exito" : "text-rio"}`}
          >
            {resultado.texto}
          </p>
        )}
        <button type="submit" disabled={ocupado} className={clasesBoton("secundario", "normal", "justify-self-start")}>
          {ocupado ? "Un momento…" : video ? "Subir y reemplazar" : "Subir video"}
        </button>
      </form>
    </section>
  );
}
