"use client";

import { useSyncExternalStore } from "react";
import { estadoAhora, type Horario } from "@/lib/horario";

// Se recalcula cada minuto, con la hora del teléfono de quien mira (en hora de Ecuador).
function suscribir(aviso: () => void) {
  const t = setInterval(aviso, 60_000);
  return () => clearInterval(t);
}
const minutoActual = () => Math.floor(Date.now() / 60_000);
const enServidor = () => null;

/**
 * "Abierto · cierra a las 22:00" / "Cerrado · abre mañana a las 8:00" (versión 2, paso 10.1).
 * Solo se dibuja en el navegador: la página puede venir de caché y la hora tiene que ser la de ahora.
 */
export function AbiertoAhora({ horario }: { horario: Horario }) {
  const minuto = useSyncExternalStore(suscribir, minutoActual, enServidor);
  if (minuto === null) return null;
  const e = estadoAhora(horario, new Date(minuto * 60_000));
  return (
    <p className="m-0 flex items-center gap-2 text-[15px] leading-[22px]">
      <span aria-hidden="true" className={`inline-block size-2.5 rounded-full ${e.abierto ? "bg-exito" : "bg-rio-suave"}`} />
      <span className={e.abierto ? "font-semibold text-exito" : "text-rio-suave"}>{e.texto}</span>
    </p>
  );
}
