"use server";

import { revalidatePath } from "next/cache";
import { ubicacionSinEnlaceCorto } from "@/acciones/ubicacion";
import { obtenerUsuario } from "@/lib/auth";
import { leerHorario } from "@/lib/horario";
import { mensajeModeracion } from "@/lib/moderacion";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { configSupabase } from "@/lib/supabase/config";
import { esEnlaceCorto } from "@/lib/ubicacion";
import { DESCRIPCION_PENDIENTE, esquemaEstadoDueno, esquemaFotoDueno, esquemaNegocio, esquemaRespuestaDueno, esquemaSubidaDueno } from "@/lib/validacion/dueno";
import { esquemaIdFoto, esquemaMoverFoto } from "@/lib/validacion/admin";

/*
 * Acciones de "Mi negocio" (versión 2, fase 9). El dueño publica al instante.
 * Cada acción, en el servidor y en este orden:
 *   1. Zod;  2. sesión;  3. que la cuenta sea dueña de ESE lugar;
 *   4. límite diario: se anota el cambio para el admin solo si hay cupo (atómico, migración 0008);
 *   5. escribir con admin.ts (el dueño no tiene permisos en la base, migración 0005);
 *   6. la base revisa los textos (migración 0006); si algo falla, se borra la anotación.
 */

export type EstadoDueno = {
  estado: "inicio" | "ok" | "error";
  mensaje?: string;
  errores?: string[];
  valores?: Record<string, string>;
  intento?: number;
};

const LIMITES = { ficha: 40, permisosFoto: 40, fotosOrden: 60, respuesta: 50 } as const;
const SESION = "Tu sesión se cerró. Entra otra vez a tu cuenta.";
const NO_ES_TUYO = "Este negocio no está en tu cuenta.";

type Lugar = {
  id: string;
  status: "borrador" | "publicado" | "oculto";
  description: string;
};

/** Pasos 2 y 3: la cuenta de la sesión y su lugar (o un mensaje de error). */
async function miLugar(lugarId: string): Promise<{ usuario: { id: string }; lugar: Lugar } | { error: string }> {
  if (!configSupabase()) return { error: "Todavía no está activo." };
  const usuario = await obtenerUsuario();
  if (!usuario) return { error: SESION };
  const { data } = await crearClienteAdmin().from("places").select("id, status, description").eq("id", lugarId).eq("owner_id", usuario.id).maybeSingle();
  if (!data) return { error: NO_ES_TUYO };
  return { usuario, lugar: data as Lugar };
}

/**
 * Paso 4: anota el cambio solo si la cuenta no llegó al límite de las últimas 24 horas.
 * Se cuenta y se anota en la misma transacción de la base (migración 0008): dos pedidos al mismo tiempo no
 * pasan el límite. Devuelve el id de la anotación (para borrarla si después el guardado falla) o null.
 */
async function reservar(usuario: string, lugar: string, tipo: string, contar: string[], maximo: number, detalle: string, revisado = false) {
  const { data, error } = await crearClienteAdmin().rpc("anotar_con_limite", { usuario, lugar, tipo, contar, maximo, detalle, revisado });
  return error ? null : (data as number | null);
}
const quitar = (id: number) => crearClienteAdmin().from("place_changes").delete().eq("id", id);

async function anotar(lugarId: string, usuarioId: string, kind: string, detail: string) {
  await crearClienteAdmin().from("place_changes").insert({ place_id: lugarId, user_id: usuarioId, kind, detail: detail.slice(0, 300) });
}

const LIMITE_DIA = "Llegaste al límite de cambios por hoy. Vuelve mañana o escríbenos si es urgente.";

const ETIQUETAS: Record<string, string> = {
  name: "nombre",
  sector: "sector",
  description: "descripción",
  short_fact: "dato corto",
  hours: "horario",
  address: "dirección",
  opening_hours: "horario por día",
  latitude: "ubicación",
  price_level: "precio",
  whatsapp: "WhatsApp",
  website: "página web",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};
const CAMPOS = ["lugar", "nombre", "sector", "descripcion", "dato", "horario", "direccion", "ubicacion", "horarioDias", "precio", "whatsapp", "web", "facebook", "instagram", "tiktok", "youtube"] as const;

/** Guarda los datos de la ficha. Sale al instante (si está publicada). */
export async function guardarMiNegocio(_previo: EstadoDueno, datos: FormData): Promise<EstadoDueno> {
  const valores = Object.fromEntries(CAMPOS.map((c) => [c, String(datos.get(c) ?? "").slice(0, 2100)]));
  if (esEnlaceCorto(valores.ubicacion ?? "")) valores.ubicacion = await ubicacionSinEnlaceCorto(valores.ubicacion!);
  const r = esquemaNegocio.safeParse(valores);
  if (!r.success)
    return {
      estado: "error",
      mensaje: "Revisa los datos",
      errores: [...new Set(r.error.issues.map((i) => i.message))],
      valores,
      intento: Date.now(),
    };
  const m = await miLugar(r.data.lugar);
  if ("error" in m) return { estado: "error", mensaje: m.error, valores, intento: Date.now() };

  const db = crearClienteAdmin();
  const { data: antes } = await db
    .from("places")
    .select("name, sector, description, short_fact, hours, address, latitude, longitude, opening_hours, price_level, whatsapp, website, facebook, instagram, tiktok, youtube")
    .eq("id", m.lugar.id)
    .single();
  const fila = {
    name: r.data.nombre,
    sector: r.data.sector,
    description: r.data.descripcion,
    short_fact: r.data.dato,
    hours: r.data.horario,
    address: r.data.direccion,
    latitude: r.data.ubicacion?.lat ?? null,
    longitude: r.data.ubicacion?.lng ?? null,
    opening_hours: r.data.horarioDias,
    price_level: r.data.precio,
    whatsapp: r.data.whatsapp,
    website: r.data.web,
    facebook: r.data.facebook,
    instagram: r.data.instagram,
    tiktok: r.data.tiktok,
    youtube: r.data.youtube,
  };
  const cambiados = Object.keys(ETIQUETAS).filter((k) => {
    const a = antes?.[k as keyof typeof antes];
    const b = fila[k as keyof typeof fila];
    return k === "latitude"
      ? Number(a ?? NaN) !== Number(b ?? NaN) || Number(antes?.longitude ?? NaN) !== Number(fila.longitude ?? NaN)
      : k === "opening_hours"
        ? JSON.stringify(leerHorario(a)) !== JSON.stringify(leerHorario(b))
        : (a ?? null) !== (b ?? null);
  });
  if (cambiados.length === 0)
    return {
      estado: "ok",
      mensaje: "No había cambios que guardar",
      intento: Date.now(),
    };

  const anotado = await reservar(m.usuario.id, m.lugar.id, "ficha", ["ficha", "estado"], LIMITES.ficha, `Cambió: ${cambiados.map((k) => ETIQUETAS[k]).join(", ")}`);
  if (!anotado) return { estado: "error", mensaje: LIMITE_DIA, valores, intento: Date.now() };
  const { error } = await db.from("places").update(fila).eq("id", m.lugar.id).eq("owner_id", m.usuario.id);
  if (error) {
    await quitar(anotado);
    return {
      estado: "error",
      mensaje: mensajeModeracion(error) ?? "No se pudo guardar. Inténtalo de nuevo.",
      valores,
      intento: Date.now(),
    };
  }
  revalidatePath("/", "layout");
  return {
    estado: "ok",
    mensaje: m.lugar.status === "publicado" ? "Cambios guardados y publicados" : "Cambios guardados",
    intento: Date.now(),
  };
}

/**
 * Publicar o pausar la ficha. Para publicar hace falta la descripción y al menos una foto.
 * Una ficha "oculta" la ocultó el admin o los reportes: el dueño no la puede volver a mostrar.
 */
export async function cambiarEstadoMiNegocio(_previo: EstadoDueno, datos: FormData): Promise<EstadoDueno> {
  const r = esquemaEstadoDueno.safeParse({
    lugar: datos.get("lugar"),
    estado: datos.get("estado"),
  });
  if (!r.success) return { estado: "error", mensaje: "Datos inválidos" };
  const m = await miLugar(r.data.lugar);
  if ("error" in m) return { estado: "error", mensaje: m.error };
  if (m.lugar.status === "oculto")
    return {
      estado: "error",
      mensaje: "Tu ficha está en revisión. Escríbenos por WhatsApp para resolverlo.",
    };
  if (m.lugar.status === r.data.estado) return { estado: "ok", mensaje: "Sin cambios" };

  const db = crearClienteAdmin();
  if (r.data.estado === "publicado") {
    if (m.lugar.description.startsWith(DESCRIPCION_PENDIENTE))
      return {
        estado: "error",
        mensaje: "Antes de publicar, escribe la descripción de tu negocio y guárdala.",
      };
    const { count } = await db.from("place_photos").select("id", { count: "exact", head: true }).eq("place_id", m.lugar.id);
    if (!count)
      return {
        estado: "error",
        mensaje: "Antes de publicar, sube al menos una foto.",
      };
  }
  const anotado = await reservar(m.usuario.id, m.lugar.id, "estado", ["ficha", "estado"], LIMITES.ficha, r.data.estado === "publicado" ? "Publicó la ficha" : "Pausó la ficha (borrador)");
  if (!anotado) return { estado: "error", mensaje: LIMITE_DIA };
  const { error } = await db.from("places").update({ status: r.data.estado }).eq("id", m.lugar.id).eq("owner_id", m.usuario.id).neq("status", "oculto");
  if (error) {
    await quitar(anotado);
    return { estado: "error", mensaje: "No se pudo cambiar. Inténtalo de nuevo." };
  }
  revalidatePath("/", "layout");
  return {
    estado: "ok",
    mensaje: r.data.estado === "publicado" ? "¡Tu ficha ya se ve en la guía!" : "Ficha pausada: ya no se ve en la guía",
  };
}

/**
 * Fotos, paso 1: el servidor comprueba todo y da un permiso de subida de un solo uso para un camino
 * que elige él (lugares/<lugar>/<al azar>.webp). Así el dueño no necesita permisos en el bucket.
 */
export async function pedirSubidaFoto(lugarId: string): Promise<{ camino: string; token: string } | { error: string }> {
  const r = esquemaSubidaDueno.safeParse({ lugar: lugarId });
  if (!r.success) return { error: "Datos inválidos" };
  const m = await miLugar(r.data.lugar);
  if ("error" in m) return m;
  const db = crearClienteAdmin();
  const { count } = await db.from("place_photos").select("id", { count: "exact", head: true }).eq("place_id", m.lugar.id);
  if ((count ?? 0) >= 15)
    return {
      error: "Ya hay 15 fotos, el máximo. Borra alguna para subir otra.",
    };
  // Cada permiso cuenta (aunque la foto no se registre): así nadie sube archivos sin fin. No sale en "Cambios recientes".
  if (!(await reservar(m.usuario.id, m.lugar.id, "foto-permiso", ["foto-permiso"], LIMITES.permisosFoto, "Pidió subir una foto", true)))
    return { error: "Llegaste al límite de fotos por hoy. Vuelve mañana." };
  const camino = `lugares/${m.lugar.id}/${crypto.randomUUID()}.webp`;
  const { data, error } = await db.storage.from("fotos-lugares").createSignedUploadUrl(camino);
  if (error || !data) return { error: "No se pudo preparar la subida. Inténtalo de nuevo." };
  return { camino, token: data.token };
}

/** Fotos, paso 2: registra la foto ya subida. El camino tiene que ser de ESTE lugar y existir en el bucket. */
export async function registrarFotoDueno(_previo: EstadoDueno, datos: FormData): Promise<EstadoDueno> {
  const r = esquemaFotoDueno.safeParse({
    lugar: datos.get("lugar"),
    camino: datos.get("camino"),
    alt: datos.get("alt"),
  });
  if (!r.success)
    return {
      estado: "error",
      mensaje: r.error.issues[0]?.message ?? "Datos inválidos",
    };
  if (!r.data.camino.startsWith(`lugares/${r.data.lugar}/`)) return { estado: "error", mensaje: "La foto no es de este negocio" };
  const m = await miLugar(r.data.lugar);
  if ("error" in m) return { estado: "error", mensaje: m.error };
  const db = crearClienteAdmin();
  const nombre = r.data.camino.split("/").pop()!;
  const { data: existe } = await db.storage.from("fotos-lugares").list(`lugares/${m.lugar.id}`, { search: nombre, limit: 1 });
  if (!existe?.some((o) => o.name === nombre))
    return {
      estado: "error",
      mensaje: "No encontramos la foto subida. Vuelve a intentarlo.",
    };
  const { data: ultima } = await db
    .from("place_photos")
    .select("sort_order")
    .eq("place_id", m.lugar.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await db.from("place_photos").insert({
    place_id: m.lugar.id,
    storage_path: r.data.camino,
    alt_text: r.data.alt,
    sort_order: (ultima?.sort_order ?? -1) + 1,
  });
  if (error) {
    await db.storage.from("fotos-lugares").remove([r.data.camino]);
    return {
      estado: "error",
      mensaje: mensajeModeracion(error) ?? "No se pudo guardar la foto. Inténtalo de nuevo.",
    };
  }
  await anotar(m.lugar.id, m.usuario.id, "foto-nueva", `Subió una foto: ${r.data.alt}`);
  revalidatePath("/", "layout");
  return { estado: "ok", mensaje: "Foto agregada" };
}

/** La foto y su lugar, solo si la cuenta es dueña. */
async function miFoto(fotoId: string) {
  const { data } = await crearClienteAdmin().from("place_photos").select("id, place_id, storage_path, alt_text, sort_order").eq("id", fotoId).maybeSingle();
  if (!data) return { error: "La foto ya no existe" } as const;
  const m = await miLugar(data.place_id as string);
  if ("error" in m) return m;
  return { ...m, foto: data };
}

export async function borrarFotoDueno(_previo: EstadoDueno, datos: FormData): Promise<EstadoDueno> {
  const r = esquemaIdFoto.safeParse({ foto: datos.get("foto") });
  if (!r.success) return { estado: "error", mensaje: "Datos inválidos" };
  const m = await miFoto(r.data.foto);
  if ("error" in m) return { estado: "error", mensaje: m.error };
  const db = crearClienteAdmin();
  const anotado = await reservar(m.usuario.id, m.lugar.id, "foto-borrada", ["foto-borrada", "foto-orden"], LIMITES.fotosOrden, `Borró una foto: ${m.foto.alt_text}`);
  if (!anotado) return { estado: "error", mensaje: LIMITE_DIA };
  const { error } = await db.from("place_photos").delete().eq("id", m.foto.id).eq("place_id", m.lugar.id);
  if (error) {
    await quitar(anotado);
    return { estado: "error", mensaje: "No se pudo borrar" };
  }
  await db.storage.from("fotos-lugares").remove([m.foto.storage_path as string]);
  revalidatePath("/", "layout");
  return { estado: "ok", mensaje: "Foto borrada" };
}

export async function moverFotoDueno(_previo: EstadoDueno, datos: FormData): Promise<EstadoDueno> {
  const r = esquemaMoverFoto.safeParse({
    foto: datos.get("foto"),
    direccion: datos.get("direccion"),
  });
  if (!r.success) return { estado: "error", mensaje: "Datos inválidos" };
  const m = await miFoto(r.data.foto);
  if ("error" in m) return { estado: "error", mensaje: m.error };
  const db = crearClienteAdmin();
  const { data: todas } = await db.from("place_photos").select("id, sort_order").eq("place_id", m.lugar.id).order("sort_order").order("created_at");
  const lista = todas ?? [];
  const i = lista.findIndex((f) => f.id === m.foto.id);
  const j = r.data.direccion === "antes" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) return { estado: "ok" };
  if (!(await reservar(m.usuario.id, m.lugar.id, "foto-orden", ["foto-borrada", "foto-orden"], LIMITES.fotosOrden, "Cambió el orden de las fotos")))
    return { estado: "error", mensaje: LIMITE_DIA };
  // Se renumeran todas para que el orden quede limpio (0, 1, 2…)
  [lista[i], lista[j]] = [lista[j]!, lista[i]!];
  await Promise.all(lista.map((f, k) => db.from("place_photos").update({ sort_order: k }).eq("id", f.id).eq("place_id", m.lugar.id)));
  revalidatePath("/", "layout");
  return { estado: "ok", mensaje: "Orden cambiado" };
}

/** El dueño responde una reseña de SU negocio (paso 9.4). Vacía la quita. */
export async function responderComoDueno(_previo: EstadoDueno, datos: FormData): Promise<EstadoDueno> {
  const r = esquemaRespuestaDueno.safeParse({
    resena: datos.get("resena"),
    respuesta: datos.get("respuesta") ?? "",
  });
  if (!r.success)
    return {
      estado: "error",
      mensaje: r.error.issues[0]?.message ?? "Datos inválidos",
    };
  const db = crearClienteAdmin();
  const { data: resena } = await db.from("reviews").select("id, place_id").eq("id", r.data.resena).maybeSingle();
  if (!resena) return { estado: "error", mensaje: "La reseña ya no existe" };
  const m = await miLugar(resena.place_id as string);
  if ("error" in m) return { estado: "error", mensaje: m.error };
  const anotado = await reservar(m.usuario.id, m.lugar.id, "respuesta", ["respuesta"], LIMITES.respuesta, r.data.respuesta ? `Respondió: ${r.data.respuesta}` : "Quitó una respuesta");
  if (!anotado) return { estado: "error", mensaje: LIMITE_DIA };
  const { error } = await db.from("reviews").update({ owner_reply: r.data.respuesta }).eq("id", resena.id).eq("place_id", m.lugar.id);
  if (error) {
    await quitar(anotado);
    return { estado: "error", mensaje: mensajeModeracion(error) ?? "No se pudo guardar la respuesta" };
  }
  revalidatePath("/", "layout");
  return {
    estado: "ok",
    mensaje: r.data.respuesta ? "Respuesta publicada" : "Respuesta quitada",
  };
}
