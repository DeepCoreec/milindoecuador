import { entrarConGoogle } from "@/acciones/sesion";
import { clasesBoton } from "@/components/ui/Boton";
import { googleActivo } from "@/lib/sitio";

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

/**
 * Entrar o crear cuenta con Google (paso 6.1; en Crear cuenta desde la versión 10, 38.1). Con Google, la primera vez se
 * crea la cuenta sola. No se muestra si Google no está activo.
 */
export function BotonGoogle({ siguiente, texto }: { siguiente: string; texto: string }) {
  if (!googleActivo()) return null;
  return (
    <>
      <form action={entrarConGoogle}>
        <input type="hidden" name="siguiente" value={siguiente} />
        <button type="submit" className={clasesBoton("secundario", "normal", "w-full")}>
          <LogoGoogle />
          {texto}
        </button>
      </form>
      <div className="flex items-center gap-3 text-sm text-rio-suave" aria-hidden="true">
        <span className="h-px flex-1 bg-linea" />o con tu correo<span className="h-px flex-1 bg-linea" />
      </div>
    </>
  );
}
