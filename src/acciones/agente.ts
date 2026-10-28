"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { aplicarReglas, type Recomendacion, type SitioParaRevisar } from "@/lib/agente/reglas";
import { agenteConIA, ErrorAgente, LOTE, modeloAgente, revisarLoteConIA } from "@/lib/agente/revisor";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { esquemaAgenteGuia } from "@/lib/validacion/admin";
import type { EstadoAdmin } from "@/acciones/admin";

/*
 * "Pedir revisión al agente" en /admin/guia (versión 6, paso 27.3; plan en docs/PLAN-V6.md).
 * Revisa lugares "Por revisar" que todavía no tienen recomendación: primero las reglas (gratis), luego Claude Haiku.
 * Solo GUARDA la recomendación (agent_*): no cambia el estado de ningún lugar. El admin decide en el panel.
 * Orden: Zod → requireAdmin → leer con admin.ts → reglas → Claude por lotes → guardar.
 */

/** Como mucho estos lugares por clic: caben en los 60 s del plan gratis de Vercel y acotan el gasto. */
const POR_CLIC = 100;
/** Lotes a Claude al mismo tiempo. */
const PARALELO = 3;

type Fila = { id: string; name: string; tipo: string; grupo: string; address: string | null; phone: string | null; website: string | null; opening_hours: string | null; latitude: number | null; longitude: number | null };
const aSitio = (f: Fila): SitioParaRevisar => ({ id: f.id, nombre: f.name, tipo: f.tipo, grupo: f.grupo, direccion: f.address, telefono: f.phone, web: f.website, horario: f.opening_hours, lat: f.latitude, lng: f.longitude });
const COLUMNAS = "id, name, tipo, grupo, address, phone, website, opening_hours, latitude, longitude";

export async function pedirRevisionAgente(_previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const r = esquemaAgenteGuia.safeParse({ grupo: datos.get("grupo") || undefined });
  if (!r.success) return { estado: "error", mensaje: "Grupo inválido" };
  await requireAdmin();
  const inicio = Date.now();
  const db = crearClienteAdmin();

  let q = db.from("city_spots").select(COLUMNAS).eq("status", "pendiente").is("agent_verdict", null).order("tipo").order("name").limit(POR_CLIC);
  if (r.data.grupo) q = q.eq("grupo", r.data.grupo);
  const { data: candidatos, error } = await q.returns<Fila[]>();
  if (error) return { estado: "error", mensaje: "No se pudieron leer los lugares" };
  if (!candidatos?.length) return { estado: "ok", mensaje: "No quedan lugares sin recomendación en este grupo." };

  // Para detectar duplicados: los lugares publicados o pendientes de los mismos tipos
  const tipos = [...new Set(candidatos.map((c) => c.tipo))];
  const { data: vecinos } = await db.from("city_spots").select(COLUMNAS).in("tipo", tipos).in("status", ["pendiente", "publicado"]).limit(5000).returns<Fila[]>();
  const otros = (vecinos ?? []).map(aSitio);

  const resultados = new Map<string, Recomendacion & { fuente: "regla" | "ia" }>();
  const paraIA: SitioParaRevisar[] = [];
  for (const c of candidatos.map(aSitio)) {
    const regla = aplicarReglas(c, otros);
    if (regla) resultados.set(c.id, { ...regla, fuente: "regla" });
    else paraIA.push(c);
  }

  let tokensEntrada = 0;
  let tokensSalida = 0;
  let falloIA: string | null = null;
  const conIA = agenteConIA();
  if (conIA) {
    const lotes: SitioParaRevisar[][] = [];
    for (let i = 0; i < paraIA.length; i += LOTE) lotes.push(paraIA.slice(i, i + LOTE));
    for (let i = 0; i < lotes.length; i += PARALELO) {
      if (Date.now() - inicio > 40_000) break; // lo que falte, en el próximo clic
      const tanda = await Promise.allSettled(lotes.slice(i, i + PARALELO).map((l) => revisarLoteConIA(l)));
      for (const t of tanda) {
        if (t.status === "rejected") {
          falloIA = t.reason instanceof ErrorAgente ? t.reason.message : "error inesperado";
          continue;
        }
        tokensEntrada += t.value.tokensEntrada;
        tokensSalida += t.value.tokensSalida;
        for (const [id, rec] of t.value.recomendaciones) resultados.set(id, { ...rec, fuente: "ia" });
      }
    }
  }

  const ahora = new Date().toISOString();
  const modelo = modeloAgente();
  await Promise.all(
    [...resultados].map(([id, x]) =>
      db
        .from("city_spots")
        .update({ agent_verdict: x.veredicto, agent_reason: x.motivo.slice(0, 200), agent_source: x.fuente, agent_model: x.fuente === "ia" ? modelo : null, agent_at: ahora })
        .eq("id", id)
        .eq("status", "pendiente"),
    ),
  );
  // Para el registro de gastos (Vercel → Logs): cuántos tokens usó esta revisión
  console.log(JSON.stringify({ evento: "agente_guia", revisados: resultados.size, reglas: [...resultados.values()].filter((x) => x.fuente === "regla").length, modelo, tokensEntrada, tokensSalida, falloIA }));
  revalidatePath("/admin/guia");

  const cuenta = (v: string) => [...resultados.values()].filter((x) => x.veredicto === v).length;
  const deReglas = [...resultados.values()].filter((x) => x.fuente === "regla").length;
  const sinRevisar = candidatos.length - resultados.size;
  const partes = [
    `El agente revisó ${resultados.size}: ${cuenta("publicar")} para publicar, ${cuenta("revisar")} para revisar y ${cuenta("descartar")} para descartar (${deReglas} por reglas, ${resultados.size - deReglas} con IA).`,
    !conIA ? "La IA no está configurada (falta ANTHROPIC_API_KEY): solo se usaron las reglas." : null,
    falloIA ? `Algunos lotes fallaron (${falloIA}).` : null,
    sinRevisar > 0 ? `Quedaron ${sinRevisar} sin recomendación: vuelve a tocar el botón.` : null,
  ];
  return { estado: resultados.size ? "ok" : "error", mensaje: partes.filter(Boolean).join(" ") };
}
