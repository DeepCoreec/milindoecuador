"use client";

import Link from "next/link";
import { useConSesion } from "./useConSesion";

/** "Entrar" o "Mi cuenta", según haya sesión en este navegador. */
export function EnlaceCuenta({ className }: { className?: string }) {
  const conSesion = useConSesion();
  return (
    <Link href={conSesion ? "/cuenta" : "/entrar"} className={className}>
      {conSesion ? "Mi cuenta" : "Entrar"}
    </Link>
  );
}
