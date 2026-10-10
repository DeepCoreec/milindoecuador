import type { Metadata } from "next";
import Link from "next/link";
import { salir } from "@/acciones/sesion";
import { FormBorrarCuenta } from "@/components/cuenta/FormBorrarCuenta";
import { FormContrasena } from "@/components/cuenta/FormContrasena";
import { FormNombre } from "@/components/cuenta/FormNombre";
import { Cabecera } from "@/components/layout/Cabecera";
import { Pie } from "@/components/layout/Pie";
import { clasesBoton } from "@/components/ui/Boton";
import { Insignia } from "@/components/ui/Insignia";
import { requireUsuario } from "@/lib/auth";
import { getMiCuenta, getMisFavoritos } from "@/lib/datos/cuenta";
import { fechaLarga } from "@/lib/enlaces";

// Siempre se genera en cada visita: depende de la sesión de quien la abre
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mi cuenta · Mi Lindo Ecuador", robots: { index: false, follow: false } };

const titulo = "m-0 font-rotulo text-xl leading-[26px] font-normal";

export default async function PaginaCuenta({ searchParams }: PageProps<"/cuenta">) {
  const usuario = await requireUsuario("/cuenta");
  // Viene del enlace de "Olvidé mi contraseña": se le pide escribir una nueva
  const recuperando = (await searchParams).contrasena === "nueva";
  const [{ nombre, resenas }, favoritos] = await Promise.all([getMiCuenta(usuario.id), getMisFavoritos()]);

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

        <Link
          href="/mi-negocio"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-linea bg-papel-alto p-6 text-rio no-underline hover:border-linea-fuerte"
        >
          <span className="grid gap-1">
            <b className="text-lg leading-6">Mi negocio</b>
            <span className="text-sm leading-5 text-rio-suave">Fotos, horario, ubicación y respuestas a tus reseñas</span>
          </span>
          <span aria-hidden="true">→</span>
        </Link>

        <Link
          href="/cuenta/eventos"
          className="-mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-linea bg-papel-alto p-6 text-rio no-underline hover:border-linea-fuerte"
        >
          <span className="grid gap-1">
            <b className="text-lg leading-6">Mis eventos</b>
            <span className="text-sm leading-5 text-rio-suave">Publica un evento gratis, cámbialo o bórralo</span>
          </span>
          <span aria-hidden="true">→</span>
        </Link>

        <section aria-labelledby="t-nombre" className="grid gap-4 rounded-xl border border-linea bg-papel-alto p-6">
          <h2 id="t-nombre" className={titulo}>
            Tu nombre
          </h2>
          <FormNombre nombre={nombre} />
        </section>

        <section id="contrasena" aria-labelledby="t-contrasena" className="grid scroll-mt-24 gap-4 rounded-xl border border-linea bg-papel-alto p-6">
          <h2 id="t-contrasena" className={titulo}>
            Contraseña
          </h2>
          {recuperando && (
            <p role="status" className="m-0 rounded-sm bg-celeste-suave p-3 text-sm leading-5">
              Ya entraste con el enlace del correo. Escribe ahora tu contraseña nueva y guárdala.
            </p>
          )}
          <FormContrasena />
        </section>

        <section aria-labelledby="t-guardados" className="grid gap-2">
          <h2 id="t-guardados" className={`${titulo} mb-2`}>
            Lugares guardados
          </h2>
          {favoritos.length === 0 ? (
            <p className="m-0 text-rio-suave">Toca «Guardar» en un lugar para tenerlo aquí y no olvidarte de ir.</p>
          ) : (
            <ul className="m-0 grid list-none gap-0 p-0">
              {favoritos.map((f) => (
                <li key={f.ruta} className="grid gap-0.5 border-b border-linea py-3">
                  <Link href={f.ruta} className="font-semibold">
                    {f.nombre}
                  </Link>
                  <span className="text-sm leading-5 text-rio-suave">{f.datos}</span>
                </li>
              ))}
            </ul>
          )}
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
