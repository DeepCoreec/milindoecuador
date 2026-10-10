"use server";

import { headers } from "next/headers";
import { obtenerUsuario } from "@/lib/auth";
import { verificarCaptcha } from "@/lib/captcha";
import { mensajeModeracion } from "@/lib/moderacion";
import { crearFichaBorrador } from "@/lib/fichas";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { configSupabase } from "@/lib/supabase/config";
import { esquemaSolicitud, type CampoSolicitud } from "@/lib/validacion/negocios";

export type EstadoSolicitud = {
  estado: "inicio" | "ok" | "error";
  mensaje?: string;
  errores?: Partial<Record<CampoSolicitud, string>>;
  /** Lo escrito, para no borrar el formulario cuando hay un error. */
  valores?: Record<string, string>;
  negocio?: string;
  /** Ficha creada al instante (borrador del dueño); si no se pudo, la solicitud queda para revisión. */
  ficha?: string;
  /** Cambia en cada error para volver a dibujar el formulario con lo escrito. */
  intento?: number;
};

const CAMPOS = ["negocio", "categoria", "sector", "contacto", "whatsapp", "descripcion", "terminos"] as const;

/**
 * Registra un negocio. Orden: Zod → captcha → sesión → límites → escribir con admin.ts (la tabla no acepta
 * escrituras desde el navegador; el filtro de palabras de la base revisa los textos).
 * Desde el 2026-10-10 (pedido del usuario) se aprueba SOLO: la cuenta queda como dueña de una ficha en borrador y la
 * completa y publica desde «Mi negocio». El admin la ve después en "Cambios recientes" y la gente puede reportarla.
 * Si algo falla al crear la ficha, la solicitud queda pendiente para que el admin la apruebe a mano.
 */
export async function solicitarRegistro(_previo: EstadoSolicitud, datos: FormData): Promise<EstadoSolicitud> {
  const valores = Object.fromEntries(CAMPOS.map((c) => [c, String(datos.get(c) ?? "").slice(0, 1200)]));
  const r = esquemaSolicitud.safeParse({ ...valores, terminos: datos.get("terminos") ?? undefined });
  if (!r.success) {
    const errores: EstadoSolicitud["errores"] = {};
    for (const i of r.error.issues) {
      const campo = i.path[0] as CampoSolicitud;
      errores[campo] ??= i.message;
    }
    return { estado: "error", mensaje: "Revisa los campos marcados", errores, valores, intento: Date.now() };
  }
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
  if (!(await verificarCaptcha(datos.get("cf-turnstile-response"), ip))) {
    return { estado: "error", mensaje: "Confirma que no eres un robot y vuelve a enviar.", valores, intento: Date.now() };
  }
  if (!configSupabase()) return { estado: "error", mensaje: "El registro todavía no está activo. Vuelve pronto.", valores, intento: Date.now() };
  const usuario = await obtenerUsuario();
  if (!usuario) return { estado: "error", mensaje: "Tu sesión se cerró. Entra otra vez a tu cuenta y vuelve a enviar.", valores, intento: Date.now() };

  const db = crearClienteAdmin();
  const [ciudad, categoria] = await Promise.all([
    db.from("cities").select("id").eq("slug", "guayaquil").eq("active", true).maybeSingle(),
    db.from("categories").select("id").eq("slug", r.data.categoria).maybeSingle(),
  ]);
  if (!categoria.data) return { estado: "error", mensaje: "Revisa los campos marcados", errores: { categoria: "Elige una categoría de la lista" }, valores, intento: Date.now() };
  if (!ciudad.data) return { estado: "error", mensaje: "No se pudo enviar. Inténtalo de nuevo.", valores, intento: Date.now() };

  // Evita llenar la cola: como máximo 3 solicitudes pendientes por cuenta (aviso rápido; la base lo exige con candado, 0013)
  const { count } = await db.from("business_requests").select("id", { count: "exact", head: true }).eq("user_id", usuario.id).eq("status", "pendiente");
  if ((count ?? 0) >= 3) return { estado: "error", mensaje: "Ya tienes 3 solicitudes esperando revisión. Espera a que las revisemos.", valores, intento: Date.now() };

  // Contra el abuso: como máximo 3 negocios nuevos por cuenta al día y 10 en total
  const ayer = new Date(Date.now() - 24 * 3600_000).toISOString();
  const [hoy, total] = await Promise.all([
    db.from("places").select("id", { count: "exact", head: true }).eq("owner_id", usuario.id).gte("created_at", ayer),
    db.from("places").select("id", { count: "exact", head: true }).eq("owner_id", usuario.id),
  ]);
  if ((hoy.count ?? 0) >= 3) return { estado: "error", mensaje: "Ya registraste 3 negocios hoy. Vuelve mañana para registrar otro.", valores, intento: Date.now() };
  if ((total.count ?? 0) >= 10) return { estado: "error", mensaje: "Tu cuenta ya tiene 10 negocios. Escríbenos por WhatsApp si necesitas más.", valores, intento: Date.now() };

  const { data: solicitud, error } = await db.from("business_requests").insert({
    business_name: r.data.negocio,
    category_id: categoria.data.id,
    city_id: ciudad.data.id,
    sector: r.data.sector || null,
    contact_name: r.data.contacto,
    whatsapp: r.data.whatsapp,
    description: r.data.descripcion || null,
    user_id: usuario.id,
    status: "aprobada",
    admin_notes: "Aprobada automáticamente al registrarse",
  }).select("id").single();
  if (error?.message?.includes("limite_solicitudes"))
    return { estado: "error", mensaje: "Ya tienes 3 solicitudes esperando revisión. Espera a que las revisemos.", valores, intento: Date.now() };
  if (error || !solicitud) return { estado: "error", mensaje: mensajeModeracion(error) ?? "No se pudo enviar la solicitud. Inténtalo de nuevo.", valores, intento: Date.now() };

  const ficha = await crearFichaBorrador({
    business_name: r.data.negocio,
    category_id: categoria.data.id,
    city_id: ciudad.data.id,
    sector: r.data.sector || null,
    whatsapp: r.data.whatsapp,
    description: r.data.descripcion || null,
    user_id: usuario.id,
  });
  if (!ficha) {
    // Respaldo: queda pendiente y el admin la aprueba a mano
    await db.from("business_requests").update({ status: "pendiente", admin_notes: null }).eq("id", solicitud.id);
    return { estado: "ok", negocio: r.data.negocio };
  }
  return { estado: "ok", negocio: r.data.negocio, ficha: ficha.id };
}
