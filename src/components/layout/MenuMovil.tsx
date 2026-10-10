"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { clasesBoton } from "@/components/ui/Boton";
import { useConSesion } from "@/components/sesion/useConSesion";
import { IconoCerrar, IconoMenu } from "@/components/ui/iconos";

const ENLACES = [
  { href: "/guayaquil", texto: "Explorar Guayaquil" },
  { href: "/buscar", texto: "Buscar" },
  { href: "/guayaquil/eventos", texto: "Eventos" },
  { href: "/negocios/planes", texto: "Planes para negocios" },
];

/**
 * Menú del celular: un panel que entra por la derecha.
 * Radix se encarga de lo difícil: atrapa el foco, cierra con Escape y avisa al lector de pantalla.
 */
export function MenuMovil() {
  const conSesion = useConSesion();
  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label="Abrir menú"
        className="inline-grid size-11 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-rio lg:hidden [&_svg]:size-[22px]"
      >
        <IconoMenu />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="mle-velo fixed inset-0 z-40 bg-[#0b1d28]/55" />
        <Dialog.Content className="mle-panel-menu fixed inset-y-0 right-0 z-50 flex w-[min(320px,86vw)] flex-col gap-6 border-l border-linea bg-papel-alto p-4 text-rio shadow-flotante">
          <div className="flex min-h-11 items-center justify-between gap-4">
            <Dialog.Title className="m-0 font-rotulo text-[17px] leading-5 font-normal">Menú</Dialog.Title>
            <Dialog.Close
              aria-label="Cerrar menú"
              className="inline-grid size-11 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-rio [&_svg]:size-[22px]"
            >
              <IconoCerrar />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Enlaces principales de Mi Lindo Ecuador</Dialog.Description>
          <nav aria-label="Menú del celular" className="grid">
            {[...ENLACES.slice(0, 3), conSesion ? { href: "/cuenta", texto: "Mi cuenta" } : { href: "/entrar", texto: "Entrar" }, ...ENLACES.slice(3)].map((e) => (
              <Dialog.Close asChild key={e.href}>
                <Link href={e.href} className="flex min-h-12 items-center border-b border-linea px-1 text-base font-medium text-rio no-underline">
                  {e.texto}
                </Link>
              </Dialog.Close>
            ))}
          </nav>
          <Dialog.Close asChild>
            <Link href="/negocios/registro" className={clasesBoton("principal", "normal", "mt-auto")}>
              Registra tu negocio
            </Link>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
