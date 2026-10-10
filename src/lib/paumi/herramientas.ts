import "server-only";
import { z } from "zod";
import { agruparEventos, LISTA_TIPOS, textoFechas, textoPrecio } from "@/lib/eventos";
import { urlPublicaFoto } from "@/lib/fotos";
import { estadoAhora, leerHorario, resumenHorario } from "@/lib/horario";
import { enlaceComoLlegar } from "@/lib/enlaces";
import { crearClientePublico } from "@/lib/supabase/publico";
import { exigirConfigSupabase } from "@/lib/supabase/config";
import { enlaceRutaGoogle } from "@/lib/ubicacion";
import { normalizar } from "@/lib/validacion/busqueda";
import { FUENTES_CONFIABLES } from "./config";
import type { ExternoPaumi, TarjetaPaumi } from "./tipos";

/*
 * Herramientas de Paumi (versión 3, paso 14.2). Lo que la IA pide hacer pasa por aquí, y aquí manda el código:
 *   - SOLO LEEN lo público, con la clave pública (las reglas RLS esconden borradores, ocultos y todo lo privado);
 *   - cada pedido de la IA se valida con Zod (la IA es una fuente NO confiable, igual que un formulario);
 *   - las tarjetas y las páginas a abrir las arma el servidor con datos de la guía, nunca con texto de la IA.
 */

const CIUDAD = "guayaquil";
const PRECIOS = { 1: "$", 2: "$$", 3: "$$$" } as const;
const COLUMNAS =
  "id, slug, name, sector, description, price_level, short_fact, address, latitude, longitude, opening_hours, is_featured, categories!inner(slug, name), cities!inner(slug), place_photos(storage_path, alt_text, sort_order)";

type Fila = {
  id: string;
  slug: string;
  name: string;
  sector: string;
  description: string;
  price_level: number | null;
  short_fact: string | null;
  address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  opening_hours: unknown;
  is_featured: boolean;
  categories: { slug: string; name: string } | null;
  place_photos: { storage_path: string; alt_text: string; sort_order: number }[];
};

/** Definiciones que se mandan a la IA (formato de la API de Anthropic). */
export const DEFINICIONES = [
  {
    name: "buscar_lugares",
    description:
      "Busca lugares PUBLICADOS en la guía de Guayaquil. Usa al menos uno de: texto (palabras como 'encebollado', 'hotel barato', 'parque'), categoria (slug de la lista), sector (barrio, ej. 'Urdesa'). Devuelve hasta 6 lugares con su id.",
    input_schema: {
      type: "object",
      properties: {
        texto: { type: "string", description: "Palabras a buscar (máx. 80 caracteres)" },
        categoria: { type: "string", description: "Slug de una categoría de la guía" },
        sector: { type: "string", description: "Barrio o zona de Guayaquil" },
        precio_max: { type: "integer", enum: [1, 2, 3], description: "1 = económico, 2 = medio, 3 = alto" },
        abierto_ahora: { type: "boolean", description: "Solo los que están abiertos ahora (si tienen horario)" },
      },
    },
  },
  {
    name: "ver_lugar",
    description: "Detalle de un lugar de la guía por su id: descripción, horario, dirección, precio.",
    input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "mostrar_lugares",
    description: "Muestra a la persona las tarjetas (foto, cómo llegar, ficha) de los lugares que recomiendas. Máximo 4 ids, de lugares que devolvió buscar_lugares o ver_lugar.",
    input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" }, maxItems: 4 } }, required: ["ids"] },
  },
  {
    name: "sugerir_externo",
    description:
      "Muestra la tarjeta de un lugar que NO está en la guía y que encontraste con web_search: nombre, sector y la URL EXACTA del resultado de búsqueda donde aparece. La página arma el enlace a Google Maps (con la dirección real). Máximo 3 por respuesta. No la uses para lugares de la guía.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string", description: "Nombre del lugar tal como aparece en la fuente" },
        sector: { type: "string", description: "Barrio o zona (ej. 'Urdesa'), si la fuente lo dice" },
        fuente_url: { type: "string", description: "URL exacta del resultado de web_search donde aparece" },
      },
      required: ["nombre", "fuente_url"],
    },
  },
  {
    name: "buscar_eventos",
    description:
      "Busca eventos de Guayaquil publicados en la guía (conciertos, ferias, deporte, cultura, gastronomía, fiestas del barrio, cursos). Devuelve hasta 6 con fecha, lugar, precio y su ruta. Solo hay eventos vigentes.",
    input_schema: {
      type: "object",
      properties: {
        cuando: { type: "string", enum: ["hoy", "fin_de_semana", "proximos", "todos"], description: "hoy, este fin de semana, los que vienen después, o todos" },
        tipo: { type: "string", enum: ["concierto", "feria", "deporte", "cultura", "gastronomia", "fiesta", "curso", "otro"] },
        gratis: { type: "boolean", description: "Solo los gratis" },
      },
    },
  },
  {
    name: "abrir_pagina",
    description:
      "Propone llevar a la persona a una página de la guía: '/guayaquil' (todas las categorías), '/guayaquil/<categoria>', '/buscar?q=<palabras>', '/guayaquil/eventos' o la ruta de un evento que devolvió buscar_eventos.",
    input_schema: { type: "object", properties: { ruta: { type: "string" } }, required: ["ruta"] },
  },
] as const;

const esquemaBuscar = z
  .object({
    texto: z.string().trim().max(80).optional(),
    categoria: z.string().regex(/^[a-z0-9-]{2,40}$/).optional(),
    sector: z.string().trim().max(60).optional(),
    precio_max: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    abierto_ahora: z.boolean().optional(),
  })
  .refine((v) => v.texto || v.categoria || v.sector, "Falta qué buscar");
const esquemaId = z.object({ id: z.uuid() });
const esquemaMostrar = z.object({ ids: z.array(z.uuid()).min(1).max(4) });
const esquemaEventos = z.object({
  cuando: z.enum(["hoy", "fin_de_semana", "proximos", "todos"]).optional(),
  tipo: z.enum(LISTA_TIPOS).optional(),
  gratis: z.boolean().optional(),
});
const esquemaAbrir = z.object({ ruta: z.string().max(120) });
const esquemaExterno = z.object({
  nombre: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .refine((t) => !/https?:|www\.|\.(com|ec|net|org)\b|\d{7,}/i.test(t), "Solo el nombre"),
  sector: z.string().trim().max(60).optional(),
  fuente_url: z.url().max(500),
});

/** La misma página aunque la IA la copie con "/" al final o con "#…". */
export function urlComparable(u: string): string | null {
  try {
    const x = new URL(u);
    if (x.protocol !== "https:") return null;
    x.hash = "";
    return x.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

const esConfiable = (host: string) => FUENTES_CONFIABLES.some((d) => host === d || host.endsWith(`.${d}`));

/** Lo que va juntando una conversación: tarjetas a mostrar y página a abrir. */
export type Estado = {
  vistos: Set<string>;
  tarjetas: TarjetaPaumi[];
  navegar: string | null;
  categorias: Set<string>;
  /** Páginas que devolvió la búsqueda web en esta respuesta (solo de esas se aceptan lugares de internet). */
  urlsWeb: Set<string>;
  externos: ExternoPaumi[];
  /** Rutas de eventos que devolvió buscar_eventos en esta respuesta (versión 5). */
  eventos?: Set<string>;
};

function db() {
  const c = crearClientePublico();
  if (!c) throw new Error("Paumi necesita Supabase");
  return c;
}

const ahora = () => new Date();

function estado(f: Fila) {
  const h = leerHorario(f.opening_hours);
  return h ? estadoAhora(h, ahora()) : null;
}

function corto(f: Fila) {
  const e = estado(f);
  return {
    id: f.id,
    nombre: f.name,
    categoria: f.categories?.name ?? "",
    sector: f.sector,
    precio: f.price_level ? PRECIOS[f.price_level as 1 | 2 | 3] : null,
    dato: f.short_fact,
    ahora: e?.texto ?? "sin horario por día",
  };
}

export function tarjeta(f: Fila): TarjetaPaumi {
  const e = estado(f);
  const foto = [...f.place_photos].sort((a, b) => a.sort_order - b.sort_order)[0];
  const lat = f.latitude == null ? null : Number(f.latitude);
  const lng = f.longitude == null ? null : Number(f.longitude);
  return {
    id: f.id,
    nombre: f.name,
    categoria: f.categories?.name ?? "",
    sector: f.sector,
    ruta: `/${CIUDAD}/${f.categories?.slug ?? ""}/${f.slug}`,
    foto: foto ? { src: urlPublicaFoto(exigirConfigSupabase().url, foto.storage_path), alt: foto.alt_text } : null,
    precio: f.price_level ? PRECIOS[f.price_level as 1 | 2 | 3] : null,
    estado: e?.texto ?? null,
    abierto: e?.abierto ?? null,
    comoLlegar: lat != null && lng != null ? enlaceRutaGoogle({ lat, lng }) : enlaceComoLlegar(f.name, f.address, "Guayaquil"),
  };
}

async function leer(ids: string[]): Promise<Fila[]> {
  if (!ids.length) return [];
  const { data } = await db().from("places").select(COLUMNAS).in("id", ids).eq("status", "publicado").eq("cities.slug", CIUDAD).returns<Fila[]>();
  return data ?? [];
}

async function buscar(entrada: z.infer<typeof esquemaBuscar>, e: Estado) {
  const c = db();
  let ids: string[] | null = null;
  if (entrada.texto) {
    const { data } = await c.rpc("buscar_lugares", { q: entrada.texto, ciudad: CIUDAD });
    ids = ((data ?? []) as { id: string }[]).map((x) => x.id);
    if (!ids.length) return { lugares: [], nota: "No hay lugares con esas palabras." };
  }
  let q = c.from("places").select(COLUMNAS).eq("status", "publicado").eq("cities.slug", CIUDAD).limit(60);
  if (ids) q = q.in("id", ids);
  if (entrada.categoria) {
    if (!e.categorias.has(entrada.categoria)) return { lugares: [], nota: "Esa categoría no existe en la guía." };
    q = q.eq("categories.slug", entrada.categoria);
  }
  const { data } = await q.returns<Fila[]>();
  let filas = data ?? [];
  if (entrada.sector) {
    const s = normalizar(entrada.sector);
    filas = filas.filter((f) => normalizar(f.sector).includes(s));
  }
  if (entrada.precio_max) filas = filas.filter((f) => !f.price_level || f.price_level <= entrada.precio_max!);
  if (entrada.abierto_ahora) filas = filas.filter((f) => estado(f)?.abierto === true);
  if (ids) {
    const orden = new Map(ids.map((id, i) => [id, i]));
    filas.sort((a, b) => orden.get(a.id)! - orden.get(b.id)!);
  } else filas.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
  const elegidos = filas.slice(0, 6);
  elegidos.forEach((f) => e.vistos.add(f.id));
  return { lugares: elegidos.map(corto), nota: elegidos.length ? undefined : "No hay lugares que cumplan todo eso." };
}

/** ¿Es una página de la guía a la que se puede llevar a alguien? */
export function rutaPermitida(ruta: string, categorias: Set<string>, eventos: Set<string> = new Set()): string | null {
  if (ruta === `/${CIUDAD}` || ruta === `/${CIUDAD}/eventos`) return ruta;
  if (eventos.has(ruta)) return ruta;
  const cat = /^\/guayaquil\/([a-z0-9-]{2,40})$/.exec(ruta);
  if (cat) return categorias.has(cat[1]!) ? ruta : null;
  const b = /^\/buscar\?q=([^&#]{2,80})$/.exec(ruta);
  if (b) {
    let q: string;
    try {
      q = decodeURIComponent(b[1]!.replace(/\+/g, " "));
    } catch {
      return null;
    }
    return /^[\p{L}\p{N} .,'-]{2,80}$/u.test(q) ? `/buscar?q=${encodeURIComponent(q)}` : null;
  }
  return null;
}

/** Ejecuta una herramienta. Devuelve lo que se le contesta a la IA (o un error en palabras simples). */
export async function ejecutar(nombre: string, entrada: unknown, e: Estado): Promise<{ resultado: unknown; error?: boolean }> {
  try {
    switch (nombre) {
      case "buscar_lugares": {
        const r = esquemaBuscar.safeParse(entrada);
        if (!r.success) return { resultado: "Pedido inválido: usa texto, categoria o sector.", error: true };
        return { resultado: await buscar(r.data, e) };
      }
      case "ver_lugar": {
        const r = esquemaId.safeParse(entrada);
        if (!r.success) return { resultado: "id inválido", error: true };
        const [f] = await leer([r.data.id]);
        if (!f) return { resultado: "Ese lugar no está en la guía.", error: true };
        e.vistos.add(f.id);
        const h = leerHorario(f.opening_hours);
        return {
          resultado: { ...corto(f), descripcion: f.description.slice(0, 600), direccion: f.address, horario: h ? resumenHorario(h) : null },
        };
      }
      case "mostrar_lugares": {
        const r = esquemaMostrar.safeParse(entrada);
        if (!r.success) return { resultado: "ids inválidos", error: true };
        // Solo lugares que la IA vio en ESTA conversación con las herramientas (y que siguen publicados)
        const ids = [...new Set(r.data.ids)].filter((id) => e.vistos.has(id));
        const filas = await leer(ids);
        const orden = new Map(ids.map((id, i) => [id, i]));
        e.tarjetas = filas.sort((a, b) => orden.get(a.id)! - orden.get(b.id)!).map(tarjeta);
        return { resultado: `Se muestran ${e.tarjetas.length} tarjetas.` };
      }
      case "sugerir_externo": {
        const r = esquemaExterno.safeParse(entrada);
        if (!r.success) return { resultado: "Pedido inválido: nombre (sin enlaces ni teléfonos) y fuente_url.", error: true };
        const url = urlComparable(r.data.fuente_url);
        const host = url ? new URL(url).hostname : "";
        // Solo si la fuente es confiable Y salió de una búsqueda real en esta respuesta (la IA no puede inventarla)
        if (!url || !esConfiable(host) || !e.urlsWeb.has(url))
          return { resultado: "Esa fuente no salió de tu búsqueda en sitios confiables: no la muestres.", error: true };
        if (e.externos.length >= 3) return { resultado: "Ya hay 3 lugares de internet.", error: true };
        const nombre = r.data.nombre.normalize("NFC");
        if (e.externos.some((x) => x.nombre.toLowerCase() === nombre.toLowerCase())) return { resultado: "Ya se muestra." };
        const sector = r.data.sector || null;
        e.externos.push({
          nombre,
          sector,
          mapa: enlaceComoLlegar(nombre, sector, "Guayaquil"),
          fuente: { url, sitio: host.replace(/^www\./, "") },
        });
        return { resultado: "Listo: se muestra su tarjeta con Google Maps y la fuente." };
      }
      case "buscar_eventos": {
        const r = esquemaEventos.safeParse(entrada ?? {});
        if (!r.success) return { resultado: "Pedido inválido", error: true };
        const { data } = await db()
          .from("city_events")
          .select("slug, title, kind, starts_at, ends_at, online, venue, price, cities!inner(slug)")
          .eq("cities.slug", CIUDAD)
          .order("starts_at")
          .limit(100);
        const filas = (data ?? []).map((f) => ({ ...f, inicio: f.starts_at as string, fin: f.ends_at as string }));
        const g = agruparEventos(filas.filter((f) => (!r.data.tipo || f.kind === r.data.tipo) && (!r.data.gratis || f.price == null)));
        const lista = r.data.cuando === "hoy" ? g.hoy : r.data.cuando === "fin_de_semana" ? g.finDeSemana : r.data.cuando === "proximos" ? g.proximos : [...g.hoy, ...g.finDeSemana, ...g.proximos];
        e.eventos ??= new Set();
        const resultado = lista.slice(0, 6).map((f) => {
          const ruta = `/${CIUDAD}/eventos/${f.slug}`;
          e.eventos!.add(ruta);
          return { titulo: f.title, tipo: f.kind, cuando: textoFechas(f.inicio, f.fin), donde: f.online ? "En línea" : f.venue, precio: textoPrecio(f.price == null ? null : Number(f.price)), ruta };
        });
        return { resultado: resultado.length ? resultado : "No hay eventos publicados con ese filtro." };
      }
      case "abrir_pagina": {
        const r = esquemaAbrir.safeParse(entrada);
        const ruta = r.success ? rutaPermitida(r.data.ruta, e.categorias, e.eventos) : null;
        if (!ruta) return { resultado: "Esa página no existe en la guía.", error: true };
        e.navegar = ruta;
        return { resultado: "Listo: la página ofrece un botón para ir." };
      }
      default:
        return { resultado: "Herramienta desconocida", error: true };
    }
  } catch {
    return { resultado: "No se pudo consultar la guía en este momento.", error: true };
  }
}
