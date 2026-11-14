// shCode's in-app moSHion docs (lib/moshion-docs.ts) and the moshion repo's own docs site
// (docs/data/moshion-docs.js on origin/main) are written separately but describe the SAME
// engine. They were reconciled once; this reports when a shared page has drifted apart again.
//
//   node --import ./scripts/register-ts.mjs scripts/check-moshion-docs-drift.mjs
//
// It never fails (exit 0): the two repos are pushed separately, so a difference is a to-do,
// not a broken build. `sync-moshion --check` runs it, so `npm run deploy` prints it.
//
// What counts as the same page: same section title, same page title, same body and code after
// shCode's one path (/moshion/assets/ -> assets/) is mapped. Differences that are on purpose
// are listed in scripts/moshion-docs-divergence.json with the reason, and are not reported:
//   different   pages whose text is meant to differ (shCode's texture editor, Library, asset paths)
//   shCodeOnly  pages only the course site has (its own colour helper, accounts); shCodeOnlySections: whole sections
//   moshionOnly pages only the engine's site has
// A listed page that no longer differs is reported too, so the list shrinks when it can.

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { sections } from '../lib/moshion-docs.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const upstream = resolve(process.env.MOSHION_DIR || join(root, '..', 'moshion'));
const allow = JSON.parse(readFileSync(join(root, 'scripts/moshion-docs-divergence.json'), 'utf8'));

const r = spawnSync('git', ['-C', upstream, 'show', 'origin/main:docs/data/moshion-docs.js'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
if (r.status !== 0) {
  console.log(`[docs-drift] could not read the moshion repo's docs (${upstream}); not checked.`);
  process.exit(0);
}
const ctx = { window: {} };
vm.runInNewContext(r.stdout, ctx);
const theirs = ctx.window.MOSHION_DOCS;

const fix = (t) => (t || '').replaceAll('/moshion/assets/', 'assets/');
const key = (s, p) => `${s}|${p}`;
const ours = new Map();
for (const s of sections) for (const p of s.pages) ours.set(key(s.title, p.title), p);
const them = new Map();
for (const s of theirs) for (const p of s.pages) them.set(key(s.title, p.title), p);

const diff = [], onlyOurs = [], onlyTheirs = [], staleAllow = [];
const names = { different: new Set(allow.different), shCodeOnly: new Set(allow.shCodeOnly), moshionOnly: new Set(allow.moshionOnly) };
for (const [k, p] of ours) {
  const q = them.get(k);
  if (!q) { if (allow.shCodeOnlySections.includes(k.split('|')[0])) continue; if (!names.shCodeOnly.has(k)) onlyOurs.push(k); else names.shCodeOnly.delete(k); continue; }
  const same = fix(p.body) === q.body && fix(p.code) === (q.code || '');
  if (!same) { if (!names.different.has(k)) diff.push(k); else names.different.delete(k); }
}
for (const k of them.keys()) if (!ours.has(k)) { if (!names.moshionOnly.has(k)) onlyTheirs.push(k); else names.moshionOnly.delete(k); }
for (const [list, set] of Object.entries(names)) for (const k of set) staleAllow.push(`${list}: ${k}`);

let bad = 0;
const show = (title, list) => { if (list.length) { bad += list.length; console.log(`[docs-drift] ${title}:\n  ${list.join('\n  ')}`); } };
show('pages that differ between shCode and the moshion repo (bring them together, or list them with a reason)', diff);
show('pages only in shCode (copy to the moshion repo, or list them as shCodeOnly)', onlyOurs);
show('pages only in the moshion repo (copy to shCode, or list them as moshionOnly)', onlyTheirs);
show('listed in moshion-docs-divergence.json but no longer true (remove them)', staleAllow);
console.log(bad ? `[docs-drift] ${bad} item(s) to reconcile. Edit lib/moshion-docs.ts and the moshion repo's docs/data/moshion-docs.js.`
  : `[docs-drift] the two docs sets agree (${ours.size} shCode pages, ${them.size} moshion pages, ${allow.different.length} on-purpose differences).`);
process.exit(0);
