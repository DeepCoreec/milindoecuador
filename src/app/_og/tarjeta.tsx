import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/*
 * Tarjeta que se ve al compartir un enlace en WhatsApp, Facebook o Instagram (1200 × 630).
 * Izquierda: el texto sobre el color de noche de la marca. Derecha: el Cerro Santa Ana en pixel art.
 * Colores tomados del modo oscuro del sistema de diseño (docs/diseno-tokens.json).
 */

export const TAMANO_OG = { width: 1200, height: 630 };

const C = { papel: "#0B1D28", rio: "#E8F1F5", rioSuave: "#A3B9C5", celeste: "#7FC6F0", estrella: "#F5BE55", linea: "#25404F" };

const leer = (...p: string[]) => readFile(join(process.cwd(), "src/app", ...p));

async function recursos() {
  const [rotulo, sans500, sans700, panorama] = await Promise.all([
    leer("fonts/og/KronaOne-Regular.ttf"),
    leer("fonts/og/HankenGrotesk-500.ttf"),
    leer("fonts/og/HankenGrotesk-700.ttf"),
    leer("_og/panorama.png"),
  ]);
  return {
    panorama: `data:image/png;base64,${panorama.toString("base64")}`,
    fuentes: [
      { name: "Krona", data: rotulo, weight: 400 as const, style: "normal" as const },
      { name: "Hanken", data: sans500, weight: 500 as const, style: "normal" as const },
      { name: "Hanken", data: sans700, weight: 700 as const, style: "normal" as const },
    ],
  };
}

function Estrella() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24">
      <path fill={C.estrella} d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
    </svg>
  );
}

export type DatosTarjetaOg = {
  /** Línea chica arriba del título, por ejemplo "Restaurante en Urdesa". */
  arriba: string;
  titulo: string;
  /** Línea de abajo, por ejemplo "4,8 · 32 reseñas". Si hay nota, se dibuja la estrella. */
  abajo?: string;
  conEstrella?: boolean;
};

export async function tarjetaOg({ arriba, titulo, abajo, conEstrella }: DatosTarjetaOg) {
  const { panorama, fuentes } = await recursos();
  const tamTitulo = titulo.length > 34 ? 52 : titulo.length > 20 ? 62 : 72;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: C.papel, fontFamily: "Hanken" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 560, padding: "56px 48px 52px 64px" }}>
          <div style={{ display: "flex", fontFamily: "Krona", fontSize: 26, color: C.celeste }}>Mi Lindo Ecuador</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 500, color: C.rioSuave, marginBottom: 14 }}>{arriba}</div>
            <div style={{ display: "flex", fontSize: tamTitulo, fontWeight: 700, lineHeight: 1.08, color: C.rio, letterSpacing: -1 }}>{titulo}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", fontSize: 30, fontWeight: 500, color: C.rio, minHeight: 40 }}>
            {conEstrella && <Estrella />}
            {abajo && <span style={{ marginLeft: conEstrella ? 12 : 0 }}>{abajo}</span>}
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- dentro de ImageResponse no existe next/image */}
        <img src={panorama} width={640} height={630} alt="" style={{ objectFit: "cover", objectPosition: "left", borderLeft: `2px solid ${C.linea}` }} />
      </div>
    ),
    { ...TAMANO_OG, fonts: fuentes },
  );
}
