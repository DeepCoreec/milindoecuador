"use client";

import { useEffect, type ComponentProps } from "react";

type Tipo = "views" | "whatsapp" | "route" | "video";

/** Avisa un evento para las estadísticas del dueño (paso 10.2). Si falla, no pasa nada. */
export function avisar(lugar: string, tipo: Tipo) {
  try {
    const cuerpo = JSON.stringify({ lugar, tipo });
    if (!navigator.sendBeacon?.("/api/evento", new Blob([cuerpo], { type: "application/json" }))) {
      void fetch("/api/evento", { method: "POST", body: cuerpo, keepalive: true, headers: { "content-type": "application/json" } });
    }
  } catch {}
}

/** Cuenta una vista de la ficha, una vez por día y por navegador. */
export function ContarVista({ lugar }: { lugar: string }) {
  useEffect(() => {
    const clave = `mle-vista-${lugar}-${new Date().toISOString().slice(0, 10)}`;
    try {
      if (localStorage.getItem(clave)) return;
      localStorage.setItem(clave, "1");
    } catch {}
    avisar(lugar, "views");
  }, [lugar]);
  return null;
}

/** Un enlace normal que además cuenta el toque (WhatsApp o "Cómo llegar"). */
export function EnlaceContado({ lugar, tipo, ...props }: ComponentProps<"a"> & { lugar?: string; tipo: Tipo }) {
  return (
    <a
      {...props}
      onClick={(e) => {
        if (lugar) avisar(lugar, tipo);
        props.onClick?.(e);
      }}
    />
  );
}
