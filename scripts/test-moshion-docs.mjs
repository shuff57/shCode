// The in-app moSHion docs hold together:
//   1. lib/moshion-docs.ts assembles (the shared pages from the moshion repo plus
//      shCode's own, lib/moshion-docs-shcode.ts) and every page has an id that is
//      unique in its section;
//   2. every override of a shared page was written against the page as it is now
//      (`basedOn`), so a change upstream is read again here instead of being
//      silently covered over;
//   3. every link to /docs/moshion/... in the course (lessons, curriculum,
//      components, lib, app) names a section that exists and, with ?page=, a page
//      id in it. Page NUMBERS are refused: they moved whenever a page was added,
//      which is how three lesson links came to open the wrong page.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-moshion-docs.mjs   (in npm test)

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sections, applyOverride, localizePaths } from '../lib/moshion-docs.ts';
import { sharedSections } from '../lib/moshion-docs-shared.generated.ts';
import { overrides } from '../lib/moshion-docs-shcode.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
function check(name, fn) {
  try { fn(); console.log(`  ok  ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}\n      ${e.message}`); }
}

check('every section slug and page id is unique and well formed', () => {
  const slugs = new Set();
  for (const s of sections) {
    assert.ok(!slugs.has(s.slug), `two sections are called ${s.slug}`);
    slugs.add(s.slug);
    const ids = new Set();
    for (const p of s.pages) {
      assert.match(p.id || '', /^[a-z][a-z0-9-]*$/, `${s.slug}: "${p.title}" has no id`);
      assert.ok(!ids.has(p.id), `${s.slug}/${p.id} is used twice`);
      ids.add(p.id);
      assert.ok(p.title && p.body, `${s.slug}/${p.id} needs a title and a body`);
    }
  }
});

check("every override was written against the shared page as it is now", () => {
  const sha = (t) => createHash('sha1').update(t).digest('hex').slice(0, 10);
  const stale = [];
  for (const o of overrides) {
    const page = sharedSections.find((s) => s.slug === o.section)?.pages.find((p) => p.id === o.page);
    assert.ok(page, `override for ${o.section}/${o.page}: the moshion repo has no such page`);
    assert.ok(o.why, `override for ${o.section}/${o.page} needs a why`);
    if (sha(page.body) !== o.basedOn) stale.push(`${o.section}/${o.page} (now ${sha(page.body)})`);
    applyOverride(page, o); // throws if a swapped paragraph is gone
  }
  assert.deepEqual(stale, [], `the moshion repo changed these pages; re-read each override in lib/moshion-docs-shcode.ts against the new text, then set basedOn: ${stale.join(', ')}`);
});

check('shared examples load their files from /moshion/assets/', () => {
  assert.equal(localizePaths("loadSound('assets/coin.wav')"), "loadSound('/moshion/assets/coin.wav')");
  assert.equal(localizePaths('"assets/a.png" `assets/b.png`'), '"/moshion/assets/a.png" `/moshion/assets/b.png`');
  assert.equal(localizePaths('my_assets/x and /moshion/assets/y'), 'my_assets/x and /moshion/assets/y');
  for (const s of sections) for (const p of s.pages) {
    assert.ok(!/(['"`(])assets\//.test(p.code || ''), `${s.slug}/${p.id}: an example still loads from assets/`);
  }
});

check('no example reads keys or moves sprites in draw() (the rules go in update())', () => {
  const LOGIC = /\bkb\.\w+\(|\bmouse\.(presses|pressing|released|pressed)\(|\.vel\.[xy]\s*[-+*]?=|\.vel\s*=|\bonline\.(send|host|join)\(/;
  const bad = [];
  for (const s of sections) for (const p of s.pages) {
    const m = p.code && /function draw\(\)\s*\{([\s\S]*?)\n\}/.exec(p.code);
    if (m && LOGIC.test(m[1])) bad.push(`${s.slug}/${p.id}`);
  }
  assert.deepEqual(bad, []);
});

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(json|md|ts|tsx|mjs|js)$/.test(name) && !name.endsWith('.generated.ts')) out.push(p);
  }
  return out;
}

check('every /docs/moshion link in the course opens a page that exists', () => {
  const bad = [];
  let n = 0;
  for (const dir of ['lessons', 'curriculum', 'components', 'lib', 'app']) {
    for (const f of walk(join(root, dir))) {
      const text = readFileSync(f, 'utf8');
      for (const m of text.matchAll(/\/docs\/moshion\/([a-z][a-z0-9-]*)(?:\?page=([a-z0-9-]+))?/g)) {
        n++;
        const where = `${relative(root, f)}: ${m[0]}`;
        const sec = sections.find((s) => s.slug === m[1]);
        if (!sec) { bad.push(`${where} (no section ${m[1]})`); continue; }
        if (m[2] === undefined) continue;
        if (/^\d+$/.test(m[2])) { bad.push(`${where} (a page number; use the page's id)`); continue; }
        if (!sec.pages.some((p) => p.id === m[2])) bad.push(`${where} (no page ${m[2]} in ${m[1]})`);
      }
    }
  }
  assert.ok(n > 30, `found only ${n} docs links; is the scan looking in the right place?`);
  assert.deepEqual(bad, []);
});

if (failed) { console.log(`\nmoshion docs: ${failed} check(s) failed`); process.exit(1); }
console.log('\nmoshion docs tests passed');
