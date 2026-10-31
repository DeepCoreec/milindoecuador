import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cabecera } from "@/components/layout/Cabecera";
import { Pie } from "@/components/layout/Pie";
import { BotonGoogle } from "@/components/sesion/BotonGoogle";
import { FormEntrar } from "@/components/sesion/FormEntrar";
import { obtenerUsuario } from "@/lib/auth";
import { rutaSegura } from "@/lib/validacion/sesion";

export const metadata: Metadata = { title: "Entrar · Mi Lindo Ecuador", robots: { index: false, follow: false } };

const ERRORES: Record<string, string> = {
  enlace:
    "Ese enlace ya se usó, venció o se abrió en otro teléfono o computadora. Si estabas confirmando tu cuenta, ya puedes entrar con tu correo y contraseña. Si estabas recuperando tu contraseña, pide otro enlace y ábrelo en el mismo lugar donde lo pediste.",
  google: "No pudimos conectar con Google. Inténtalo de nuevo o entra con tu correo.",
  "sin-servicio": "El inicio de sesión todavía no está activo. Vuelve pronto.",
};

/** Entrar con correo y contraseña, o con Google cuando está activo (paso 6.1). Desde aquí se va a crear cuenta o a recuperar la contraseña. */
export default async function PaginaEntrar({ searchParams }: PageProps<"/entrar">) {
  const p = await searchParams;
  const siguiente = rutaSegura(p.siguiente);
  if (await obtenerUsuario()) redirect(siguiente);
  const error = typeof p.error === "string" ? ERRORES[p.error] : undefined;

  return (
    <>
      <Cabecera />
      <main className="mx-auto grid w-full max-w-[440px] flex-1 content-start gap-6 px-4 pt-12 pb-20 text-rio">
        <div className="grid gap-2">
          <h1 className="m-0 font-rotulo text-[28px] leading-[34px] font-normal">Entrar</h1>
          <p className="m-0 text-rio-suave">Con tu cuenta puedes escribir reseñas de los lugares que visitaste.</p>
        </div>
        {error && (
          <p role="alert" className="m-0 rounded-xl border border-error p-4 text-sm leading-5">
            {error}
          </p>
        )}
        <BotonGoogle siguiente={siguiente} texto="Entrar con Google" />
        <FormEntrar siguiente={siguiente} />
        <p className="m-0 text-center text-rio-suave">
          ¿Primera vez aquí? <Link href={`/crear-cuenta?siguiente=${encodeURIComponent(siguiente)}`}>Crea tu cuenta</Link>
        </p>
        <p className="m-0 text-[13px] leading-[18px] text-rio-suave">
          Al entrar aceptas los términos y la política de privacidad de Mi Lindo Ecuador.
        </p>
      </main>
      <Pie />
    </>
  );
}
