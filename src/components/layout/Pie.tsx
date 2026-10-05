import Link from "next/link";

export function Pie() {
  return (
    <footer className="border-t border-linea bg-papel-alto">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap justify-between gap-6 px-4 py-8 text-sm leading-5 text-rio-suave md:px-8">
        <div>
          <span className="font-rotulo text-[17px] leading-5 text-rio">Mi Lindo Ecuador</span>
          <br />
          La guía de Guayaquil hecha por su gente.
          <br />
          Un proyecto de DeepCore.
        </div>
        <nav aria-label="Pie de página" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/negocios/registro" className="text-rio-suave">Registra tu negocio</Link>
          <Link href="/negocios/planes" className="text-rio-suave">Planes para negocios</Link>
          <Link href="/legal/terminos" className="text-rio-suave">Términos</Link>
          <Link href="/legal/privacidad" className="text-rio-suave">Privacidad</Link>
        </nav>
      </div>
    </footer>
  );
}
