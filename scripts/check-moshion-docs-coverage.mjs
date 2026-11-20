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
// What this guards since the reference became generated: that no name reaches students with
// nothing but its name. The moshion repo's tests/docs-build.spec.mjs checks the reference
// LISTS every name; this checks each one is EXPLAINED.
//
// Run: node --import ./scripts/register-ts.mjs scripts/check-moshion-docs-coverage.mjs

import { sections } from '../lib/moshion-docs.ts';
import { MOSHION_GLOBALS, MOSHION_MEMBERS } from '../lib/moshion-completions.generated.ts';


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

if (undocumented.length) {
  console.error(`FAIL: ${undocumented.length} moSHion name(s) in the typings are explained nowhere in the docs:\n  ${undocumented.join('\n  ')}\nGive each a doc comment in moshion.d.ts or a sentence on a docs page (both in the moshion repo), then sync.`);
  process.exit(1);
}
console.log(`moshion docs coverage: ${documented.size}/${documented.size} names explained`);
