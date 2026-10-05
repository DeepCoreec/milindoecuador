// Genera src/components/arte/afiches.tsx a partir de los SVG aprobados en docs/arte/.
// Uso: npm run arte   — nunca edites afiches.tsx a mano.
import { readFileSync, writeFileSync } from "node:fs";

// slug de la categoría (base de datos) → archivo del afiche
const AFICHES = {
  restaurantes: "restaurantes", hoteles: "hoteles", turismo: "turismo", ejercicio: "ejercicio", paseos: "paseos",
  cafes: "cafes", "vida-nocturna": "nocturna", museos: "museos", compras: "compras", ninos: "ninos",
  naturaleza: "naturaleza", todas: "todas",
};

const camel = { "stroke-width": "strokeWidth", "stroke-linecap": "strokeLinecap", "stroke-linejoin": "strokeLinejoin",
  "stroke-dasharray": "strokeDasharray", "clip-path": "clipPath", "fill-opacity": "fillOpacity" };

function aJsx(svg) {
  let s = svg
    .replace(/<style>[\s\S]*?<\/style>/, "")
    .replace(/ role="img" aria-label="[^"]*"/, "")
    .replace(/ xmlns="[^"]*"/, "")
    .replace(/\sclass=/g, " className=");
  for (const [a, b] of Object.entries(camel)) s = s.replace(new RegExp(`\\s${a}=`, "g"), ` ${b}=`);
  return s.replace("<svg ", '<svg aria-hidden="true" focusable="false" ');
}

let salida = `// GENERADO por scripts/arte.mjs desde docs/arte/categoria-*.svg. No editar a mano.
// Estilos de los afiches: sección "Afiches" de src/app/globals.css.
import type { ReactElement } from "react";

export const AFICHES: Record<string, () => ReactElement> = {
`;
for (const [slug, archivo] of Object.entries(AFICHES)) {
  const svg = readFileSync(new URL(`../docs/arte/categoria-${archivo}.svg`, import.meta.url), "utf8");
  salida += `  ${JSON.stringify(slug)}: () => (\n    ${aJsx(svg)}\n  ),\n`;
}
salida += "};\n";
writeFileSync(new URL("../src/components/arte/afiches.tsx", import.meta.url), salida);
console.log(`afiches.tsx: ${Object.keys(AFICHES).length} afiches`);
