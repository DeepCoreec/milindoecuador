import Link from "next/link";
import { BotonInstalar } from "./BotonInstalar";

const enlace = "text-rio-suave no-underline hover:text-rio hover:underline";

/** Pie de página (versión 4): franja de noche, como la entrada de la portada, con los atajos a mano. */
export function Pie() {
  return (
    <footer data-theme="dark" className="bg-papel text-rio">
      <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 pt-12 pb-[max(32px,env(safe-area-inset-bottom))] text-[15px] leading-6 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] md:px-8">
        <div className="grid content-start gap-2">
          <span className="font-rotulo text-xl leading-7">Mi Lindo Ecuador</span>
          <p className="m-0 max-w-[36ch] text-rio-suave">La guía de Guayaquil hecha por su gente. Un proyecto de DeepCore.</p>
        </div>
        <nav aria-labelledby="pie-explora" className="grid content-start gap-2">
          <h2 id="pie-explora" className="m-0 text-base font-semibold">
            Explora
          </h2>
          <Link href="/guayaquil/restaurantes" className={enlace}>Restaurantes</Link>
          <Link href="/guayaquil/hoteles" className={enlace}>Hoteles</Link>
          <Link href="/guayaquil/turismo" className={enlace}>Lugares turísticos</Link>
          <Link href="/guayaquil/eventos" className={enlace}>Eventos</Link>
          <Link href="/guayaquil" className={enlace}>Todas las categorías</Link>
        </nav>
        <nav aria-labelledby="pie-negocios" className="grid content-start gap-2">
          <h2 id="pie-negocios" className="m-0 text-base font-semibold">
            Negocios
          </h2>
          <Link href="/negocios/registro" className={enlace}>Registra tu negocio</Link>
          <Link href="/negocios/planes" className={enlace}>Planes para negocios</Link>
          <Link href="/mi-negocio" className={enlace}>Mi negocio</Link>
        </nav>
        <nav aria-labelledby="pie-legal" className="grid content-start gap-2">
          <h2 id="pie-legal" className="m-0 text-base font-semibold">
            La guía
          </h2>
          <Link href="/legal/terminos" className={enlace}>Términos</Link>
          <Link href="/legal/privacidad" className={enlace}>Privacidad</Link>
          <BotonInstalar className="cursor-pointer justify-self-start border-0 bg-transparent p-0 text-[15px] leading-6 font-semibold text-celeste-tinta underline underline-offset-2" />
        </nav>
      </div>
    </footer>
  );
}
