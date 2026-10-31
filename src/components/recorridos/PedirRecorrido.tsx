"use client";

import { useState } from "react";
import { EnlaceContado } from "@/components/lugares/Estadisticas";
import { clasesBoton } from "@/components/ui/Boton";
import { claseEntrada } from "@/components/ui/clasesFormulario";
import { IconoConversacion } from "@/components/ui/iconos";
import { enlacePedido } from "@/lib/recorridos";

/** Hoy en Ecuador como "2026-10-31" (para que no se pueda elegir un día que ya pasó). */
function hoyEcuador() {
  return new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
}

/**
 * "Pedir este recorrido por WhatsApp" (versión 13, 42.3): la fecha y el número de personas van ya escritos en el
 * mensaje. No guardamos nada: el mensaje lo envía la persona desde su WhatsApp y el guía confirma.
 */
export function PedirRecorrido({ lugar, numero, recorrido }: { lugar: string; numero: string; recorrido: string }) {
  const [fecha, setFecha] = useState("");
  const [personas, setPersonas] = useState(2);
  const enlace = enlacePedido(numero, recorrido, fecha, personas);
  if (!enlace) return null;
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="pedir-fecha" className="text-[15px] leading-5 font-semibold">
            ¿Qué día?
          </label>
          <input id="pedir-fecha" type="date" min={hoyEcuador()} value={fecha} onChange={(e) => setFecha(e.target.value)} className={claseEntrada} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="pedir-personas" className="text-[15px] leading-5 font-semibold">
            ¿Cuántas personas?
          </label>
          <input
            id="pedir-personas"
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            value={personas}
            onChange={(e) => setPersonas(Number(e.target.value))}
            className={claseEntrada}
          />
        </div>
      </div>
      <EnlaceContado lugar={lugar} tipo="whatsapp" href={enlace} target="_blank" rel="noopener noreferrer" className={clasesBoton("whatsapp", "normal", "w-full sm:w-auto")}>
        <IconoConversacion />
        Pedir este recorrido por WhatsApp
      </EnlaceContado>
      <p className="m-0 text-sm leading-5 text-rio-suave">
        Se abre WhatsApp con tu pedido ya escrito. El guía te confirma si tiene cupo y el precio final. Mi Lindo Ecuador no cobra ni hace reservas.
      </p>
    </div>
  );
}
