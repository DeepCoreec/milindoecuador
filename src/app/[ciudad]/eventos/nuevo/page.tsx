import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormEvento } from "@/components/eventos/FormEvento";
import { Cabecera } from "@/components/layout/Cabecera";
import { Migas } from "@/components/layout/Migas";
import { Pie } from "@/components/layout/Pie";
import { Boton } from "@/components/ui/Boton";
import { IconoVisto } from "@/components/ui/iconos";
import { obtenerUsuario } from "@/lib/auth";
import { getCiudad } from "@/lib/datos/lugares";

export const metadata: Metadata = { title: "Publica un evento gratis · Mi Lindo Ecuador", description: "Publica gratis tu concierto, feria o evento en Guayaquil." };
export const dynamic = "force-dynamic";

const PUNTOS = [
  "Gratis y al instante: se ve en la guía apenas lo publicas",
  "Se borra solo al día siguiente de que termina",
  "La gente lo agrega a su calendario y llega con Google Maps",
  "Lo cambias o lo borras cuando quieras desde «Mis eventos»",
];

/** Publicar un evento (versión 5). Hace falta cuenta, como para registrar un negocio. */
export default async function PaginaNuevoEvento({ params }: PageProps<"/[ciudad]/eventos/nuevo">) {
  const { ciudad: slug } = await params;
  const [ciudad, usuario] = await Promise.all([getCiudad(slug), obtenerUsuario()]);
  if (!ciudad) notFound();
  const volver = encodeURIComponent(`/${ciudad.slug}/eventos/nuevo`);
  return (
    <>
      <Cabecera />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-8 pb-16 text-rio md:px-8">
        <div className="grid items-start gap-10 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,640px)]">
          <div className="grid max-w-[520px] gap-4">
            <Migas pasos={[{ texto: "Eventos", href: `/${ciudad.slug}/eventos` }, { texto: "Publicar" }]} />
            <h1 className="m-0 font-rotulo text-[34px] leading-10 font-normal tracking-[-0.01em] text-balance md:text-[56px] md:leading-[62px]">Publica tu evento gratis</h1>
            <p className="m-0 max-w-[60ch] text-lg leading-7 text-rio-suave">Conciertos, ferias, deporte, cursos o la fiesta del barrio en {ciudad.nombre}.</p>
            <ul className="m-0 mt-2 grid list-none gap-3 p-0">
              {PUNTOS.map((p) => (
                <li key={p} className="flex gap-3 [&_svg]:size-[22px] [&_svg]:flex-none [&_svg]:text-exito">
                  <IconoVisto />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          {usuario ? (
            <FormEvento modo="nuevo" />
          ) : (
            <div className="grid gap-4 rounded-xl border border-linea bg-papel-alto p-6">
              <h2 className="m-0 text-xl leading-[26px] font-semibold">Primero, tu cuenta</h2>
              <p className="m-0 text-rio-suave">Con tu cuenta publicas tus eventos y los cambias o borras cuando quieras.</p>
              <div className="flex flex-wrap gap-3">
                <Boton href={`/crear-cuenta?siguiente=${volver}`} variante="principal">
                  Crear mi cuenta
                </Boton>
                <Boton href={`/entrar?siguiente=${volver}`} variante="secundario">
                  Ya tengo cuenta
                </Boton>
              </div>
            </div>
          )}
        </div>
      </main>
      <Pie />
    </>
  );
}
