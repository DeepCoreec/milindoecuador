import type { Metadata } from "next";
import Link from "next/link";
import { Cabecera } from "@/components/layout/Cabecera";
import { Pie } from "@/components/layout/Pie";
import { Boton } from "@/components/ui/Boton";
import { Insignia } from "@/components/ui/Insignia";
import { requireUsuario } from "@/lib/auth";
import { getMisNegocios } from "@/lib/datos/dueno";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mi negocio · Mi Lindo Ecuador", robots: { index: false, follow: false } };

const ESTADOS = { publicado: "Se ve en la guía", borrador: "Sin publicar", oculto: "En revisión" } as const;

/** Los negocios de la cuenta (versión 2, paso 9.2). */
export default async function PaginaMisNegocios() {
  const usuario = await requireUsuario("/mi-negocio");
  const negocios = await getMisNegocios(usuario);
  return (
    <>
      <Cabecera />
      <main className="mx-auto grid w-full max-w-[720px] flex-1 content-start gap-6 px-4 pt-10 pb-20 text-rio md:px-8">
        <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">Mi negocio</h1>
        {negocios.length === 0 ? (
          <div className="grid gap-4 rounded-xl border border-linea bg-papel-alto p-6">
            <p className="m-0 text-rio-suave">
              Todavía no tienes negocios en la guía. Envía tu solicitud: cuando la aprobemos, aparece aquí para que pongas tus fotos, horario y ubicación.
            </p>
            <Boton href="/negocios/registro" variante="principal" className="justify-self-start">
              Registrar mi negocio
            </Boton>
          </div>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0">
            {negocios.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/mi-negocio/${n.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-linea bg-papel-alto p-5 text-rio no-underline hover:border-linea-fuerte"
                >
                  <span className="grid gap-1">
                    <b className="text-lg leading-6">{n.nombre}</b>
                    <span className="text-sm leading-5 text-rio-suave">
                      {n.fotos} {n.fotos === 1 ? "foto" : "fotos"}
                    </span>
                  </span>
                  <Insignia>{ESTADOS[n.estado]}</Insignia>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Pie />
    </>
  );
}
