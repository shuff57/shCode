#!/usr/bin/env node
// What is actually inside the OpenCascade wasm, and what could come out.
//
// Step one of pricing a custom binding build: before spending a day on a
// toolchain, find out whether there is anything worth removing. No emscripten
// needed -- the section layout and the RTTI strings are readable from the file.
//
//   node scripts/inspect-occt-wasm.mjs <path to replicad_single.wasm>
//
// MEASURED 2026-09-02 on replicad-opencascadejs (21.91 MB, 6.87 MB gzipped):
//
//   code section   19.29 MB   88.0%
//   data section    2.52 MB   11.5%
//   name section    STRIPPED, so per-function attribution is not available
//
// 3287 distinct Package_Class identifiers across the file. Bucketed against the
// 50 OpenCascade classes lib/occt-*.ts actually call:
//
//   reachable from our calls    935   28.4%
//   provably dead               965   29.4%
//   unclassified               1387   42.2%   (much of it STEP schema strings)
//
// THE FINDING: the entire STEP data-exchange stack is linked in and we call
// none of it. StepBasic alone appears 299 times, and the binary carries 1253
// distinct ISO 10303 schema entity names -- AUTOMOTIVE_DESIGN,
// AP242_MANAGED_MODEL_BASED_3D_ENGINEERING_MIM_LF, MODIFIED_GEOMETRIC_TOLERANCE
// -- which is the full AP203/AP214/AP242 schema plus its read/write drivers.
// replicad ships it because a CAD app imports STEP files. reSHape does not.
//
// Already absent, so NOT available as a saving: visualisation (Graphic3d,
// OpenGl, AIS, V3d, Prs3d all zero) and IGES. Whoever built this had already
// trimmed those, which is worth knowing before assuming a naive rebuild wins
// big everywhere.
//
// CAVEAT, and it matters: an identifier count is a PROXY for code size, not a
// measurement of it. The name section is stripped, so bytes cannot be
// attributed to packages without rebuilding. What this establishes is that a
// large, clearly-identifiable, definitely-unused subsystem exists -- which is
// the question step one was asked to answer, and the reason step two is worth
// doing.
import { readFileSync } from 'fs';

const path = process.argv[2];
const buf = readFileSync(path);
console.log(`${path}\n${(buf.length / 1048576).toFixed(2)} MB\n`);

let p = 0;
const u8 = () => buf[p++];
const u32 = () => { const v = buf.readUInt32LE(p); p += 4; return v; };
function leb() {
  let r = 0, s = 0, b;
  do { b = buf[p++]; r |= (b & 0x7f) << s; s += 7; } while (b & 0x80);
  return r >>> 0;
}

if (u32() !== 0x6d736100) { console.log('not a wasm file'); process.exit(1); }
console.log('wasm version', u32());

const SECTION = ['custom', 'type', 'import', 'function', 'table', 'memory', 'global',
  'export', 'start', 'element', 'code', 'data', 'datacount'];

const sections = [];
let codeStart = 0, codeEnd = 0;
let nameSection = null;
while (p < buf.length) {
  const id = u8();
  const size = leb();
  const start = p;
  let label = SECTION[id] || ('id' + id);
  if (id === 0) {
    const save = p;
    const n = leb();
    const nm = buf.slice(p, p + n).toString('utf8');
    p += n;
    label = 'custom:' + nm;
    if (nm === 'name') nameSection = { start: p, end: start + size };
    p = save;
  }
  if (id === 10) { codeStart = start; codeEnd = start + size; }
  sections.push([label, size]);
  p = start + size;
}

console.log('\n--- sections, largest first ---');
for (const [label, size] of [...sections].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log('  ' + (size / 1048576).toFixed(2).padStart(7) + ' MB  '
    + ((size / buf.length) * 100).toFixed(1).padStart(5) + '%  ' + label);
}

console.log('\n--- name section? ---');
console.log(nameSection ? `yes, ${nameSection.end - nameSection.start} bytes`
  : 'NO — stripped, so per-function attribution is not available');

// ---- fall back to strings: OCCT RTTI and type names live in the data section
// as Package_Class identifiers, and the PACKAGE prefix is what maps to a
// toolkit. Counting distinct classes per package is a proxy for how much of
// each OCCT module got linked in.
const text = buf.toString('latin1');
const rx = /\b([A-Z][A-Za-z0-9]{1,20})_([A-Za-z][A-Za-z0-9_]{1,40})\b/g;
const byPkg = new Map();
let m;
while ((m = rx.exec(text))) {
  const pkg = m[1];
  if (!byPkg.has(pkg)) byPkg.set(pkg, new Set());
  byPkg.get(pkg).add(m[2]);
}
const rows = [...byPkg.entries()]
  .filter(([, s]) => s.size >= 4)
  .sort((a, b) => b[1].size - a[1].size);
console.log(`\n--- OCCT packages present (${rows.length} with 4+ distinct classes) ---`);
for (const [pkg, s] of rows.slice(0, 45)) {
  console.log('  ' + String(s.size).padStart(5) + '  ' + pkg);
}
console.log('\ntotal distinct Package_Class identifiers: '
  + rows.reduce((n, [, s]) => n + s.size, 0));
