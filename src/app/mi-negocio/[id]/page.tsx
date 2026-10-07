import type { Metadata } from "next";
import Link from "next/link";
import { FormLugar } from "@/components/admin/FormLugar";
import { FotosLugar } from "@/components/admin/FotosLugar";
import { EstadoNegocio } from "@/components/dueno/EstadoNegocio";
import { Estadisticas } from "@/components/dueno/Estadisticas";
import { RespuestaDueno } from "@/components/dueno/RespuestaDueno";
import { Cabecera } from "@/components/layout/Cabecera";
import { Pie } from "@/components/layout/Pie";
import { Insignia } from "@/components/ui/Insignia";
import { getEstadisticas, getMiNegocio, requireDueno } from "@/lib/datos/dueno";
import { fechaLarga } from "@/lib/enlaces";
import { textoUbicacion } from "@/lib/ubicacion";
import { DESCRIPCION_PENDIENTE } from "@/lib/validacion/dueno";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mi negocio · Mi Lindo Ecuador",
  robots: { index: false, follow: false },
};

const titulo = "m-0 text-xl leading-[26px] font-semibold";

/** Editar mi negocio (versión 2, pasos 9.2 a 9.4). Lo que se guarda sale al instante si la ficha está publicada. */
export default async function PaginaMiNegocio({ params }: PageProps<"/mi-negocio/[id]">) {
  const { id } = await params;
  const usuario = await requireDueno(id, `/mi-negocio/${id}`);
  const [n, numeros] = await Promise.all([getMiNegocio(usuario, id), getEstadisticas(usuario, id)]);
  const pendiente = n.descripcion.startsWith(DESCRIPCION_PENDIENTE);

  return (
    <>
      <Cabecera />
      <main className="mx-auto grid w-full max-w-[880px] flex-1 content-start gap-6 px-4 pt-8 pb-20 text-rio md:px-8">
        <div className="grid gap-2">
          <Link href="/mi-negocio" className="text-sm leading-5 text-rio-suave">
            ← Mis negocios
          </Link>
          <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">{n.nombre}</h1>
          <p className="m-0 text-sm leading-5 text-rio-suave">{n.categoria}. Para cambiar la categoría, escríbenos por WhatsApp.</p>
        </div>

        <EstadoNegocio lugar={n.id} estado={n.estado} listo={{ descripcion: !pendiente, fotos: n.fotos.length > 0 }} ruta={n.ruta} />

        {n.estado !== "borrador" && <Estadisticas semana={numeros.semana} mes={numeros.mes} />}

        <section aria-labelledby="t-datos" className="grid gap-3">
          <h2 id="t-datos" className={titulo}>
            Datos de tu negocio
          </h2>
          <FormLugar
            modo="dueno"
            lugar={{
              id: n.id,
              nombre: n.nombre,
              categoria: "",
              sector: n.sector === "Por definir" ? "" : n.sector,
              descripcion: pendiente ? "" : n.descripcion,
              dato: n.dato ?? "",
              horario: n.horario ?? "",
              direccion: n.direccion ?? "",
              ubicacion: n.latitud != null && n.longitud != null ? textoUbicacion({ lat: n.latitud, lng: n.longitud }) : "",
              horarioDias: n.horarioDias ? JSON.stringify(n.horarioDias) : "",
              precio: n.precio ? String(n.precio) : "",
              whatsapp: n.whatsapp ? n.whatsapp.replace(/^593/, "0") : "",
              estado: n.estado,
            }}
          />
        </section>

        <FotosLugar lugar={n.id} fotos={n.fotos} modo="dueno" maximo={15} />

        <section aria-labelledby="t-resenas" className="grid gap-4">
          <h2 id="t-resenas" className={titulo}>
            Reseñas de tus clientes
          </h2>
          {n.resenas.length === 0 ? (
            <p className="m-0 text-rio-suave">Todavía no hay reseñas. Comparte tu ficha con tus clientes para que te dejen una.</p>
          ) : (
            n.resenas.map((r) => (
              <article key={r.id} className="grid gap-3 rounded-xl border border-linea bg-papel-alto p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b>{r.autor}</b>
                  <time dateTime={r.fecha} className="text-sm leading-5 text-rio-suave">
                    {fechaLarga(r.fecha)}
                  </time>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tracking-[0.1em] text-estrella" role="img" aria-label={`${r.estrellas} de 5 estrellas`}>
                    {"★".repeat(r.estrellas)}
                  </span>
                  {!r.visible && <Insignia>Oculta por moderación</Insignia>}
                </div>
                <p className="m-0">{r.texto}</p>
                {r.visible && <RespuestaDueno resena={r.id} respuesta={r.respuesta} />}
              </article>
            ))
          )}
        </section>
      </main>
      <Pie />
    </>
  );
}
