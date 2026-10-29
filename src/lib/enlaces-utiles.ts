/*
 * Enlaces oficiales de "Información útil" en la Guía útil (versión 8, fase 33; plan en docs/PLAN-V8.md).
 * Regla: cada enlace se abre y se comprueba antes de ponerlo (que sea el sitio oficial y que funcione), y se anota la
 * fecha. Nada de sitios no oficiales: por eso no hay app de la Metrovía (no existe una oficial vigente; en su lugar va
 * el mapa oficial de rutas y estaciones que publica la ATM).
 */

export type EnlaceUtil = { titulo: string; detalle: string; url: string; sitio: string; pdf?: boolean };
export type GrupoEnlaces = { titulo: string; enlaces: EnlaceUtil[] };

/** Fecha en que se comprobaron todos los enlaces (se actualiza al volver a revisarlos). */
export const ENLACES_COMPROBADOS = "2026-10-28";

export const ENLACES_UTILES: GrupoEnlaces[] = [
  {
    titulo: "Moverse por la ciudad",
    enlaces: [
      {
        titulo: "Mapa de la Metrovía 2026",
        detalle: "Rutas troncales y alimentadoras, con todas las estaciones",
        url: "https://atm.gob.ec/wp-content/uploads/2026/10/Metrovia-Mapa-semi-geografico-de-rutas-troncales-y-alimentadoras-2026.pdf",
        sitio: "atm.gob.ec",
        pdf: true,
      },
      { titulo: "Metrovía", detalle: "Rutas, paradas, recarga de tarjeta y novedades del servicio", url: "https://atm.gob.ec/movilidad/", sitio: "atm.gob.ec" },
      { titulo: "Aerovía", detalle: "Estaciones, horarios, tarifas y recomendaciones", url: "https://atm.gob.ec/movilidad/aerovia/", sitio: "atm.gob.ec" },
      { titulo: "Tránsito de Guayaquil (ATM)", detalle: "Cambios de horarios, multas, matrícula y avisos", url: "https://atm.gob.ec/", sitio: "atm.gob.ec" },
    ],
  },
  {
    titulo: "Viajar",
    enlaces: [
      { titulo: "Terminal Terrestre", detalle: "Buses a otras ciudades y servicios de la terminal", url: "https://ttg.ec/", sitio: "ttg.ec" },
      { titulo: "Aeropuerto José Joaquín de Olmedo", detalle: "Llegadas y salidas de vuelos en vivo", url: "https://www.tagsa.aero/", sitio: "tagsa.aero" },
    ],
  },
  {
    titulo: "Emergencias",
    enlaces: [{ titulo: "ECU 911", detalle: "Servicio Integrado de Seguridad: en una emergencia, llama al 911", url: "https://www.ecu911.gob.ec/", sitio: "ecu911.gob.ec" }],
  },
];
