// Does anything a user can touch actually reach the code we wrote?
//
// A feature can be authored, typechecked, covered by browser checks, and
// reachable by nobody. This repo's CLAUDE.md warns about exactly that for
// `steps` and `aiGrader.prompt`, both of which sat in lesson.json for months
// with no live renderer.
//
// It happened again on 2026-08-24, twice in one commit:
//
//   - The teacher gates. migrations/0016 + two routes + lib/lesson-mode.ts +
//     14 offline assertions + 9 browser checks — and the POST route that SETS
//     a gate had no caller anywhere. A teacher could not set one. The browser
//     checks passed because a dev stub in server.js was the only writer, which
//     made the feature look wired from inside the tests.
//   - /portable shipped unreachable in the same commit, carrying a header
//     comment describing three ways to arrive, none of which existed.
//
// Neither `npm test`, `tsc`, nor a browser gate driving the read path can see
// this. Only asking "who calls it" can.

import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Directories a human-facing caller could live in. Deliberately excludes
// scripts/ and functions/ — a route calling itself is not reachability.
const UI_DIRS = ['app', 'components', 'lib'];

function walk(dir) {
  const out = [];
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    if (e === 'node_modules' || e.startsWith('.')) continue;
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|mjs|jsx?)$/.test(p)) out.push(p);
  }
  return out;
}

const files = UI_DIRS.flatMap((d) => walk(path.join(root, d)));
const corpus = files.map((f) => ({ f, src: readFileSync(f, 'utf8') }));

// Each rule: something that exists, and the string proving a user can reach it.
const RULES = [
  {
    what: 'the teacher gate WRITE route',
    exists: 'functions/api/classes/[id]/lesson-modes.ts',
    // A caller that is not the component under test — the read path in the
    // sandbox does not make the write path reachable.
    needle: 'lesson-modes',
    excluding: ['components/SandboxWorkspace.tsx'],
    fix: 'a teacher-facing control must POST to it; see components/LessonModeControl.tsx',
  },
  {
    what: 'the teacher gate control',
    exists: 'components/LessonModeControl.tsx',
    // The JSX, not the name: an unused import satisfies a name search, and an
    // imported-but-never-rendered component is exactly the wired-to-nothing
    // case. Measured — the first version of this rule passed with the element
    // deleted and the import left behind.
    needle: '<LessonModeControl',
    excluding: ['components/LessonModeControl.tsx'],
    fix: 'mount it on the teacher class page, or a teacher cannot set a gate',
  },
  {
    what: "the student's own gradebook",
    exists: 'app/progress/page.tsx',
    // href="/progress", not "/progress": a dozen files import '../lib/progress'
    // and that substring alone would let this rule pass with no link anywhere.
    // Which is how it shipped — StudentGradebook, the due column and the
    // teacher-feedback expander all rendered on a page nothing navigated to.
    needle: 'href="/progress"',
    excluding: ['app/progress/page.tsx'],
    fix: 'students need a Progress link in components/HeaderNav.tsx or they cannot see a grade',
  },
  {
    what: 'the sandbox',
    exists: 'components/SandboxWorkspace.tsx',
    needle: '/sandbox',
    excluding: ['components/SandboxWorkspace.tsx'],
    fix: 'it needs a nav link or nothing opens it',
  },
];

let failed = 0;
for (const r of RULES) {
  const hits = corpus.filter(
    ({ f, src }) =>
      src.includes(r.needle) &&
      !r.excluding.some((x) => f.endsWith(x.split('/').join(path.sep)))
  );
  if (hits.length === 0) {
    console.log(`  FAIL  ${r.what} is unreachable`);
    console.log(`        ${r.exists} exists, but nothing outside it names "${r.needle}"`);
    console.log(`        ${r.fix}`);
    failed++;
  } else {
    const via = hits.map((h) => path.relative(root, h.f).split(path.sep).join('/'));
    console.log(`  PASS  ${r.what} <- ${via.slice(0, 2).join(', ')}${via.length > 2 ? ` +${via.length - 2}` : ''}`);
  }
}

console.log(failed ? `\nFAIL  (${failed} unreachable)` : '\nALL PASS  (reachability)');
process.exit(failed ? 1 : 0);
