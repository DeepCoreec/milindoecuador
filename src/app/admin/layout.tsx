import type { Metadata } from "next";
import Link from "next/link";
import { salir } from "@/acciones/sesion";
import { NavAdmin } from "@/components/admin/NavAdmin";
import { requireAdmin } from "@/lib/auth";
import { getContadores } from "@/lib/datos/admin";

export const metadata: Metadata = { title: "Panel · Mi Lindo Ecuador", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Panel de administración. Verifica el rol en el servidor antes de mostrar nada. */
export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const c = await getContadores();
  return (
    <div className="flex min-h-full flex-1 flex-wrap items-start text-rio">
      <aside className="max-w-full flex-[1_1_220px] self-stretch border-b border-linea bg-papel-alto p-4 min-[900px]:flex-[0_0_248px] min-[900px]:border-r min-[900px]:border-b-0 min-[900px]:px-4 min-[900px]:py-6">
        <Link href="/" className="font-rotulo text-[17px] leading-5 text-rio no-underline">
          Mi Lindo Ecuador
        </Link>
        <div className="mt-1 text-sm leading-5 text-rio-suave">Panel de administración</div>
        <NavAdmin
          items={[
            { href: "/admin", texto: "Resumen" },
            { href: "/admin/solicitudes", texto: "Solicitudes", contador: c.pendientes },
            { href: "/admin/lugares", texto: "Lugares" },
            { href: "/admin/reportes", texto: "Reseñas reportadas", contador: c.reportes },
            { href: "/admin/cambios", texto: "Cambios recientes", contador: c.cambios },
            { href: "/admin/lugares-reportados", texto: "Lugares reportados", contador: c.lugaresReportados },
            { href: "/admin/videos", texto: "Videos", contador: c.videosReportados },
            { href: "/admin/palabras", texto: "Palabras prohibidas" },
          ]}
        />
        <form action={salir} className="mt-1">
          <button type="submit" className="flex min-h-11 w-full cursor-pointer items-center rounded-xl border-0 bg-transparent px-3 text-[15px] leading-5 font-medium text-rio-suave">
            Salir
          </button>
        </form>
      </aside>
      <main className="min-w-0 flex-[999_1_560px] px-4 pt-6 pb-12 min-[900px]:px-12 min-[900px]:pt-10 min-[900px]:pb-16">{children}</main>
    </div>
  );
}
