/*
 * Enlaces del negocio (versión 3, paso 11.2): YouTube, TikTok, Facebook, Instagram y página web.
 * Se aceptan como los pega la gente ("instagram.com/milindo", "@milindo", "http://…") y se guardan
 * normalizados: siempre https, sin usuario ni puerto, y del dominio de esa red. La base lo vuelve a
 * comprobar (migración 0009), así que esto es para dar mensajes claros.
 */

export const REDES = {
  web: { etiqueta: "Página web", columna: "website", dominios: null, perfil: null },
  facebook: { etiqueta: "Facebook", columna: "facebook", dominios: ["facebook.com", "fb.com", "fb.me"], perfil: "https://www.facebook.com/" },
  instagram: { etiqueta: "Instagram", columna: "instagram", dominios: ["instagram.com"], perfil: "https://www.instagram.com/" },
  tiktok: { etiqueta: "TikTok", columna: "tiktok", dominios: ["tiktok.com"], perfil: "https://www.tiktok.com/@" },
  youtube: { etiqueta: "YouTube", columna: "youtube", dominios: ["youtube.com", "youtu.be"], perfil: "https://www.youtube.com/@" },
} as const;

export type Red = keyof typeof REDES;
export const LISTA_REDES = Object.keys(REDES) as Red[];

export type Enlaces = Partial<Record<Red, string>>;

/** Normaliza lo que pegó la persona. null = vacío; "invalido" = no es un enlace; "otra-red" = es de otro sitio. */
export function leerEnlace(red: Red, texto: string): string | null | "invalido" | "otra-red" {
  const t = texto.trim();
  if (!t) return null;
  const { dominios, perfil } = REDES[red];

  // "@milindo" → perfil de la red
  const arroba = /^@([\p{L}\p{N}._-]{1,60})$/u.exec(t);
  if (arroba) return perfil ? perfil + arroba[1] : "invalido";

  let crudo = t;
  if (/^http:\/\//i.test(crudo)) crudo = "https://" + crudo.slice(7);
  else if (!/^https:\/\//i.test(crudo)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(crudo) && !/^[^/]+\.[a-z]{2,}(:\d+)?([/?#]|$)/i.test(crudo)) return "invalido"; // javascript:, mailto:…
    crudo = "https://" + crudo.replace(/^\/+/, "");
  }

  let u: URL;
  try {
    u = new URL(crudo);
  } catch {
    return "invalido";
  }
  const host = u.hostname.toLowerCase();
  if (u.protocol !== "https:" || u.username || u.password || u.port) return "invalido";
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) || /^[\d.]+$/.test(host)) return "invalido";
  if (dominios && !dominios.some((d) => host === d || host.endsWith("." + d))) return "otra-red";
  const href = u.href;
  return href.length <= 300 ? href : "invalido";
}

/** Lo que se muestra de una página web: solo el nombre del sitio, sin "www.". */
export function nombreSitio(enlace: string): string {
  try {
    return new URL(enlace).hostname.replace(/^www\./, "");
  } catch {
    return enlace;
  }
}

/** Los enlaces guardados en una fila de `places` (columnas website, facebook…), sin los vacíos. */
export function enlacesDeFila(fila: Partial<Record<(typeof REDES)[Red]["columna"], string | null>>): Enlaces {
  const r: Enlaces = {};
  for (const red of LISTA_REDES) {
    const v = fila[REDES[red].columna];
    if (v) r[red] = v;
  }
  return r;
}
