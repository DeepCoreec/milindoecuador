import type { Metadata } from "next";
import Link from "next/link";
import { Cabecera } from "@/components/layout/Cabecera";
import { Pie } from "@/components/layout/Pie";
import { FormRecuperar } from "@/components/sesion/FormRecuperar";
import { rutaSegura } from "@/lib/validacion/sesion";

export const metadata: Metadata = { title: "Recuperar contraseña · Mi Lindo Ecuador", robots: { index: false, follow: false } };

/** "Olvidé mi contraseña" (versión 2, paso 6.2). El enlace del correo lleva a "Mi cuenta" para escribir una nueva. */
export default async function PaginaRecuperar({ searchParams }: PageProps<"/recuperar">) {
  const siguiente = rutaSegura((await searchParams).siguiente);
  return (
    <>
      <Cabecera />
      <main className="mx-auto grid w-full max-w-[440px] flex-1 content-start gap-6 px-4 pt-12 pb-20 text-rio">
        <div className="grid gap-2">
          <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">Recuperar contraseña</h1>
          <p className="m-0 text-rio-suave">Escribe el correo de tu cuenta y te mandamos un enlace para crear una contraseña nueva.</p>
        </div>
        <FormRecuperar />
        <p className="m-0 text-center text-rio-suave">
          <Link href={`/entrar?siguiente=${encodeURIComponent(siguiente)}`}>Volver a entrar</Link>
        </p>
      </main>
      <Pie />
    </>
  );
}
