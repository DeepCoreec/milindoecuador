import type { Metadata } from "next";
import Link from "next/link";
import { salir } from "@/acciones/sesion";
import { FormBorrarCuenta } from "@/components/cuenta/FormBorrarCuenta";
import { FormNombre } from "@/components/cuenta/FormNombre";
import { Cabecera } from "@/components/layout/Cabecera";
import { Pie } from "@/components/layout/Pie";
import { clasesBoton } from "@/components/ui/Boton";
import { Insignia } from "@/components/ui/Insignia";
import { requireUsuario } from "@/lib/auth";
import { getMiCuenta } from "@/lib/datos/cuenta";
import { fechaLarga } from "@/lib/enlaces";

export const metadata: Metadata = { title: "Mi cuenta · Mi Lindo Ecuador", robots: { index: false, follow: false } };

const titulo = "m-0 font-rotulo text-xl leading-[26px] font-normal";

export default async function PaginaCuenta() {
  const usuario = await requireUsuario("/cuenta");
  const { nombre, resenas } = await getMiCuenta(usuario.id);

  return (
    <>
      <Cabecera />
      <main className="mx-auto grid w-full max-w-[720px] flex-1 content-start gap-10 px-4 pt-10 pb-20 text-rio md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-1">
            <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">Mi cuenta</h1>
            {usuario.correo && <p className="m-0 text-sm leading-5 text-rio-suave">{usuario.correo}</p>}
          </div>
          <form action={salir}>
            <button type="submit" className={clasesBoton("secundario", "chico")}>
              Salir
            </button>
          </form>
        </div>

        <section aria-labelledby="t-nombre" className="grid gap-4 rounded-xl border border-linea bg-papel-alto p-6">
          <h2 id="t-nombre" className={titulo}>
            Tu nombre
          </h2>
          <FormNombre nombre={nombre} />
        </section>

        <section aria-labelledby="t-resenas" className="grid gap-2">
          <h2 id="t-resenas" className={`${titulo} mb-2`}>
            Tus reseñas
          </h2>
          {resenas.length === 0 ? (
            <p className="m-0 text-rio-suave">
              Todavía no has escrito reseñas. Busca un lugar que conozcas y <Link href="/guayaquil">cuéntale a los demás cómo te fue</Link>.
            </p>
          ) : (
            resenas.map((r) => (
              <article key={r.id} className="grid gap-1.5 border-b border-linea py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {r.lugar ? <Link href={r.lugar.ruta} className="font-semibold">{r.lugar.nombre}</Link> : <b>Lugar no disponible</b>}
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
              </article>
            ))
          )}
        </section>

        <section aria-labelledby="t-borrar" className="grid gap-3 rounded-xl border border-error p-6">
          <h2 id="t-borrar" className={titulo}>
            Borrar mi cuenta
          </h2>
          <p className="m-0 text-rio-suave">Se borran tu cuenta, tu nombre y todas tus reseñas. No se puede deshacer.</p>
          <FormBorrarCuenta />
        </section>
      </main>
      <Pie />
    </>
  );
}
