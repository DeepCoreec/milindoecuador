import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { buscarCerca, ubicacionAproximada } from "@/lib/cerca";
import { leerCuerpoCorto } from "@/lib/huella";
import { urlSitio } from "@/lib/sitio";

/*
 * "Cerca de mí" del buscador (versión 8, fase 34.2; plan en docs/PLAN-V8.md).
 *   - Solo desde nuestras páginas (origen), cuerpo de 200 bytes como máximo, validado con Zod.
 *   - La ubicación se redondea a ~100 m, se usa solo para esta búsqueda y NO se guarda ni se escribe en los registros.
 *   - Va por POST (no en la dirección): así no queda en el historial del navegador ni en los registros de visitas.
 *   - Solo lee datos públicos (los mismos que ya se ven en la guía).
 */
export const dynamic = "force-dynamic";

const esquema = z.object({ lat: z.number().finite(), lng: z.number().finite() });
const respuesta = (cuerpo: object, status = 200) => NextResponse.json(cuerpo, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: NextRequest) {
  const origen = request.headers.get("origin");
  if (!origen || (origen !== urlSitio().origin && origen !== request.nextUrl.origin)) return respuesta({ error: "Origen no permitido" }, 403);
  const texto = await leerCuerpoCorto(request, 200);
  if (texto === null) return respuesta({ error: "Pedido demasiado grande" }, 413);
  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return respuesta({ error: "Pedido inválido" }, 400);
  }
  const r = esquema.safeParse(cuerpo);
  const ubicacion = r.success ? ubicacionAproximada(r.data) : null;
  if (!ubicacion) return respuesta({ error: "Ubicación fuera de Ecuador o inválida" }, 400);
  try {
    return respuesta(await buscarCerca(ubicacion));
  } catch {
    // Sin la ubicación en el registro: solo que falló
    console.error(JSON.stringify({ evento: "cerca_error" }));
    return respuesta({ error: "No se pudo buscar ahora. Intenta de nuevo." }, 502);
  }
}
