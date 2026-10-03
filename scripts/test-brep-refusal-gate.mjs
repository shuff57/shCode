// Mutation test for scripts/check-reshape-solutions.mjs's brep-rs pass.
//
// That checker once printed PASS for 8.1.11 while the browser's kernel
// (brep-rs) refused its round-after-hollow, because it only built on OCCT.
// This proves the brep-rs half can still SEE that class of refusal: a known-bad
// script must come back refused, a known-good one clean. If the bad one ever
// stops being refused, either the kernel learned to do it (good: delete the
// docs warning and this case) or the pass went blind (bad).
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const K = path.join(root, 'public/reshape/kernel');
if (!existsSync(path.join(K, 'brep-rs/brep_rs.js'))) {
  console.error('public/reshape/kernel is not built -- run node scripts/build-brep-kernel.mjs');
  process.exit(1);
}
const { runScript } = await import(pathToFileURL(path.join(K, 'reshape-script.js')).href);
const brep = await import(pathToFileURL(path.join(K, 'brep-rs/brep_rs.js')).href);
brep.initSync({ module: readFileSync(path.join(K, 'brep-rs/brep_rs_bg.wasm')) });

const refused = (code) => {
  const r = runScript(code);
  if (r.errors?.length) throw new Error(`script error: ${r.errors[0].message}`);
  return Object.keys(JSON.parse(brep.build_doc_json(JSON.stringify(r.doc))).refusals ?? {});
};

const cases = [
  ['round after hollow is refused', "const b = box(80, 50, 20)\nhollow(b, { wall: 2.5, open: 'top' })\nround(b.edge('front', 'right'), 3)", true],
  ['hollow after round is refused', "const b = box(80, 50, 20)\nround(b.edge('front', 'right'), 3)\nhollow(b, { wall: 2.5, open: 'top' })", true],
  ['hollow then hole is accepted', "const b = box(80, 50, 20)\nhollow(b, { wall: 2.5, open: 'top' })\nhole(b, { across: 12 })", false],
];
let bad = 0;
for (const [name, code, want] of cases) {
  const got = refused(code).length > 0;
  const ok = got === want;
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
}
process.exit(bad ? 1 : 0);
