// Every public moSHion name in the engine's typings must be explained somewhere in the
// in-app docs (lib/moshion-docs.ts), or be listed in the known-gaps file with a reason.
//
// Why. A feature can land in the engine without a sentence anywhere: `sprite.texture.pause()`
// shipped with no docs until someone noticed (#117).
//
// How. Names come from the generated autocomplete data (itself built from
// public/moshion/docs/moshion.d.ts). A name counts as explained when a written page uses
// it, or when its line in the generated API reference carries a description from its doc
// comment in moshion.d.ts. A reference line that says "No description yet." explains
// nothing, so a name with no page and no doc comment still FAILS: write the sentence in
// moshion.d.ts (in the moshion repo) or on a page.
// A global counts when its name appears as a whole word. A member counts when `.name` or
// `name(` appears (so a common word like "name" or "x" is not credited by prose).
// A name in the gaps file that is now documented FAILS too, so the file only shrinks.
//
// Run: node --import ./scripts/register-ts.mjs scripts/check-moshion-docs-coverage.mjs
//      ... --write-gaps   (rewrite the gaps file to the current undocumented set; review the diff)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sections } from '../lib/moshion-docs.ts';
import { MOSHION_GLOBALS, MOSHION_MEMBERS } from '../lib/moshion-completions.generated.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const GAPS = join(root, 'scripts/moshion-docs-gaps.json');

const text = sections
  .flatMap((s) => [s.title, ...s.pages.flatMap((p) => [p.title, p.body, p.code || ''])])
  .join('\n')
  .split('\n')
  .filter((line) => !line.endsWith('No description yet.'))
  .join('\n');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (re) => re.test(text);

const names = [];
for (const g of MOSHION_GLOBALS) names.push({ key: g.label, re: new RegExp(`(^|[^\\w$.])${esc(g.label)}($|[^\\w$])`) });
for (const [type, list] of Object.entries(MOSHION_MEMBERS)) {
  for (const m of list) {
    // `.name` anywhere, or `name(` for a method written bare (e.g. inside a code example).
    // An option written as `{ name: value }` counts too (hinge options, sprite options).
    names.push({ key: `${type}.${m.label}`, re: new RegExp(`\\.${esc(m.label)}($|[^\\w$])|(^|[^\\w$.])${esc(m.label)}\\(|(^|[{,])\\s*${esc(m.label)}\\s*:`, 'm') });
  }
}

// A member inherited by several types is one gap per name, not per type: collapse to the
// member name when ANY type's copy is documented (the docs write `sprite.x`, not `Sprite.x`).
const documented = new Map();
for (const n of names) {
  const short = n.key.includes('.') ? n.key.split('.').pop() : n.key;
  documented.set(short, (documented.get(short) || false) || has(n.re));
}
const undocumented = [...documented.entries()].filter(([, ok]) => !ok).map(([k]) => k).sort();

if (process.argv.includes('--write-gaps')) {
  writeFileSync(GAPS, JSON.stringify({
    note: 'moSHion names in the typings that the docs explain nowhere yet. Documenting one means deleting it here (the check fails until you do). Never add a name here to make the check pass for a NEW feature: write its docs sentence instead.',
    gaps: undocumented,
  }, null, 1) + '\n');
  console.log(`wrote ${undocumented.length} gaps to scripts/moshion-docs-gaps.json`);
  process.exit(0);
}

const known = new Set(existsSync(GAPS) ? JSON.parse(readFileSync(GAPS, 'utf8')).gaps : []);
const fresh = undocumented.filter((k) => !known.has(k));
const stale = [...known].filter((k) => !undocumented.includes(k));

let bad = false;
if (fresh.length) {
  bad = true;
  console.error(`FAIL: ${fresh.length} moSHion name(s) in the typings are explained nowhere in the docs:\n  ${fresh.join('\n  ')}\nGive each a doc comment in moshion.d.ts or a sentence on a docs page (both in the moshion repo), then sync.`);
}
if (stale.length) {
  bad = true;
  console.error(`FAIL: ${stale.length} name(s) are documented now but still in scripts/moshion-docs-gaps.json: remove them:\n  ${stale.join('\n  ')}`);
}
if (bad) process.exit(1);
console.log(`moshion docs coverage: ${documented.size - undocumented.length}/${documented.size} names documented, ${known.size} known gaps (shrink-only)`);
