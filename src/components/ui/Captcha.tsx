"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type Turnstile = {
  render: (el: HTMLElement, opciones: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const CLAVE = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Captcha de Cloudflare Turnstile. Agrega al formulario el campo `cf-turnstile-response`,
 * que el servidor verifica. Cuando cambia `reiniciar` (por ejemplo, el resultado del envío) pide uno nuevo,
 * porque cada respuesta sirve una sola vez.
 * Sin clave pública (desarrollo) no se dibuja nada y el servidor lo omite.
 */
export function Captcha({ reiniciar }: { reiniciar?: unknown }) {
  const caja = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!CLAVE || !listo || !caja.current || !window.turnstile) return;
    id.current = window.turnstile.render(caja.current, { sitekey: CLAVE, language: "es", theme: "auto", size: "flexible" });
    return () => {
      if (id.current) window.turnstile?.remove(id.current);
      id.current = null;
    };
  }, [listo]);

  const primero = useRef(true);
  useEffect(() => {
    if (primero.current) {
      primero.current = false;
      return;
    }
    if (id.current) window.turnstile?.reset(id.current);
  }, [reiniciar]);

  if (!CLAVE) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setListo(true)} />
      <div ref={caja} className="min-h-[65px]" />
    </>
  );
}
