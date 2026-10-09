import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { verificarCaptcha } from "@/lib/captcha";
import { huellaDelDia, leerCuerpoCorto } from "@/lib/huella";
import { ErrorPaumi, conversar } from "@/lib/paumi/cerebro";
import { configPaumi, paumiActivo } from "@/lib/paumi/config";
import { COOKIE_PASE, DURACION_PASE, crearPase, paseValido } from "@/lib/paumi/pase";
import { MAX_HISTORIAL, MAX_MENSAJE } from "@/lib/paumi/personaje";
import { urlSitio } from "@/lib/sitio";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/*
 * Conversar con Paumi (versión 3, paso 14.1). En este orden, en el servidor:
 *   1. interruptor (PAUMI_ACTIVO) y origen (solo nuestras páginas);
 *   2. cuerpo de 8 KB como máximo, validado con Zod (historial de 12 mensajes de 400 caracteres);
 *   3. captcha la primera vez → "pase" firmado por 2 horas;
 *   4. tope de mensajes por persona y por día en la base (huella cifrada, sin guardar la IP);
 *   5. recién ahí se llama a la IA. No se guarda la conversación.
 */
export const dynamic = "force-dynamic";

const esquema = z.object({
  mensajes: z
    .array(z.object({ rol: z.enum(["usuario", "paumi"]), texto: z.string().trim().min(1).max(MAX_MENSAJE * 3) }))
    .min(1)
    .max(MAX_HISTORIAL)
    .refine((m) => m.at(-1)!.rol === "usuario" && m.at(-1)!.texto.length <= MAX_MENSAJE, "Mensaje inválido"),
  captcha: z.string().max(2048).optional(),
});

const respuesta = (cuerpo: object, status = 200) => NextResponse.json(cuerpo, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: NextRequest) {
  if (!paumiActivo()) return respuesta({ error: "Paumi todavía no está activa." }, 404);
  const origen = request.headers.get("origin");
  if (!origen || (origen !== urlSitio().origin && origen !== request.nextUrl.origin)) return respuesta({ error: "Origen no permitido" }, 403);

  const texto = await leerCuerpoCorto(request, 8_000);
  if (texto === null) return respuesta({ error: "Mensaje demasiado largo" }, 413);
  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return respuesta({ error: "Pedido inválido" }, 400);
  }
  const r = esquema.safeParse(cuerpo);
  if (!r.success) return respuesta({ error: `Escribe un mensaje de hasta ${MAX_MENSAJE} letras.` }, 400);

  let pase: string | null = null;
  if (!paseValido(request.cookies.get(COOKIE_PASE)?.value)) {
    const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    if (!(await verificarCaptcha(r.data.captcha, ip))) return respuesta({ error: "captcha", mensaje: "Confirma que no eres un robot para hablar con Paumi." }, 401);
    pase = crearPase();
  }

  const c = configPaumi();
  const { data: uso } = await crearClienteAdmin().rpc("usar_paumi", { huella: huellaDelDia(request, "paumi"), maximo_persona: c.maxPersona, maximo_total: c.maxDia });
  if (uso === "persona") return respuesta({ error: "limite", mensaje: "¡Hablamos un montón hoy! 🦜 Vuelve mañana y seguimos. Mientras tanto, explora la guía." }, 429);
  if (uso !== "ok") return respuesta({ error: "descanso", mensaje: "Paumi está descansando por hoy 😴. Vuelve mañana. Mientras tanto, explora la guía." }, 503);

  try {
    const salida = respuesta(await conversar(r.data.mensajes));
    if (pase) salida.cookies.set(COOKIE_PASE, pase, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/paumi", maxAge: DURACION_PASE });
    return salida;
  } catch (e) {
    console.error(JSON.stringify({ evento: "paumi_error", mensaje: e instanceof ErrorPaumi ? e.message : "error inesperado" }));
    return respuesta({ error: "falla", mensaje: "Uy, se me cruzaron los cables 🦜. Intenta de nuevo en un ratito." }, 502);
  }
}
