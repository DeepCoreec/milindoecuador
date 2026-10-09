"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { COOKIE_CON_SESION } from "@/lib/supabase/cookies";

/**
 * ¿Hay sesión en este navegador? Solo para cambiar "Entrar" por "Mi cuenta" en los menús:
 * lo que de verdad protege las páginas y acciones se verifica en el servidor.
 * Versión 3 (paso 13.3): la sesión está en cookies httpOnly que la página no puede leer; el servidor deja
 * además una cookie sin secreto ("mle-con-sesion=1") que es la que se mira aquí.
 */
export function useConSesion(): boolean {
  const [conSesion, setConSesion] = useState(false);
  const ruta = usePathname(); // se vuelve a mirar al cambiar de página (por ejemplo, después de entrar o salir)
  useEffect(() => {
    const leer = () => setConSesion(document.cookie.split("; ").includes(`${COOKIE_CON_SESION}=1`));
    leer();
    window.addEventListener("focus", leer);
    return () => window.removeEventListener("focus", leer);
  }, [ruta]);
  return conSesion;
}
