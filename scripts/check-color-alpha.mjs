#!/usr/bin/env node
// Colours are CSS variables now (app/globals.css), so `color + '22'` or
// `${color}55` makes 'var(--c-green)22', which is not a colour: the browser
// drops the declaration and the badge or border silently disappears. Fading a
// colour goes through withAlpha() (lib/color-alpha.ts). This fails on the old
// pattern anywhere in components/ or app/.
// Run: node scripts/check-color-alpha.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const BAD = /\+\s*['"][0-9a-fA-F]{2}['"]|\$\{[^}]+\}[0-9a-fA-F]{2}(?=[`'" ;),])/;
const hits = [];
function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(p)) {
      readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
        if (BAD.test(line)) hits.push(`${relative(root, p)}:${i + 1}  ${line.trim().slice(0, 100)}`);
      });
    }
  }
}
walk(join(root, 'components'));
walk(join(root, 'app'));
if (hits.length) {
  console.error('[check-color-alpha] a colour is faded by appending hex digits; use withAlpha() from lib/color-alpha.ts:\n' + hits.join('\n'));
  process.exit(1);
}
console.log('[check-color-alpha] no colour + alpha-digit concatenation in components/ or app/');
