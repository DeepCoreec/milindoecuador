// Genera src/app/tokens.css a partir de docs/diseno-tokens.json (los valores aprobados del sistema de diseño).
// Uso: npm run tokens   — nunca edites tokens.css a mano.
import { readFileSync, writeFileSync } from "node:fs";

const t = JSON.parse(readFileSync(new URL("../docs/diseno-tokens.json", import.meta.url), "utf8"));
const valor = (v, tema) => (typeof v === "string" ? v : v[tema] ?? v.light);
const alias = (v) => v.replace(/^\{(.+)\}$/, "var(--$1)");

const colores = (tema) =>
  t.color.tokens.map((k) => `  --${k.name}: ${alias(valor(k.value, tema))};`).join("\n") +
  "\n" +
  t.shadow.tokens.map((k) => `  --${k.name}: ${valor(k.value, tema)};`).join("\n");

const fijos = [...t.spacing.tokens, ...t.radius.tokens].map((k) => `  --${k.name}: ${k.value};`).join("\n");

const css = `/* GENERADO por scripts/tokens.mjs desde docs/diseno-tokens.json. No editar a mano. */

/* Modo claro (por defecto) */
:root,
[data-theme="light"] {
${colores("light")}
  color-scheme: light;
}

/* Modo oscuro según el teléfono o la computadora */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${colores("dark").replace(/^/gm, "  ")}
    color-scheme: dark;
  }
}

/* Modo oscuro forzado (también sirve en un solo elemento, como el Panorama) */
[data-theme="dark"] {
${colores("dark")}
  color-scheme: dark;
}

:root {
${fijos}
}
`;

writeFileSync(new URL("../src/app/tokens.css", import.meta.url), css);
console.log(`tokens.css: ${t.color.tokens.length} colores, ${t.shadow.tokens.length} sombras, ${t.spacing.tokens.length + t.radius.tokens.length} medidas`);
