"use client";

import { useEffect, useState } from "react";
import { configSupabase } from "@/lib/supabase/config";
import { crearClienteNavegador } from "@/lib/supabase/client";

/**
 * ¿Hay sesión en este navegador? Solo para cambiar "Entrar" por "Mi cuenta" en los menús:
 * lo que de verdad protege las páginas y acciones se verifica en el servidor.
 * Así la cabecera no obliga a que todas las páginas se generen en cada visita.
 */
export function useConSesion(): boolean {
  const [conSesion, setConSesion] = useState(false);
  useEffect(() => {
    if (!configSupabase()) return;
    const supabase = crearClienteNavegador();
    supabase.auth.getSession().then(({ data }) => setConSesion(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, sesion) => setConSesion(!!sesion));
    return () => data.subscription.unsubscribe();
  }, []);
  return conSesion;
}
