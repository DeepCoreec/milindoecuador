import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { entrarConGoogle } from "@/acciones/sesion";
import { Cabecera } from "@/components/layout/Cabecera";
import { Pie } from "@/components/layout/Pie";
import { FormEntrar } from "@/components/sesion/FormEntrar";
import { clasesBoton } from "@/components/ui/Boton";
import { obtenerUsuario } from "@/lib/auth";
import { rutaSegura } from "@/lib/validacion/sesion";

export const metadata: Metadata = { title: "Entrar · Mi Lindo Ecuador", robots: { index: false, follow: false } };

const ERRORES: Record<string, string> = {
  enlace: "Ese enlace ya se usó o venció. Pide uno nuevo y ábrelo en el mismo teléfono o computadora donde lo pediste.",
  google: "No pudimos conectar con Google. Inténtalo de nuevo o entra con tu correo.",
  "sin-servicio": "El inicio de sesión todavía no está activo. Vuelve pronto.",
};

function LogoGoogle() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5 5 0 0 1-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-8Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.8A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.6-2.8Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.6 2.8C6.6 7.3 9.1 5.4 12 5.4Z" />
    </svg>
  );
}

/** Entrar con un enlace al correo o con Google. Sirve también para crear la cuenta. */
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
          <p className="m-0 text-rio-suave">Con tu cuenta puedes escribir reseñas de los lugares que visitaste. Si es tu primera vez, se crea sola.</p>
        </div>
        {error && (
          <p role="alert" className="m-0 rounded-xl border border-error p-4 text-sm leading-5">
            {error}
          </p>
        )}
        <form action={entrarConGoogle}>
          <input type="hidden" name="siguiente" value={siguiente} />
          <button type="submit" className={clasesBoton("secundario", "normal", "w-full")}>
            <LogoGoogle />
            Entrar con Google
          </button>
        </form>
        <div className="flex items-center gap-3 text-sm text-rio-suave" aria-hidden="true">
          <span className="h-px flex-1 bg-linea" />o con tu correo<span className="h-px flex-1 bg-linea" />
        </div>
        <FormEntrar siguiente={siguiente} />
        <p className="m-0 text-[13px] leading-[18px] text-rio-suave">
          Al entrar aceptas los términos y la política de privacidad de Mi Lindo Ecuador.
        </p>
      </main>
      <Pie />
    </>
  );
}
