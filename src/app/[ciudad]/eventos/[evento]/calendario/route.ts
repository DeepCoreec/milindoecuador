import { getEvento } from "@/lib/datos/eventos";
import { textoIcs } from "@/lib/eventos";
import { urlSitio } from "@/lib/sitio";

/** Archivo .ics del evento, para agregarlo al calendario del iPhone, Outlook y otros (versión 5). */
export async function GET(_req: Request, { params }: RouteContext<"/[ciudad]/eventos/[evento]/calendario">) {
  const { ciudad, evento } = await params;
  const e = ciudad === "guayaquil" ? await getEvento(evento) : null;
  if (!e) return new Response("No existe", { status: 404 });
  const url = new URL(`/${ciudad}/eventos/${e.slug}`, urlSitio()).toString();
  const lugar = e.enLinea ? "En línea" : [e.lugar, e.direccion, "Guayaquil"].filter(Boolean).join(", ");
  return new Response(textoIcs({ id: e.id, titulo: e.titulo, inicio: e.inicio, fin: e.fin, lugar, url }), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="evento-${e.slug}.ics"`,
      "cache-control": "public, max-age=300",
    },
  });
}
