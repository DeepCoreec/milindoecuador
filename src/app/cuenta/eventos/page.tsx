import type { Metadata } from "next";
import Link from "next/link";
import { BorrarEvento } from "@/components/eventos/BorrarEvento";
import { Cabecera } from "@/components/layout/Cabecera";
import { Migas } from "@/components/layout/Migas";
import { Pie } from "@/components/layout/Pie";
import { Boton } from "@/components/ui/Boton";
import { Insignia } from "@/components/ui/Insignia";
import { requireUsuario } from "@/lib/auth";
import { getMisEventos } from "@/lib/datos/eventos";
import { textoFechas, vigente } from "@/lib/eventos";

export const metadata: Metadata = { title: "Mis eventos · Mi Lindo Ecuador", robots: { index: false } };
export const dynamic = "force-dynamic";

/** "Mis eventos" (versión 5): los eventos de la cuenta, con su estado, para cambiarlos o borrarlos. */
export default async function PaginaMisEventos() {
  const usuario = await requireUsuario("/cuenta/eventos");
  const eventos = await getMisEventos(usuario.id);
  return (
    <>
      <Cabecera />
      <main className="mx-auto grid w-full max-w-[720px] flex-1 content-start gap-8 px-4 pt-8 pb-20 text-rio md:px-8">
        <div className="grid gap-3">
          <Migas pasos={[{ texto: "Mi cuenta", href: "/cuenta" }, { texto: "Mis eventos" }]} />
          <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">Mis eventos</h1>
          <p className="m-0 text-rio-suave">Cada evento se borra solo al día siguiente de su fecha de fin. Puedes publicar hasta 3 por semana.</p>
          <Boton href="/guayaquil/eventos/nuevo" variante="principal" className="justify-self-start">
            Publicar un evento
          </Boton>
        </div>
        {eventos.length === 0 ? (
          <p className="m-0 rounded-xl bg-mango-suave p-6">Todavía no has publicado eventos.</p>
        ) : (
          <ul className="m-0 grid list-none gap-4 p-0">
            {eventos.map((e) => {
              const ruta = `/guayaquil/eventos/${e.slug}`;
              const activo = e.estado === "publicado" && vigente(e);
              return (
                <li key={e.id} className="grid gap-2 rounded-xl border border-linea bg-papel-alto p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {activo ? (
                      <Link href={ruta} className="text-lg leading-6 font-semibold">
                        {e.titulo}
                      </Link>
                    ) : (
                      <b className="text-lg leading-6">{e.titulo}</b>
                    )}
                    {e.estado === "oculto" && <Insignia variante="neutra">Oculto por reportes: lo estamos revisando</Insignia>}
                    {e.estado === "publicado" && !vigente(e) && <Insignia variante="neutra">Terminó: se borra esta noche</Insignia>}
                  </div>
                  <p className="m-0 text-[15px] text-rio-suave">{textoFechas(e.inicio, e.fin)}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Boton href={`/cuenta/eventos/${e.id}`} variante="secundario" tamano="chico">
                      Cambiar
                    </Boton>
                    <BorrarEvento id={e.id} titulo={e.titulo} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <Pie />
    </>
  );
}
