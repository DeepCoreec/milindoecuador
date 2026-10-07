import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cabecera } from "@/components/layout/Cabecera";
import { Pie } from "@/components/layout/Pie";
import { FormCrearCuenta } from "@/components/sesion/FormCrearCuenta";
import { obtenerUsuario } from "@/lib/auth";
import { rutaSegura } from "@/lib/validacion/sesion";

export const metadata: Metadata = { title: "Crear cuenta · Mi Lindo Ecuador", robots: { index: false, follow: false } };

/** Crear cuenta con correo y contraseña (versión 2, paso 6.2). */
export default async function PaginaCrearCuenta({ searchParams }: PageProps<"/crear-cuenta">) {
  const p = await searchParams;
  const siguiente = rutaSegura(p.siguiente);
  if (await obtenerUsuario()) redirect(siguiente);

  return (
    <>
      <Cabecera />
      <main className="mx-auto grid w-full max-w-[440px] flex-1 content-start gap-6 px-4 pt-12 pb-20 text-rio">
        <div className="grid gap-2">
          <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">Crear cuenta</h1>
          <p className="m-0 text-rio-suave">Con tu cuenta puedes escribir reseñas y registrar tu negocio.</p>
        </div>
        <FormCrearCuenta siguiente={siguiente} />
        <p className="m-0 text-center text-rio-suave">
          ¿Ya tienes cuenta? <Link href={`/entrar?siguiente=${encodeURIComponent(siguiente)}`}>Entra</Link>
        </p>
        <p className="m-0 text-[13px] leading-[18px] text-rio-suave">
          Al crear tu cuenta aceptas los <Link href="/legal/terminos">términos</Link> y la <Link href="/legal/privacidad">política de privacidad</Link> de Mi
          Lindo Ecuador.
        </p>
      </main>
      <Pie />
    </>
  );
}
