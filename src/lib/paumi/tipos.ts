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

/**
 * Un lugar que NO está en la guía y que Paumi encontró en internet (paso 16, a pedido del usuario). Solo se acepta si
 * la fuente salió de una búsqueda real en esa misma respuesta; la dirección la da Google Maps (Paumi no la escribe).
 */
export type ExternoPaumi = {
  nombre: string;
  sector: string | null;
  /** Búsqueda en Google Maps con el nombre, el sector y la ciudad: abre el lugar con su dirección real. */
  mapa: string;
  fuente: { url: string; sitio: string };
};

export type RespuestaPaumi = {
  texto: string;
  lugares: TarjetaPaumi[];
  /** Lugares de internet (fuera de la guía), con su fuente y su enlace a Google Maps. */
  externos: ExternoPaumi[];
  /** Página de la guía a la que Paumi propone llevar a la persona (ya validada por el servidor). */
  navegar: string | null;
  fuentes: { titulo: string; url: string }[];
  /** Firma del servidor: la página la devuelve con el historial (sin ella, el mensaje "de Paumi" no vale). */
  firma?: string;
};

export type MensajePaumi = { rol: "usuario" | "paumi"; texto: string; firma?: string };
