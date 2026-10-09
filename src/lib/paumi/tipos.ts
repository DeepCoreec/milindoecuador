/** Lo que el servidor de Paumi le devuelve a la página (versión 3, fase 14). */

/** Una tarjeta de lugar armada por el servidor con datos de la guía (nunca con texto inventado por la IA). */
export type TarjetaPaumi = {
  id: string;
  nombre: string;
  categoria: string;
  sector: string;
  ruta: string;
  foto: { src: string; alt: string } | null;
  precio: string | null;
  /** "Abierto · cierra a las 22:00", si el lugar tiene horario por día. */
  estado: string | null;
  abierto: boolean | null;
  comoLlegar: string;
};

export type RespuestaPaumi = {
  texto: string;
  lugares: TarjetaPaumi[];
  /** Página de la guía a la que Paumi propone llevar a la persona (ya validada por el servidor). */
  navegar: string | null;
  fuentes: { titulo: string; url: string }[];
};

export type MensajePaumi = { rol: "usuario" | "paumi"; texto: string };
