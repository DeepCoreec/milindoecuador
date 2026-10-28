"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { aplicarReglas, type Recomendacion, type SitioParaRevisar } from "@/lib/agente/reglas";
import { agenteConIA, ErrorAgente, LOTE, modeloAgente, revisarLoteConIA } from "@/lib/agente/revisor";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { esquemaAgenteGuia, esquemaReinicioAgente } from "@/lib/validacion/admin";
import type { EstadoAdmin } from "@/acciones/admin";

/*
 * "Pedir revisión al agente" en /admin/guia (versión 6, paso 27.3; plan en docs/PLAN-V6.md).
 * Revisa lugares "Por revisar" que todavía no tienen recomendación: primero las reglas (gratis), luego Claude Haiku.
 * Solo GUARDA la recomendación (agent_*): no cambia el estado de ningún lugar. El admin decide en el panel.
 * Orden: Zod → requireAdmin → leer con admin.ts → reglas → Claude por tandas → guardar después de cada paso
 * (si Vercel corta por tiempo, lo hecho no se pierde; revisión independiente del 2026-10-28).
 */

/** Lugares que se miran por clic con las reglas (gratis y rápidas): así los casos obvios salen de la cola. */
const VENTANA = 500;
/** Como mucho estos lugares van a Claude por clic: acotan el gasto. */
const POR_CLIC_IA = 100;
/** Lotes a Claude al mismo tiempo. */
const PARALELO = 3;
/** Una tanda nueva a Claude solo empieza si alcanza a terminar (30 s de espera máxima) antes de los 55 s
 *  (el límite de la página es 60 s en el plan gratis de Vercel). */
const LIMITE_MS = 55_000;
const ESPERA_IA_MS = 30_000;

type Fila = { id: string; name: string; tipo: string; grupo: string; address: string | null; phone: string | null; website: string | null; opening_hours: string | null; latitude: number | null; longitude: number | null };
type Resultado = Recomendacion & { fuente: "regla" | "ia" };
const aSitio = (f: Fila): SitioParaRevisar => ({ id: f.id, nombre: f.name, tipo: f.tipo, grupo: f.grupo, direccion: f.address, telefono: f.phone, web: f.website, horario: f.opening_hours, lat: f.latitude, lng: f.longitude });
const COLUMNAS = "id, name, tipo, grupo, address, phone, website, opening_hours, latitude, longitude";

export async function pedirRevisionAgente(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaAgenteGuia.safeParse({ grupo: datos.get("grupo") || undefined });
  if (!r.success) return { estado: "error", mensaje: "Grupo inválido" };
  await requireAdmin();
  const inicio = Date.now();
  const db = crearClienteAdmin();

  let q = db.from("city_spots").select(COLUMNAS).eq("status", "pendiente").is("agent_verdict", null).order("tipo").order("name").limit(VENTANA);
  if (r.data.grupo) q = q.eq("grupo", r.data.grupo);
  const { data: candidatos, error } = await q.returns<Fila[]>();
  if (error) return { estado: "error", mensaje: "No se pudieron leer los lugares" };
  if (!candidatos?.length) return { estado: "ok", mensaje: "No quedan lugares sin recomendación en este grupo." };

  // Para detectar duplicados: los lugares publicados o pendientes de los mismos grupos (las reglas filtran por tipo)
  const grupos = [...new Set(candidatos.map((c) => c.grupo))];
  const { data: vecinos } = await db.from("city_spots").select(COLUMNAS).in("grupo", grupos).in("status", ["pendiente", "publicado"]).limit(5000).returns<Fila[]>();
  const otros = (vecinos ?? []).map(aSitio);

  const modelo = modeloAgente();
  const ahora = new Date().toISOString();
  const resultados = new Map<string, Resultado>();
  const guardar = async (filas: [string, Resultado][]) => {
    for (const [id, x] of filas) resultados.set(id, x);
    await Promise.all(
      filas.map(([id, x]) =>
        db
          .from("city_spots")
          .update({ agent_verdict: x.veredicto, agent_reason: x.motivo.slice(0, 200), agent_source: x.fuente, agent_model: x.fuente === "ia" ? modelo : null, agent_at: ahora })
          .eq("id", id)
          .eq("status", "pendiente"),
      ),
    );
  };

  // 1. Reglas sobre toda la ventana
  const paraIA: SitioParaRevisar[] = [];
  const deReglas: [string, Resultado][] = [];
  for (const c of candidatos.map(aSitio)) {
    const regla = aplicarReglas(c, otros);
    if (regla) deReglas.push([c.id, { ...regla, fuente: "regla" }]);
    else paraIA.push(c);
  }
  await guardar(deReglas);

  // 2. Claude, por tandas, guardando después de cada una
  let tokensEntrada = 0;
  let tokensSalida = 0;
  let falloIA: string | null = null;
  const conIA = agenteConIA();
  if (conIA) {
    const enviados = paraIA.slice(0, POR_CLIC_IA);
    const lotes: SitioParaRevisar[][] = [];
    for (let i = 0; i < enviados.length; i += LOTE) lotes.push(enviados.slice(i, i + LOTE));
    for (let i = 0; i < lotes.length; i += PARALELO) {
      if (Date.now() - inicio + ESPERA_IA_MS > LIMITE_MS) break; // lo que falte, en el próximo clic
      const tanda = await Promise.allSettled(lotes.slice(i, i + PARALELO).map((l) => revisarLoteConIA(l)));
      const nuevas: [string, Resultado][] = [];
      for (const t of tanda) {
        if (t.status === "rejected") {
          falloIA = t.reason instanceof ErrorAgente ? t.reason.message : "error inesperado";
          continue;
        }
        tokensEntrada += t.value.tokensEntrada;
        tokensSalida += t.value.tokensSalida;
        for (const [id, rec] of t.value.recomendaciones) nuevas.push([id, { ...rec, fuente: "ia" }]);
      }
      await guardar(nuevas);
    }
  }

  const valores = [...resultados.values()];
  const conRegla = valores.filter((x) => x.fuente === "regla").length;
  // Para el registro de gastos (Vercel → Logs): cuántos tokens usó esta revisión
  console.log(JSON.stringify({ evento: "agente_guia", revisados: resultados.size, reglas: conRegla, modelo, tokensEntrada, tokensSalida, falloIA }));
  revalidatePath("/admin/guia");

  const cuenta = (v: string) => valores.filter((x) => x.veredicto === v).length;
  const faltanIA = paraIA.length - (resultados.size - conRegla);
  const partes = [
    `El agente revisó ${resultados.size}: ${cuenta("publicar")} para publicar, ${cuenta("revisar")} para revisar y ${cuenta("descartar")} para descartar (${conRegla} por reglas, ${resultados.size - conRegla} con IA).`,
    !conIA ? "La IA no está configurada (falta ANTHROPIC_API_KEY): solo se usaron las reglas." : null,
    falloIA ? `Algunos lotes fallaron (${falloIA}).` : null,
    conIA && faltanIA > 0 ? `Quedan ${faltanIA} para la IA: vuelve a tocar el botón.` : null,
  ];
  return { estado: resultados.size ? "ok" : "error", mensaje: partes.filter(Boolean).join(" ") };
}

/**
 * Borra las recomendaciones de los lugares "Por revisar" del grupo para que el agente los vuelva a mirar: solo las de
 * las REGLAS (cuando cambian las reglas) o también las de la IA (`fuente=todas`, cuando cambia el criterio del dueño;
 * ajustes del 2026-10-28). Nunca toca el estado de ningún lugar.
 */
export async function reiniciarRecomendacionesReglas(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaReinicioAgente.safeParse({ grupo: datos.get("grupo") || undefined, fuente: datos.get("fuente") || undefined });
  if (!r.success) return { estado: "error", mensaje: "Datos inválidos" };
  await requireAdmin();
  let q = crearClienteAdmin()
    .from("city_spots")
    .update({ agent_verdict: null, agent_reason: null, agent_source: null, agent_model: null, agent_at: null })
    .eq("status", "pendiente")
    .not("agent_verdict", "is", null);
  if (r.data.fuente === "regla") q = q.eq("agent_source", "regla");
  if (r.data.grupo) q = q.eq("grupo", r.data.grupo);
  const { data, error } = await q.select("id");
  if (error) return { estado: "error", mensaje: "No se pudo reiniciar" };
  revalidatePath("/admin/guia");
  const de = r.data.fuente === "regla" ? "de las reglas" : "(reglas e IA)";
  return { estado: "ok", mensaje: `${data?.length ?? 0} recomendaciones ${de} borradas. Vuelve a pedir la revisión.` };
}
