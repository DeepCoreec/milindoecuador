import localFont from "next/font/local";

// Fuentes del sistema de diseño (licencia OFL), servidas desde el propio sitio.

// Krona One: letra ancha de rótulo, solo para la marca y títulos grandes.
export const fuenteRotulo = localFont({
  src: "./fonts/KronaOne-Regular.woff2",
  weight: "400",
  variable: "--fuente-rotulo",
  display: "swap",
});

// Hanken Grotesk: toda la interfaz.
export const fuenteSans = localFont({
  src: [
    { path: "./fonts/HankenGrotesk-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/HankenGrotesk-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/HankenGrotesk-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/HankenGrotesk-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--fuente-sans",
  display: "swap",
});

// Source Serif 4: solo la historia de cada lugar.
export const fuenteHistoria = localFont({
  src: "./fonts/SourceSerif4-Regular.woff2",
  weight: "400",
  variable: "--fuente-historia",
  display: "swap",
});
