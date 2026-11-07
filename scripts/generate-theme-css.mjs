#!/usr/bin/env node
// Site themes (#73, #77). Writes app/themes.css from the palettes below.
//
// Every colour on the site is a CSS variable (app/globals.css): the palette by
// role (--c-bg, --c-fg, --c-red, ...), the older page tokens (--bg, --card,
// --text, ...) and one --x-<hex> per one-off colour. The dark theme is what
// :root already says. Each other theme here:
//   1. sets every role and page token, and
//   2. maps each --x- one-off to the role it is closest to in the DARK palette
//      (so a dark panel stays a panel and a red warning stays red), computed,
//      never hand-listed: a new one-off colour can never be left un-themed.
//
// It also measures contrast: in every theme, body text, dimmed text and each
// accent used as text must reach 4.5:1 on that theme's surfaces, and text on
// an accent button (the theme's --c-bg on the accent) 4.5:1 as well. It exits 1
// if a palette falls short, or (--check) if app/themes.css is stale.
//
// Run: node scripts/generate-theme-css.mjs [--check]

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const GLOBALS = join(root, 'app/globals.css');
const OUT = join(root, 'app/themes.css');

// The roles every theme sets. `bg`... are the --c- roles; page* are the older tokens.
export const THEMES = {
  light: {
    label: 'Light', scheme: 'light',
    c: { bg: '#fbfbf8', deep: '#eeeee8', deep2: '#f3f3ee', line: '#d4d4cc', fg: '#1d1f2b', comment: '#8a8fa8', dim: '#4f5470',
      red: '#b4232f', purple: '#6a3db8', green: '#1b6e33', cyan: '#0a6178', orange: '#a24e00', yellow: '#7a6000', pink: '#a3245f' },
    page: { bg: '#ecece6', card: '#fbfbf8', border: '#d4d4cc', muted: '#efefe9', text: '#26283a', brand: '#1d5fbf', 'header-bg': '#dde1ea', 'header-fg': '#1d1f2b' },
  },
  candy: {
    label: 'Candy', scheme: 'light',
    c: { bg: '#fffafc', deep: '#ffe6f1', deep2: '#fff0f6', line: '#f2c4da', fg: '#3a1f45', comment: '#b993c6', dim: '#6e4580',
      red: '#b8264f', purple: '#7b3fc4', green: '#1f7a4c', cyan: '#136f8a', orange: '#a94f12', yellow: '#7d6400', pink: '#b4246f' },
    page: { bg: '#ffeef6', card: '#fffafc', border: '#f2c4da', muted: '#ffe6f1', text: '#3a1f45', brand: '#b4246f', 'header-bg': '#ffd3e7', 'header-fg': '#3a1f45' },
  },
  retro: {
    label: 'Retro arcade', scheme: 'dark',
    c: { bg: '#0c0c18', deep: '#06060d', deep2: '#090912', line: '#2c2c55', fg: '#eef2ff', comment: '#5a5fa0', dim: '#a3a9e0',
      red: '#ff4d6d', purple: '#c084fc', green: '#2bff9a', cyan: '#22d3ee', orange: '#ffa94d', yellow: '#fff27a', pink: '#ff6ec7' },
    page: { bg: '#05050b', card: '#0c0c18', border: '#2c2c55', muted: '#111124', text: '#e4e8ff', brand: '#22d3ee', 'header-bg': '#11112a', 'header-fg': '#22d3ee' },
  },
  forest: {
    label: 'Forest', scheme: 'dark',
    c: { bg: '#18271f', deep: '#0f1a14', deep2: '#132019', line: '#2f4a3b', fg: '#f2ecd9', comment: '#6f8a72', dim: '#b9c6aa',
      red: '#f08c74', purple: '#c3a3e8', green: '#9fd99a', cyan: '#8fd3c4', orange: '#ebb26b', yellow: '#ecdf94', pink: '#eaa8c0' },
    page: { bg: '#121d17', card: '#18271f', border: '#2f4a3b', muted: '#1c2d24', text: '#e6dfca', brand: '#9fd99a', 'header-bg': '#0d1611', 'header-fg': '#f2ecd9' },
  },
};

// The dark palette, to place each one-off colour by role.
const DARK = {
  bg: '#282a36', deep: '#1e1f29', deep2: '#21222c', line: '#44475a', fg: '#f8f8f2', comment: '#6272a4', dim: '#8393c4',
  red: '#ff5555', purple: '#bd93f9', green: '#50fa7b', cyan: '#8be9fd', orange: '#ffb86c', yellow: '#f1fa8c', pink: '#ff79c6',
};

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
function lum(h) { const [r, g, b] = hex2rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
export function contrast(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }
function lab(h) {
  const [r, g, b] = hex2rgb(h).map(lin);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
export function nearestRole(h) {
  const a = lab(h);
  let best = null, bd = Infinity;
  for (const [role, v] of Object.entries(DARK)) {
    const b = lab(v);
    const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    if (d < bd) { bd = d; best = role; }
  }
  return best;
}

const globals = readFileSync(GLOBALS, 'utf8');
const oneOffs = [...new Set([...globals.matchAll(/--x-([0-9a-f]{6}):/g)].map((m) => m[1]))].sort();

// ---- contrast ----
const problems = [];
for (const [id, t] of Object.entries(THEMES)) {
  const surfaces = { bg: t.c.bg, deep: t.c.deep, deep2: t.c.deep2, card: t.page.card, page: t.page.bg };
  const texts = { fg: t.c.fg, dim: t.c.dim, text: t.page.text, red: t.c.red, purple: t.c.purple, green: t.c.green, cyan: t.c.cyan, orange: t.c.orange, yellow: t.c.yellow, pink: t.c.pink, brand: t.page.brand };
  for (const [tn, tc] of Object.entries(texts)) {
    for (const [sn, sc] of Object.entries(surfaces)) {
      const r = contrast(tc, sc);
      if (r < 4.5) problems.push(`${id}: ${tn} ${tc} on ${sn} ${sc} is ${r.toFixed(2)}:1 (needs 4.5)`);
    }
  }
  {
    const r = contrast(t.page['header-fg'], t.page['header-bg']);
    if (r < 4.5) problems.push(`${id}: header text on header is ${r.toFixed(2)}:1 (needs 4.5)`);
  }
  for (const acc of ['red', 'purple', 'green', 'cyan', 'orange', 'pink']) {
    const r = contrast(t.c.bg, t.c[acc]);
    if (r < 4.5) problems.push(`${id}: button text ${t.c.bg} on ${acc} ${t.c[acc]} is ${r.toFixed(2)}:1 (needs 4.5)`);
  }
}

// ---- css ----
let css = `/* GENERATED by scripts/generate-theme-css.mjs -- edit the palettes there.
   The dark theme is :root in app/globals.css. Each block below re-points every
   colour variable; a --x- one-off follows the role it is nearest to in the dark
   palette. html[data-theme] is set before first paint (app/layout.tsx). */
`;
for (const [id, t] of Object.entries(THEMES)) {
  css += `\nhtml[data-theme="${id}"] {\n  color-scheme: ${t.scheme};\n`;
  for (const [k, v] of Object.entries(t.page)) css += `  --${k}: ${v};\n`;
  for (const [k, v] of Object.entries(t.c)) css += `  --c-${k}: ${v};\n`;
  for (const h of oneOffs) css += `  --x-${h}: var(--c-${nearestRole('#' + h)});\n`;
  css += '}\n';
}

if (problems.length) {
  console.error('[themes] contrast too low:\n  ' + problems.join('\n  '));
  process.exit(1);
}
if (process.argv.includes('--check')) {
  if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== css) {
    console.error('[themes] app/themes.css is stale: run node scripts/generate-theme-css.mjs');
    process.exit(1);
  }
  console.log(`[themes] up to date: ${Object.keys(THEMES).length} themes, ${oneOffs.length} one-off colours mapped, contrast OK`);
} else {
  writeFileSync(OUT, css);
  console.log(`[themes] wrote app/themes.css: ${Object.keys(THEMES).length} themes, ${oneOffs.length} one-off colours mapped, contrast OK`);
}
