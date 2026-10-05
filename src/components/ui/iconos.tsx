// Íconos de línea (trazo 1,75), siempre junto a un texto o con aria-label en su botón.
import type { SVGProps } from "react";

const comun: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
};

export const IconoBuscar = () => (
  <svg {...comun}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const IconoUbicacion = () => (
  <svg {...comun}>
    <path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
export const IconoMenu = () => (
  <svg {...comun}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
export const IconoConversacion = () => (
  <svg {...comun}>
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </svg>
);
export const IconoCompartir = () => (
  <svg {...comun}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
  </svg>
);
export const IconoVisto = () => (
  <svg {...comun} strokeWidth={2.25}>
    <path d="m5 12 5 5L20 7" />
  </svg>
);
