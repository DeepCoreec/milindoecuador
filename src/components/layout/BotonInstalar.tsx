"use client";

import { useEffect, useState } from "react";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/**
 * "Instalar app": solo aparece cuando el navegador ofrece instalar la guía (Chrome y Edge en Android
 * y computadora). En iPhone se instala desde Compartir → "Agregar a inicio", así que ahí no se muestra.
 */
export function BotonInstalar({ className = "" }: { className?: string }) {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  useEffect(() => {
    const guardar = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    const instalada = () => setEvento(null);
    window.addEventListener("beforeinstallprompt", guardar);
    window.addEventListener("appinstalled", instalada);
    return () => {
      window.removeEventListener("beforeinstallprompt", guardar);
      window.removeEventListener("appinstalled", instalada);
    };
  }, []);
  if (!evento) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        await evento.prompt();
        await evento.userChoice;
        setEvento(null);
      }}
      className={className}
    >
      Instalar app
    </button>
  );
}
