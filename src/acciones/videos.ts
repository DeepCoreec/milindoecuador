"use server";

import { revalidatePath } from "next/cache";
import { obtenerUsuario, requireAdmin } from "@/lib/auth";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { configSupabase } from "@/lib/supabase/config";
import {
  carpetaVideo,
  esquemaBorrarVideo,
  esquemaDecidirVideo,
  esquemaPedirVideo,
  esquemaRegistrarVideo,
  TIPOS_VIDEO,
  VIDEO_MAX_BYTES,
  VIDEOS_POR_DIA,
} from "@/lib/validacion/video";

/*
 * Video del negocio (versión 3, paso 11.3). Un video por negocio; sale al instante, sin aprobación.
 * Nadie tiene permisos de escritura en la tabla ni en el bucket (migración 0009): todo pasa por aquí.
 * Cada acción, en el servidor: Zod → quién es (dueño de ESE lugar, o admin) → límite diario (dueño) →
 * escribir con admin.ts. El archivo se sube con un permiso firmado de un solo uso, a un camino que elige el servidor.
 */

export type EstadoVideo = { estado: "inicio" | "ok" | "error"; mensaje?: string };

const BUCKET = "videos-lugares";
const SESION = "Tu sesión se cerró. Entra otra vez a tu cuenta.";

/** La cuenta y el lugar, si puede tocar su video: el dueño de ESE lugar, o el admin (comprobado en el servidor). */
async function acceso(lugar: string, modo: "dueno" | "admin"): Promise<{ usuario: string; lugar: string; esAdmin: boolean } | { error: string }> {
  if (!configSupabase()) return { error: "Todavía no está activo." };
  const db = crearClienteAdmin();
  if (modo === "admin") {
    const usuario = await requireAdmin();
    const { data } = await db.from("places").select("id").eq("id", lugar).maybeSingle();
    return data ? { usuario: usuario.id, lugar, esAdmin: true } : { error: "La ficha no existe" };
  }
  const usuario = await obtenerUsuario();
  if (!usuario) return { error: SESION };
  const { data } = await db.from("places").select("id").eq("id", lugar).eq("owner_id", usuario.id).maybeSingle();
  return data ? { usuario: usuario.id, lugar, esAdmin: false } : { error: "Este negocio no está en tu cuenta." };
}

/** Borra todo lo que haya en la carpeta del lugar menos `dejar` (el video viejo y subidas a medias). */
async function limpiarCarpeta(lugar: string, dejar: string[] = []) {
  const bucket = crearClienteAdmin().storage.from(BUCKET);
  const { data } = await bucket.list(carpetaVideo(lugar), { limit: 100 });
  const sobran = (data ?? []).map((o) => `${carpetaVideo(lugar)}/${o.name}`).filter((c) => !dejar.includes(c));
  if (sobran.length) await bucket.remove(sobran);
}

/**
 * Paso 1: el navegador ya revisó el video (tipo, tamaño, duración) y sacó la portada.
 * El servidor lo vuelve a comprobar y da DOS permisos de subida de un solo uso: video y portada.
 * Para el dueño, cada pedido cuenta para el límite diario (así nadie sube archivos sin fin).
 */
export async function pedirSubidaVideo(pedido: {
  lugar: string;
  modo: "dueno" | "admin";
  tipo: string;
  tamano: number;
  portada: "webp" | "jpg";
}): Promise<{ video: { camino: string; token: string }; portada: { camino: string; token: string } } | { error: string }> {
  const r = esquemaPedirVideo.safeParse(pedido);
  if (!r.success) return { error: r.error.issues[0]?.message ?? "Datos inválidos" };
  const a = await acceso(r.data.lugar, r.data.modo);
  if ("error" in a) return a;
  const db = crearClienteAdmin();
  if (!a.esAdmin) {
    const { data: anotado } = await db.rpc("anotar_con_limite", {
      usuario: a.usuario,
      lugar: a.lugar,
      tipo: "video-permiso",
      contar: ["video-permiso"],
      maximo: VIDEOS_POR_DIA,
      detalle: "Pidió subir un video",
      revisado: true,
    });
    if (!anotado) return { error: `Llegaste al límite de ${VIDEOS_POR_DIA} videos por hoy. Vuelve mañana.` };
  }
  const video = `${carpetaVideo(a.lugar)}/${crypto.randomUUID()}.${TIPOS_VIDEO[r.data.tipo]}`;
  const portada = `${carpetaVideo(a.lugar)}/${crypto.randomUUID()}.${r.data.portada}`;
  const bucket = db.storage.from(BUCKET);
  const [v, p] = await Promise.all([bucket.createSignedUploadUrl(video), bucket.createSignedUploadUrl(portada)]);
  if (v.error || p.error || !v.data || !p.data) return { error: "No se pudo preparar la subida. Inténtalo de nuevo." };
  return { video: { camino: video, token: v.data.token }, portada: { camino: portada, token: p.data.token } };
}

/**
 * Paso 2: registra el video ya subido. Comprueba en el bucket que los dos archivos existen, que son de ESTE
 * lugar y que el video no pasa de 50 MB (el tamaño lo mide el bucket, no el navegador).
 * Reemplaza al anterior: borra sus archivos y cierra los reportes que tenía (eran del video viejo).
 */
export async function registrarVideo(_previo: EstadoVideo, datos: FormData): Promise<EstadoVideo> {
  const r = esquemaRegistrarVideo.safeParse({
    lugar: datos.get("lugar"),
    modo: datos.get("modo"),
    video: datos.get("video"),
    portada: datos.get("portada"),
    duracion: datos.get("duracion"),
  });
  if (!r.success) return { estado: "error", mensaje: r.error.issues[0]?.message ?? "Datos inválidos" };
  const a = await acceso(r.data.lugar, r.data.modo);
  if ("error" in a) return { estado: "error", mensaje: a.error };

  const db = crearClienteAdmin();
  const { data: archivos } = await db.storage.from(BUCKET).list(carpetaVideo(a.lugar), { limit: 100 });
  const buscar = (camino: string) => archivos?.find((o) => `${carpetaVideo(a.lugar)}/${o.name}` === camino);
  const video = buscar(r.data.video);
  const portada = buscar(r.data.portada);
  const tamano = Number(video?.metadata?.size ?? 0);
  const tipo = String(video?.metadata?.mimetype ?? "");
  if (!video || !portada || !tamano) return { estado: "error", mensaje: "No encontramos el video subido. Vuelve a intentarlo." };
  if (tamano > VIDEO_MAX_BYTES || !(tipo in TIPOS_VIDEO)) {
    await db.storage.from(BUCKET).remove([r.data.video, r.data.portada]);
    return { estado: "error", mensaje: "El video no cumple las reglas (MP4, MOV o WebM, hasta 50 MB)." };
  }

  const { error } = await db.from("place_videos").upsert(
    {
      place_id: a.lugar,
      storage_path: r.data.video,
      poster_path: r.data.portada,
      duration_seconds: r.data.duracion,
      size_bytes: tamano,
      hidden: false,
    },
    { onConflict: "place_id" },
  );
  if (error) {
    await db.storage.from(BUCKET).remove([r.data.video, r.data.portada]);
    return { estado: "error", mensaje: "No se pudo guardar el video. Inténtalo de nuevo." };
  }
  await Promise.all([
    limpiarCarpeta(a.lugar, [r.data.video, r.data.portada]),
    db.from("place_reports").update({ resolved: true }).eq("place_id", a.lugar).eq("target", "video").eq("resolved", false),
    a.esAdmin
      ? null
      : db.from("place_changes").insert({ place_id: a.lugar, user_id: a.usuario, kind: "video-nuevo", detail: `Subió un video de ${Math.round(r.data.duracion)} s` }),
  ]);
  revalidatePath("/", "layout");
  return { estado: "ok", mensaje: a.esAdmin ? "Video guardado" : "¡Listo! Tu video ya se ve en tu ficha." };
}

/** Borra el video del negocio (fila y archivos). */
export async function borrarVideo(_previo: EstadoVideo, datos: FormData): Promise<EstadoVideo> {
  const r = esquemaBorrarVideo.safeParse({ lugar: datos.get("lugar"), modo: datos.get("modo") });
  if (!r.success) return { estado: "error", mensaje: "Datos inválidos" };
  const a = await acceso(r.data.lugar, r.data.modo);
  if ("error" in a) return { estado: "error", mensaje: a.error };
  const db = crearClienteAdmin();
  const { error } = await db.from("place_videos").delete().eq("place_id", a.lugar);
  if (error) return { estado: "error", mensaje: "No se pudo borrar. Inténtalo de nuevo." };
  await Promise.all([
    limpiarCarpeta(a.lugar),
    db.from("place_reports").update({ resolved: true }).eq("place_id", a.lugar).eq("target", "video").eq("resolved", false),
    a.esAdmin ? null : db.from("place_changes").insert({ place_id: a.lugar, user_id: a.usuario, kind: "video-borrado", detail: "Borró su video" }),
  ]);
  revalidatePath("/", "layout");
  return { estado: "ok", mensaje: "Video borrado" };
}

/**
 * Panel "Videos" (versión 3, paso 11.5): el admin oculta, vuelve a mostrar o borra un video.
 * Mostrar o borrar cierra sus reportes. Verifica el rol en el servidor en cada llamada.
 */
export async function decidirVideo(_previo: EstadoVideo, datos: FormData): Promise<EstadoVideo> {
  const r = esquemaDecidirVideo.safeParse({ lugar: datos.get("lugar"), decision: datos.get("decision") });
  if (!r.success) return { estado: "error", mensaje: "Datos inválidos" };
  await requireAdmin();
  const db = crearClienteAdmin();
  if (r.data.decision === "borrar") {
    const { error } = await db.from("place_videos").delete().eq("place_id", r.data.lugar);
    if (error) return { estado: "error", mensaje: "No se pudo borrar" };
    await limpiarCarpeta(r.data.lugar);
  } else {
    const { data, error } = await db.from("place_videos").update({ hidden: r.data.decision === "ocultar" }).eq("place_id", r.data.lugar).select("place_id");
    if (error || !data?.length) return { estado: "error", mensaje: "El video ya no existe" };
  }
  if (r.data.decision !== "ocultar")
    await db.from("place_reports").update({ resolved: true }).eq("place_id", r.data.lugar).eq("target", "video").eq("resolved", false);
  revalidatePath("/", "layout");
  return { estado: "ok", mensaje: { ocultar: "Video oculto", mostrar: "Se ve otra vez", borrar: "Video borrado" }[r.data.decision] };
}
