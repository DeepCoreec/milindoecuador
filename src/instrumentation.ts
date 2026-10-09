import type { Instrumentation } from "next";

/**
 * Errores del servidor (versión 3, paso 13.5): cuando una página, una acción o una ruta falla, Next.js llama aquí.
 * Se escribe una línea estructurada en los registros de Vercel y se anota en la base para el panel ("Errores").
 * Si anotarlo falla, no pasa nada (no debe romper la respuesta).
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { limpiarError } = await import("@/lib/errores");
  // Se agrupa por la plantilla de la ruta (/[ciudad]/[categoria]/[lugar]), no por la dirección que pidió cada visitante:
  // así nadie puede llenar la tabla pidiendo direcciones inventadas
  const e = limpiarError(error, context.routePath || request.path, `${context.routeType}`);
  console.error(JSON.stringify({ evento: "error_servidor", ruta: e.ruta, tipo: e.tipo, mensaje: e.mensaje, codigo: e.codigo, ruta_archivo: context.routePath }));
  try {
    const { configSupabase } = await import("@/lib/supabase/config");
    if (!configSupabase()) return;
    const { crearClienteAdmin } = await import("@/lib/supabase/admin");
    await crearClienteAdmin().rpc("anotar_error", { ruta: e.ruta, tipo: e.tipo, mensaje: e.mensaje, codigo: e.codigo });
  } catch {}
};
