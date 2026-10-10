/*
 * Traduce los rechazos de la moderación automática de la base (migración 0006) a mensajes claros.
 * La base corta el guardado con "texto_no_permitido:<campo>:<motivo>" o "limite_fotos".
 */

const CAMPOS: Record<string, string> = {
  nombre: "El nombre",
  sector: "El sector",
  descripcion: "La descripción",
  dato: "El dato corto",
  horario: "El horario",
  direccion: "La dirección",
  resena: "Tu reseña",
  respuesta: "La respuesta",
  negocio: "El nombre del negocio",
  contacto: "Tu nombre",
  web: "La página web",
  facebook: "El enlace de Facebook",
  instagram: "El enlace de Instagram",
  tiktok: "El enlace de TikTok",
  youtube: "El enlace de YouTube",
  titulo: "El título",
  lugar: "El lugar",
  organizador: "El organizador",
  afiche: "La descripción del afiche",
};

const MOTIVOS: Record<string, string> = {
  palabra: "tiene palabras que no se permiten en la guía. Cámbialas y vuelve a guardar.",
  enlace: "no puede llevar enlaces a otras páginas.",
  telefono: "no puede llevar números de teléfono. El WhatsApp del negocio tiene su propio campo.",
  reservado: "no puede parecer un nombre oficial de la guía (admin, soporte, Mi Lindo…). Elige otro.",
};

export function mensajeModeracion(error: { message?: string } | null | undefined): string | null {
  const texto = error?.message ?? "";
  if (texto.includes("limite_fotos")) return "Ya hay 15 fotos, el máximo. Borra alguna para subir otra.";
  const m = texto.match(/texto_no_permitido:([a-z]+):([a-z]+)/);
  if (!m) return null;
  return `${CAMPOS[m[1]!] ?? "El texto"} ${MOTIVOS[m[2]!] ?? "no se puede guardar así."}`;
}
