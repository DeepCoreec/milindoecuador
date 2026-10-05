/** "Cevichería Doña Tere #2" → "cevicheria-dona-tere-2". Solo letras minúsculas, números y guiones, como pide la base. */
export function aSlug(texto: string, maximo = 60): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maximo)
    .replace(/-+$/g, "");
}

/** Primer slug libre: "lugar", "lugar-2", "lugar-3"… */
export function slugLibre(base: string, ocupados: Set<string>): string {
  const limpio = aSlug(base) || "lugar";
  if (!ocupados.has(limpio)) return limpio;
  for (let n = 2; ; n++) {
    const candidato = `${limpio.slice(0, 55)}-${n}`;
    if (!ocupados.has(candidato)) return candidato;
  }
}
