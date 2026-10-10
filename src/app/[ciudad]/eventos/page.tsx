import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TarjetaEvento } from "@/components/eventos/TarjetaEvento";
import { Cabecera } from "@/components/layout/Cabecera";
import { Migas } from "@/components/layout/Migas";
import { Pie } from "@/components/layout/Pie";
import { Boton } from "@/components/ui/Boton";
import { getEventos, type Evento } from "@/lib/datos/eventos";
import { getCiudad } from "@/lib/datos/lugares";
import { agruparEventos, LISTA_TIPOS, TIPOS_EVENTO, type TipoEvento } from "@/lib/eventos";
import { paraCompartir } from "@/lib/sitio";

const descripcion = "Conciertos, ferias, deporte, cultura y fiestas del barrio en Guayaquil. Publica el tuyo gratis.";

export async function generateMetadata({ params }: PageProps<"/[ciudad]/eventos">): Promise<Metadata> {
  const { ciudad } = await params;
  const c = await getCiudad(ciudad);
  if (!c) return {};
  return { title: `Eventos en ${c.nombre} · Mi Lindo Ecuador`, description: descripcion, ...paraCompartir(`Eventos en ${c.nombre}`, descripcion, `/${c.slug}/eventos`) };
}

function Seccion({ id, titulo, eventos, ciudad }: { id: string; titulo: string; eventos: Evento[]; ciudad: string }) {
  if (eventos.length === 0) return null;
  return (
    <section aria-labelledby={id} className="grid gap-5">
      <h2 id={id} className="m-0 font-rotulo text-2xl leading-8 font-normal md:text-[32px] md:leading-10">
        {titulo}
      </h2>
      <ul className="m-0 grid list-none gap-x-6 gap-y-8 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {eventos.map((e) => (
          <li key={e.id} className="grid">
            <TarjetaEvento e={e} ciudad={ciudad} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Eventos de la ciudad (versión 5): Hoy, Este fin de semana y Próximos, con filtro por tipo y "Solo gratis". */
export default async function PaginaEventos({ params, searchParams }: PageProps<"/[ciudad]/eventos">) {
  const { ciudad: slug } = await params;
  const ciudad = await getCiudad(slug);
  if (!ciudad) notFound();
  const sp = await searchParams;
  const tipo = LISTA_TIPOS.includes(sp.tipo as TipoEvento) ? (sp.tipo as TipoEvento) : null;
  const soloGratis = sp.gratis === "1";
  const todos = await getEventos();
  const filtrados = todos.filter((e) => (!tipo || e.tipo === tipo) && (!soloGratis || e.precio == null));
  const g = agruparEventos(filtrados);
  const ruta = `/${ciudad.slug}/eventos`;
  const enlace = (t: TipoEvento | null, gratis: boolean) => {
    const p = new URLSearchParams();
    if (t) p.set("tipo", t);
    if (gratis) p.set("gratis", "1");
    const q = p.toString();
    return q ? `${ruta}?${q}` : ruta;
  };
  const chip = (activo: boolean) =>
    `inline-flex min-h-11 items-center rounded-full border px-4 text-[15px] font-semibold no-underline ${
      activo ? "border-rio bg-rio text-papel" : "border-linea-fuerte bg-papel-alto text-rio hover:border-rio"
    }`;
  const hayAlgo = g.hoy.length + g.finDeSemana.length + g.proximos.length > 0;

  return (
    <>
      <Cabecera />
      <main className="flex-1 text-rio">
        <section data-theme="dark" className="bg-papel text-rio">
          <div className="mx-auto grid w-full max-w-[1280px] gap-4 px-4 pt-6 pb-10 md:px-8 md:pb-14">
            <Migas pasos={[{ texto: ciudad.nombre, href: `/${ciudad.slug}` }, { texto: "Eventos" }]} />
            <h1 className="m-0 font-rotulo text-[34px] leading-10 font-normal tracking-[-0.01em] text-balance md:text-[56px] md:leading-[62px]">Eventos en {ciudad.nombre}</h1>
            <p className="m-0 max-w-[60ch] text-lg leading-7 text-rio-suave">
              Conciertos, ferias, deporte y fiestas del barrio. Cualquiera puede publicar el suyo gratis, y se borra solo cuando termina.
            </p>
            <Boton href={`${ruta}/nuevo`} variante="principal" className="justify-self-start">
              Publicar un evento
            </Boton>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 pt-6 pb-16 md:px-8">
          <nav aria-label="Filtrar eventos" className="sin-barra -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
            <Link href={enlace(null, soloGratis)} aria-current={!tipo ? "page" : undefined} className={chip(!tipo)}>
              Todos
            </Link>
            {LISTA_TIPOS.map((t) => (
              <Link key={t} href={enlace(t, soloGratis)} aria-current={tipo === t ? "page" : undefined} className={`${chip(tipo === t)} flex-none`}>
                {TIPOS_EVENTO[t]}
              </Link>
            ))}
            <Link href={enlace(tipo, !soloGratis)} aria-pressed={soloGratis} className={`${chip(soloGratis)} flex-none`}>
              Solo gratis
            </Link>
          </nav>

          {hayAlgo ? (
            <>
              <Seccion id="t-hoy" titulo="Hoy" eventos={g.hoy} ciudad={ciudad.slug} />
              <Seccion id="t-finde" titulo="Este fin de semana" eventos={g.finDeSemana} ciudad={ciudad.slug} />
              <Seccion id="t-proximos" titulo="Próximos" eventos={g.proximos} ciudad={ciudad.slug} />
            </>
          ) : (
            <div className="grid justify-items-start gap-4 rounded-[20px] bg-mango-suave px-6 py-8 md:px-12 md:py-10">
              <h2 className="m-0 font-rotulo text-xl leading-[26px] font-normal">{tipo || soloGratis ? "No hay eventos con ese filtro" : "Todavía no hay eventos publicados"}</h2>
              <p className="m-0 max-w-[56ch] text-rio-suave">
                {tipo || soloGratis ? "Prueba con otro tipo o mira todos los eventos." : "¿Organizas algo en la ciudad? Publícalo gratis y la gente lo verá aquí."}
              </p>
              {(tipo || soloGratis) && (
                <Boton href={ruta} variante="secundario">
                  Ver todos los eventos
                </Boton>
              )}
            </div>
          )}
        </div>
      </main>
      <Pie />
    </>
  );
}
