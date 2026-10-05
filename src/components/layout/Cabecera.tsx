import Link from "next/link";
import { clasesBoton } from "@/components/ui/Boton";
import { IconoBuscar, IconoMenu, IconoUbicacion } from "@/components/ui/iconos";

/** Cabecera del sitio. En celular muestra solo la marca, buscar y el menú. */
export function Cabecera() {
  return (
    <header className="border-b border-linea bg-papel-alto">
      <div className="mx-auto flex min-h-16 w-full max-w-[1200px] items-center gap-4 px-4 md:px-8">
        <Link href="/" className="font-rotulo text-[17px] leading-5 tracking-[-0.01em] text-rio no-underline">
          Mi Lindo Ecuador
        </Link>
        <span className="hidden min-h-9 items-center gap-1.5 rounded-full border border-linea bg-papel px-3 text-sm font-medium text-rio lg:inline-flex [&_svg]:size-4">
          <IconoUbicacion />
          Guayaquil
        </span>
        <nav aria-label="Principal" className="ml-auto flex items-center gap-2">
          <Link href="/guayaquil" className="hidden rounded-md px-3 py-2.5 text-[15px] font-medium text-rio no-underline lg:inline-block">
            Explorar
          </Link>
          <Link href="/entrar" className="hidden rounded-md px-3 py-2.5 text-[15px] font-medium text-rio no-underline lg:inline-block">
            Entrar
          </Link>
          {/* La envoltura oculta el botón en celular: "hidden" no puede competir con el inline-flex del botón. */}
          <span className="hidden lg:contents">
            <Link href="/negocios/registro" className={clasesBoton("secundario", "chico")}>
              Registra tu negocio
            </Link>
          </span>
          <Link href="/buscar" aria-label="Buscar" className="inline-grid size-11 place-items-center rounded-md text-rio lg:hidden [&_svg]:size-[22px]">
            <IconoBuscar />
          </Link>
          <button type="button" aria-label="Abrir menú" className="inline-grid size-11 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-rio lg:hidden [&_svg]:size-[22px]">
            <IconoMenu />
          </button>
        </nav>
      </div>
    </header>
  );
}
