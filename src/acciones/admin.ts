"use server";

import { revalidatePath } from "next/cache";
import { ubicacionSinEnlaceCorto } from "@/acciones/ubicacion";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { DIAS_DESTACADO, nuevoVencimiento } from "@/lib/planes";
import { mensajeModeracion } from "@/lib/moderacion";
import { crearFichaBorrador } from "@/lib/fichas";
import { aSlug, slugLibre } from "@/lib/slug";
import { esEnlaceCorto } from "@/lib/ubicacion";
import { firmaValida } from "@/lib/firmaArchivo";
import { urlPublicaFoto } from "@/lib/fotos";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { exigirConfigSupabase } from "@/lib/supabase/config";
import { crearClienteServidor } from "@/lib/supabase/server";
import {
  esquemaDecisionEvento,
  esquemaDecision,
  esquemaDecisionLugar,
  esquemaLugarAdmin,
  esquemaRevisado,
  esquemaFoto,
  esquemaIdFoto,
  esquemaLugar,
  esquemaModerar,
  esquemaMoverFoto,
  esquemaPalabra,
  esquemaPlan,
  esquemaRespuesta,
} from "@/lib/validacion/admin";

/*
 * Acciones del panel. Cada una vuelve a verificar el rol en el servidor (requireAdmin),
 * aunque la página ya lo hizo: una acción se puede llamar directamente, sin pasar por la página.
 * Escriben con la sesión del admin: además, las reglas RLS de la base exigen el rol admin.
 */

export type EstadoAdmin = {
  estado: "inicio" | "ok" | "error";
  mensaje?: string;
};


/**
 * Aprueba una solicitud: crea la ficha como BORRADOR (no se ve en público) y marca la solicitud.
 * Si la pidió una cuenta (versión 2), esa cuenta queda como dueña y la completa desde «Mi negocio».
 * El dueño solo lo puede poner el servidor (migración 0005), por eso la ficha se crea con admin.ts,
 * siempre después de requireAdmin().
 */
export async function aprobarSolicitud(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaDecision.safeParse({
    solicitud: datos.get("solicitud"),
    nota: datos.get("nota") ?? undefined,
  });
  if (!r.success)
    return {
      estado: "error",
      mensaje: r.error.issues[0]?.message ?? "Datos inválidos",
    };
  await requireAdmin();
  const db = await crearClienteServidor();

  const { data: s } = await db
    .from("business_requests")
    .select("id, business_name, category_id, city_id, sector, whatsapp, description, status, user_id")
    .eq("id", r.data.solicitud)
    .maybeSingle();
  if (!s) return { estado: "error", mensaje: "La solicitud no existe" };
  // Se marca primero, solo si sigue pendiente: si se aprieta dos veces, la segunda no crea otra ficha
  const { data: marcada } = await db
    .from("business_requests")
    .update({ status: "aprobada", admin_notes: r.data.nota || null })
    .eq("id", s.id)
    .eq("status", "pendiente")
    .select("id");
  if (!marcada?.length) return { estado: "error", mensaje: "Esta solicitud ya fue revisada" };

  const ficha = await crearFichaBorrador(s);
  if (!ficha) {
    await db.from("business_requests").update({ status: "pendiente", admin_notes: null }).eq("id", s.id);
    return {
      estado: "error",
      mensaje: "No se pudo crear la ficha. Inténtalo de nuevo.",
    };
  }
  revalidatePath("/admin", "layout");
  return {
    estado: "ok",
    mensaje: s.user_id
      ? `Aprobada: se creó la ficha "${s.business_name}" como borrador. El dueño ya puede completarla y publicarla desde «Mi negocio».`
      : `Aprobada: se creó la ficha "${s.business_name}" como borrador.`,
  };
}

/** Rechaza una solicitud, con una nota opcional para recordar el motivo. */
export async function rechazarSolicitud(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaDecision.safeParse({
    solicitud: datos.get("solicitud"),
    nota: datos.get("nota") ?? undefined,
  });
  if (!r.success)
    return {
      estado: "error",
      mensaje: r.error.issues[0]?.message ?? "Datos inválidos",
    };
  await requireAdmin();
  const db = await crearClienteServidor();
  const { data, error } = await db
    .from("business_requests")
    .update({ status: "rechazada", admin_notes: r.data.nota || null })
    .eq("id", r.data.solicitud)
    .eq("status", "pendiente")
    .select("id");
  if (error)
    return {
      estado: "error",
      mensaje: "No se pudo rechazar. Inténtalo de nuevo.",
    };
  if (!data?.length) return { estado: "error", mensaje: "Esta solicitud ya fue revisada" };
  revalidatePath("/admin", "layout");
  return { estado: "ok", mensaje: "Solicitud rechazada" };
}

/**
 * `intento` cambia con cada respuesta: el formulario se vuelve a dibujar con los valores correctos.
 * Sin esto, React deja las listas desplegables en su valor inicial y un segundo guardado borraba, por ejemplo, el precio.
 */
export type EstadoLugar = EstadoAdmin & {
  errores?: string[];
  valores?: Record<string, string>;
  intento?: number;
};

const CAMPOS_LUGAR = [
  "id",
  "nombre",
  "categoria",
  "sector",
  "descripcion",
  "dato",
  "horario",
  "direccion",
  "ubicacion",
  "horarioDias",
  "precio",
  "whatsapp",
  "web",
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "estado",
] as const;

/** Crea o edita una ficha. Al crear, el slug sale del nombre; al editar, el slug no cambia (no se rompen enlaces). */
export async function guardarLugar(_previo: EstadoLugar, datos: FormData): Promise<EstadoLugar> {
  const valores = Object.fromEntries(CAMPOS_LUGAR.map((c) => [c, String(datos.get(c) ?? "").slice(0, 2100)]));
  if (esEnlaceCorto(valores.ubicacion ?? "")) {
    await requireAdmin(); // antes de pedir nada a Google
    valores.ubicacion = await ubicacionSinEnlaceCorto(valores.ubicacion!);
  }
  const r = esquemaLugar.safeParse(valores);
  if (!r.success)
    return {
      estado: "error",
      mensaje: "Revisa los datos",
      errores: [...new Set(r.error.issues.map((i) => i.message))],
      valores,
      intento: Date.now(),
    };
  await requireAdmin();
  const db = await crearClienteServidor();

  const [{ data: categoria }, { data: ciudad }] = await Promise.all([
    db.from("categories").select("id").eq("slug", r.data.categoria).maybeSingle(),
    db.from("cities").select("id").eq("slug", "guayaquil").maybeSingle(),
  ]);
  if (!categoria || !ciudad)
    return {
      estado: "error",
      mensaje: "Revisa los datos",
      errores: ["Elige una categoría"],
      valores,
      intento: Date.now(),
    };

  const fila = {
    category_id: categoria.id,
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
    status: r.data.estado,
  };

  if (r.data.id === "nuevo") {
    const base = aSlug(r.data.nombre) || "lugar";
    const { data: parecidos } = await db.from("places").select("slug").eq("city_id", ciudad.id).like("slug", `${base}%`);
    const slug = slugLibre(base, new Set((parecidos ?? []).map((p) => p.slug)));
    const { data, error } = await db
      .from("places")
      .insert({ ...fila, city_id: ciudad.id, slug })
      .select("id")
      .single();
    if (error || !data)
      return {
        estado: "error",
        mensaje: mensajeModeracion(error) ?? "No se pudo crear la ficha. Inténtalo de nuevo.",
        valores,
        intento: Date.now(),
      };
    revalidatePath("/", "layout");
    redirect(`/admin/lugares/${data.id}?guardado=1`);
  }

  const { data, error } = await db.from("places").update(fila).eq("id", r.data.id).select("id");
  if (error)
    return {
      estado: "error",
      mensaje: mensajeModeracion(error) ?? "No se pudo guardar. Inténtalo de nuevo.",
      valores,
      intento: Date.now(),
    };
  if (!data?.length) return { estado: "error", mensaje: "La ficha no existe", valores };
  revalidatePath("/", "layout");
  return { estado: "ok", mensaje: "Cambios guardados", intento: Date.now() };
}

/**
 * Registra una foto que el navegador del admin ya subió al bucket (convertida a WebP, sin EXIF).
 * El camino debe ser de ESTE lugar. Si la fila no se puede guardar, se borra el archivo.
 */
export async function registrarFoto(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaFoto.safeParse({
    lugar: datos.get("lugar"),
    camino: datos.get("camino"),
    alt: datos.get("alt"),
  });
  if (!r.success)
    return {
      estado: "error",
      mensaje: r.error.issues[0]?.message ?? "Datos inválidos",
    };
  if (!r.data.camino.startsWith(`lugares/${r.data.lugar}/`)) return { estado: "error", mensaje: "La foto no es de este lugar" };
  await requireAdmin();
  const db = await crearClienteServidor();
  if (!(await firmaValida(urlPublicaFoto(exigirConfigSupabase().url, r.data.camino), ["webp", "jpeg"]))) {
    await crearClienteAdmin().storage.from("fotos-lugares").remove([r.data.camino]);
    return { estado: "error", mensaje: "Ese archivo no es una foto válida. Vuelve a elegirla." };
  }
  const { data: ultima } = await db
    .from("place_photos")
    .select("sort_order")
    .eq("place_id", r.data.lugar)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await db.from("place_photos").insert({
    place_id: r.data.lugar,
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
  revalidatePath("/", "layout");
  return { estado: "ok", mensaje: "Foto agregada" };
}

/**
 * Fotos del panel, paso 1 (versión 3, paso 13.3): igual que el dueño, el servidor da un permiso de subida firmado
 * de un solo uso para un camino que elige él. Así el navegador del admin ya no necesita su sesión para subir.
 */
export async function pedirSubidaFotoAdmin(lugar: string, formato: "webp" | "jpg" = "webp"): Promise<{ camino: string; token: string } | { error: string }> {
  const r = esquemaLugarAdmin.safeParse({ lugar });
  if (!r.success || (formato !== "webp" && formato !== "jpg")) return { error: "Datos inválidos" };
  await requireAdmin();
  const camino = `lugares/${r.data.lugar}/${crypto.randomUUID()}.${formato}`;
  const { data, error } = await crearClienteAdmin().storage.from("fotos-lugares").createSignedUploadUrl(camino);
  if (error || !data) return { error: "No se pudo preparar la subida. Inténtalo de nuevo." };
  return { camino, token: data.token };
}

/** Borra una foto: la fila y el archivo del bucket. */
export async function borrarFoto(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaIdFoto.safeParse({ foto: datos.get("foto") });
  if (!r.success) return { estado: "error", mensaje: "Datos inválidos" };
  await requireAdmin();
  const db = await crearClienteServidor();
  const { data } = await db.from("place_photos").delete().eq("id", r.data.foto).select("storage_path");
  const camino = data?.[0]?.storage_path;
  if (!camino) return { estado: "error", mensaje: "La foto ya no existe" };
  await db.storage.from("fotos-lugares").remove([camino]);
  revalidatePath("/", "layout");
  return { estado: "ok", mensaje: "Foto borrada" };
}

/** Cambia el orden: intercambia la foto con la de antes o la de después. La primera es la foto principal. */
export async function moverFoto(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaMoverFoto.safeParse({
    foto: datos.get("foto"),
    direccion: datos.get("direccion"),
  });
  if (!r.success) return { estado: "error", mensaje: "Datos inválidos" };
  await requireAdmin();
  const db = await crearClienteServidor();
  const { data: foto } = await db.from("place_photos").select("id, place_id, sort_order").eq("id", r.data.foto).maybeSingle();
  if (!foto) return { estado: "error", mensaje: "La foto ya no existe" };
  const { data: todas } = await db.from("place_photos").select("id, sort_order").eq("place_id", foto.place_id).order("sort_order").order("created_at");
  const lista = todas ?? [];
  const i = lista.findIndex((f) => f.id === foto.id);
  const j = r.data.direccion === "antes" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) return { estado: "inicio" };
  // Se renumera toda la lista para que no haya órdenes repetidos
  [lista[i], lista[j]] = [lista[j], lista[i]];
  for (const [n, f] of lista.entries()) {
    if (f.sort_order !== n) await db.from("place_photos").update({ sort_order: n }).eq("id", f.id);
  }
  revalidatePath("/", "layout");
  return { estado: "ok" };
}

/**
 * Decide sobre una reseña: ocultarla, mantenerla o volver a mostrarla.
 * Ocultar y mantener cierran los reportes que tenía.
 */
export async function moderarResena(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaModerar.safeParse({
    resena: datos.get("resena"),
    decision: datos.get("decision"),
  });
  if (!r.success) return { estado: "error", mensaje: "Datos inválidos" };
  await requireAdmin();
  const db = await crearClienteServidor();
  if (r.data.decision !== "mantener") {
    const { error } = await db
      .from("reviews")
      .update({ status: r.data.decision === "ocultar" ? "oculta" : "visible" })
      .eq("id", r.data.resena);
    if (error) return { estado: "error", mensaje: "No se pudo cambiar la reseña" };
  }
  if (r.data.decision !== "mostrar") {
    const { error } = await db.from("review_reports").update({ resolved: true }).eq("review_id", r.data.resena).eq("resolved", false);
    if (error) return { estado: "error", mensaje: "No se pudieron cerrar los reportes" };
  }
  revalidatePath("/", "layout");
  return {
    estado: "ok",
    mensaje: r.data.decision === "ocultar" ? "Reseña oculta" : r.data.decision === "mostrar" ? "Reseña visible otra vez" : "Reseña mantenida",
  };
}

/** Respuesta del negocio a una reseña (la escribe el admin en nombre del negocio). Vacía la quita. */
export async function responderResena(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaRespuesta.safeParse({
    resena: datos.get("resena"),
    respuesta: datos.get("respuesta") ?? "",
  });
  if (!r.success)
    return {
      estado: "error",
      mensaje: r.error.issues[0]?.message ?? "Datos inválidos",
    };
  await requireAdmin();
  const db = await crearClienteServidor();
  const { error } = await db.from("reviews").update({ owner_reply: r.data.respuesta }).eq("id", r.data.resena);
  if (error)
    return {
      estado: "error",
      mensaje: mensajeModeracion(error) ?? "No se pudo guardar la respuesta",
    };
  revalidatePath("/", "layout");
  return {
    estado: "ok",
    mensaje: r.data.respuesta ? "Respuesta publicada" : "Respuesta quitada",
  };
}

/** Activa o quita los planes pagados (en la versión 1 se cobran por transferencia o DeUna y se activan a mano). */
export async function cambiarPlan(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaPlan.safeParse({
    lugar: datos.get("lugar"),
    accion: datos.get("accion"),
  });
  if (!r.success) return { estado: "error", mensaje: "Datos inválidos" };
  await requireAdmin();
  const db = await crearClienteServidor();
  const { data: lugar } = await db.from("places").select("featured_until, is_featured").eq("id", r.data.lugar).maybeSingle();
  if (!lugar) return { estado: "error", mensaje: "La ficha no existe" };

  const actual = lugar.is_featured ? lugar.featured_until : null;
  const cambios =
    r.data.accion === "destacar-semana" || r.data.accion === "destacar-seis-semanas"
      ? {
          is_featured: true,
          featured_until: nuevoVencimiento(actual, r.data.accion === "destacar-semana" ? DIAS_DESTACADO.semana : DIAS_DESTACADO.seisSemanas).toISOString(),
        }
      : r.data.accion === "quitar-destacado"
        ? { is_featured: false, featured_until: null }
        : { is_verified: r.data.accion === "verificar" };
  const { error } = await db.from("places").update(cambios).eq("id", r.data.lugar);
  if (error) return { estado: "error", mensaje: "No se pudo cambiar el plan" };
  revalidatePath("/", "layout");
  return { estado: "ok", mensaje: "Plan actualizado" };
}

/** Agrega una palabra o frase a la lista de prohibidas. Se bloquea al instante en fichas, reseñas y nombres. */
export async function agregarPalabra(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaPalabra.safeParse({ palabra: datos.get("palabra") });
  if (!r.success)
    return {
      estado: "error",
      mensaje: r.error.issues[0]?.message ?? "Datos inválidos",
    };
  await requireAdmin();
  const db = await crearClienteServidor();
  const { error } = await db.from("banned_words").insert({ word: r.data.palabra });
  if (error)
    return {
      estado: "error",
      mensaje: error.code === "23505" ? "Esa palabra ya está en la lista" : "No se pudo agregar. Revisa que tenga solo letras.",
    };
  revalidatePath("/admin/palabras");
  return { estado: "ok", mensaje: `Agregada: «${r.data.palabra}»` };
}

/** Quita una palabra de la lista. */
export async function quitarPalabra(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaPalabra.safeParse({ palabra: datos.get("palabra") });
  if (!r.success) return { estado: "error", mensaje: "Datos inválidos" };
  await requireAdmin();
  const db = await crearClienteServidor();
  const { error } = await db.from("banned_words").delete().eq("word", r.data.palabra);
  if (error) return { estado: "error", mensaje: "No se pudo quitar" };
  revalidatePath("/admin/palabras");
  return { estado: "ok", mensaje: "Quitada" };
}

/** Marca un cambio de un dueño (o todos) como revisado. */
export async function marcarRevisado(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaRevisado.safeParse({ cambio: datos.get("cambio") });
  if (!r.success) return { estado: "error", mensaje: "Datos inválidos" };
  await requireAdmin();
  const db = await crearClienteServidor();
  const consulta = db.from("place_changes").update({ reviewed: true });
  const { error } = r.data.cambio === "todos" ? await consulta.eq("reviewed", false) : await consulta.eq("id", r.data.cambio);
  if (error) return { estado: "error", mensaje: "No se pudo marcar" };
  revalidatePath("/admin", "layout");
  return { estado: "ok", mensaje: "Revisado" };
}

/** Oculta una ficha con un clic (desde "Cambios recientes"). El dueño no la puede volver a mostrar. */
export async function ocultarLugar(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaLugarAdmin.safeParse({ lugar: datos.get("lugar") });
  if (!r.success) return { estado: "error", mensaje: "Datos inválidos" };
  await requireAdmin();
  const db = await crearClienteServidor();
  const { error } = await db.from("places").update({ status: "oculto" }).eq("id", r.data.lugar);
  if (error) return { estado: "error", mensaje: "No se pudo ocultar" };
  revalidatePath("/", "layout");
  return { estado: "ok", mensaje: "Ficha oculta" };
}

/** Decide sobre un lugar reportado: mostrarlo otra vez o dejarlo oculto. Cierra sus reportes. */
export async function decidirLugarReportado(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaDecisionLugar.safeParse({
    lugar: datos.get("lugar"),
    decision: datos.get("decision"),
  });
  if (!r.success) return { estado: "error", mensaje: "Datos inválidos" };
  await requireAdmin();
  const db = await crearClienteServidor();
  const { error } = await db
    .from("places")
    .update({ status: r.data.decision === "mostrar" ? "publicado" : "oculto" })
    .eq("id", r.data.lugar);
  if (error) return { estado: "error", mensaje: "No se pudo cambiar la ficha" };
  const { error: e2 } = await db.from("place_reports").update({ resolved: true }).eq("place_id", r.data.lugar).eq("target", "lugar").eq("resolved", false);
  if (e2) return { estado: "error", mensaje: "No se pudieron cerrar los reportes" };
  revalidatePath("/", "layout");
  return {
    estado: "ok",
    mensaje: r.data.decision === "mostrar" ? "Se ve otra vez" : "Queda oculta",
  };
}

/** Marca un error del servidor como resuelto (versión 3, paso 13.5). Si vuelve a pasar, aparece otra vez. */
export async function resolverError(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaRevisado.safeParse({ cambio: datos.get("error") });
  if (!r.success) return { estado: "error", mensaje: "Datos inválidos" };
  await requireAdmin();
  const db = await crearClienteServidor();
  const q = db.from("error_log").update({ resolved: true }).eq("resolved", false);
  const { error } = r.data.cambio === "todos" ? await q : await q.eq("id", r.data.cambio);
  if (error) return { estado: "error", mensaje: "No se pudo marcar" };
  revalidatePath("/admin", "layout");
  return { estado: "ok", mensaje: "Resuelto" };
}


/** Eventos (versión 5): mostrar otra vez, ocultar o borrar (con su afiche). Cierra sus reportes. */
export async function decidirEvento(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaDecisionEvento.safeParse({ evento: datos.get("evento"), decision: datos.get("decision") });
  if (!r.success) return { estado: "error", mensaje: "Datos inválidos" };
  await requireAdmin();
  const db = await crearClienteServidor();
  if (r.data.decision === "borrar") {
    const { data, error } = await db.from("city_events").delete().eq("id", r.data.evento).select("poster_path").maybeSingle();
    if (error || !data) return { estado: "error", mensaje: "No se pudo borrar" };
    if (data.poster_path) await crearClienteAdmin().storage.from("afiches-eventos").remove([data.poster_path]);
    revalidatePath("/", "layout");
    return { estado: "ok", mensaje: "Evento borrado" };
  }
  const { error } = await db.from("city_events").update({ status: r.data.decision === "mostrar" ? "publicado" : "oculto" }).eq("id", r.data.evento);
  if (error) return { estado: "error", mensaje: "No se pudo cambiar el evento" };
  await db.from("city_event_reports").update({ resolved: true }).eq("event_id", r.data.evento).eq("resolved", false);
  revalidatePath("/", "layout");
  return { estado: "ok", mensaje: r.data.decision === "mostrar" ? "Se ve otra vez" : "Queda oculto" };
}
