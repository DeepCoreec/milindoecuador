"use client";

import { useState } from "react";
import { convertirEnlaceMaps } from "@/acciones/ubicacion";
import { claseAyuda, claseEntrada, claseEtiqueta } from "@/components/ui/clasesFormulario";
import { enEcuador, enlaceVerEnMapa, esEnlaceCorto, leerUbicacion, textoUbicacion } from "@/lib/ubicacion";

/**
 * Ubicación exacta para "Cómo llegar" (versión 2, paso 7.2), sin API de pago:
 * pegar las coordenadas de Google Maps o tocar "Usar mi ubicación actual" estando en el lugar.
 * Versión 3: también el enlace corto de "Compartir" (maps.app.goo.gl): el servidor lo convierte en coordenadas.
 * El servidor vuelve a validar todo (Zod y la base).
 */
export function CampoUbicacion({ id, valor }: { id: string; valor: string }) {
  const [texto, setTexto] = useState(valor);
  const [aviso, setAviso] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const leida = leerUbicacion(texto);
  const valida = leida && leida !== "invalida" && enEcuador(leida) ? leida : null;

  async function cambiar(nuevo: string) {
    setTexto(nuevo);
    if (!esEnlaceCorto(nuevo)) return;
    setBuscando(true);
    setAviso("Leyendo el enlace de Google Maps…");
    const r = await convertirEnlaceMaps(nuevo.trim());
    setBuscando(false);
    if ("ubicacion" in r) {
      // Si mientras tanto la persona cambió el texto, se respeta lo que escribió
      setTexto((actual) => (actual === nuevo ? r.ubicacion : actual));
      setAviso("Listo: sacamos el punto del enlace. Revísalo en el mapa antes de guardar.");
    } else setAviso(r.error);
  }

  function usarMiUbicacion() {
    if (!("geolocation" in navigator)) {
      setAviso("Este navegador no puede dar tu ubicación. Pega las coordenadas de Google Maps.");
      return;
    }
    setBuscando(true);
    setAviso(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBuscando(false);
        setTexto(textoUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setAviso(pos.coords.accuracy > 100 ? `Ubicación aproximada (±${Math.round(pos.coords.accuracy)} m). Revísala en el mapa.` : "Listo. Revísala en el mapa antes de guardar.");
      },
      (e) => {
        setBuscando(false);
        setAviso(e.code === e.PERMISSION_DENIED ? "No diste permiso para usar tu ubicación. Puedes pegar las coordenadas de Google Maps." : "No se pudo obtener tu ubicación. Inténtalo de nuevo o pega las coordenadas.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <label htmlFor={id} className={claseEtiqueta}>
        Ubicación exacta (opcional)
      </label>
      <input
        id={id}
        name="ubicacion"
        value={texto}
        onChange={(e) => void cambiar(e.target.value)}
        maxLength={2000}
        placeholder="-2.189400, -79.880800"
        aria-describedby={`${id}-ayuda`}
        className={claseEntrada}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="button" onClick={usarMiUbicacion} disabled={buscando} className="text-sm leading-5 font-semibold text-rio underline underline-offset-4">
          {buscando ? "Buscando…" : "Usar mi ubicación actual"}
        </button>
        {valida && (
          <a href={enlaceVerEnMapa(valida)} target="_blank" rel="noopener noreferrer" className="text-sm leading-5">
            Ver el punto en Google Maps
          </a>
        )}
      </div>
      <p id={`${id}-ayuda`} className={`m-0 ${claseAyuda}`} role={aviso ? "status" : undefined}>
        {aviso ??
          "Para que «Cómo llegar» abra la ruta exacta. En Google Maps busca tu negocio, toca «Compartir» → «Copiar enlace» y pégalo aquí (o deja presionado el lugar y copia los números). También puedes tocar «Usar mi ubicación actual» estando en el lugar."}
      </p>
    </div>
  );
}
