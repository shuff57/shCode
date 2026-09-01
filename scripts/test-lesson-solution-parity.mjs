// /api/lesson-solution is implemented TWICE, and the two must agree.
//
//   production  functions/api/lesson-solution/[id].ts  -> the generated map
//   dev         lib/lesson-solution-fs.mjs             -> the lessons/ tree
//                 (server.js imports that module, so this tests the real path)
//
// They drifted once already and nothing noticed. The dev side read
// lessons/<id>/solution.js and only that, so every lesson using the solution/
// DIRECTORY form -- 1.3.19, 7.1.1, 1.6.1 -- returned 404 locally while working
// in production. It surfaced only because someone opened one in a browser, and
// 1.3.19 had been broken in dev since the directory form was introduced for it.
//
// So: for EVERY lesson, ask both implementations and compare. Not a sample, and
// not just the ones with solutions -- a lesson both sides refuse is as much a
// part of the contract as one they serve.
//
// The generated map is rebuilt first, because it is a gitignored build artifact
// and the production side is meaningless if it is stale. That makes this a test
// of generator-output against the tree, which is the pipeline production
// actually runs.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import { readLessonSolution } from '../lib/lesson-solution-fs.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const lessonsRoot = path.join(root, 'lessons');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-solparity-'));

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error('  FAIL  ' + msg);
};

try {
  // The production side reads a build artifact. Rebuild it so this compares the
  // real pipeline rather than whatever happened to be on disk.
  execFileSync(process.execPath, [path.join(root, 'scripts', 'generate-solutions.mjs')], {
    cwd: root,
    stdio: 'inherit',
  });

  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'functions/api/lesson-solution/[id].ts',
      'functions/_shared/solutions.generated.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
      // functions/ has its own tsconfig (the root one excludes it) and pulls
      // the Cloudflare globals -- EventContext, PagesFunction -- from
      // @cloudflare/workers-types. Compiling with only "node" leaves them
      // unresolved.
      '--types', 'node,@cloudflare/workers-types',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  // tsc rebases --outDir on the common root of its inputs, which is functions/
  // here, not the repo root. Find the emitted handler rather than predicting
  // where it landed -- adding a third input file would move it again.
  const findEmitted = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        const hit = findEmitted(p);
        if (hit) return hit;
      } else if (e.name === '[id].js') return p;
    }
    return null;
  };
  const handlerPath = findEmitted(out);
  if (!handlerPath) throw new Error('compiled Pages Function not found under ' + out);
  const { onRequestGet } = await import('file://' + handlerPath.replace(/\\/g, '/'));

  // Call the Pages Function the way Cloudflare would, and read its Response.
  const prod = async (id, role = 'teacher') => {
    const res = await onRequestGet({ data: { email: 'dev@local', role }, params: { id } });
    return { status: res.status, body: await res.json() };
  };

  const lessonIds = readdirSync(lessonsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(path.join(lessonsRoot, e.name, 'lesson.json')))
    .map((e) => e.name)
    .sort();

  console.log(`\n=== ${lessonIds.length} lessons, both implementations ===`);

  let served = 0;
  let refused = 0;
  for (const id of lessonIds) {
    const dev = await readLessonSolution(id, lessonsRoot);
    const p = await prod(id);

    const devHas = dev !== null;
    const prodHas = p.status === 200;

    if (devHas !== prodHas) {
      fail(
        `${id}: dev ${devHas ? 'serves' : '404s'} but production ${prodHas ? 'serves' : '404s'}` +
          ' -- this is exactly the drift the gate exists for',
      );
      continue;
    }

    if (!devHas) {
      refused += 1;
      continue;
    }
    served += 1;

    const devKeys = Object.keys(dev.files).sort();
    const prodKeys = Object.keys(p.body.files).sort();
    if (devKeys.join('|') !== prodKeys.join('|')) {
      fail(`${id}: different file sets\n          dev:  ${devKeys}\n          prod: ${prodKeys}`);
      continue;
    }
    for (const k of devKeys) {
      if (dev.files[k] !== p.body.files[k]) {
        fail(`${id}: ${k} differs between dev and production`);
      }
    }
    if (dev.solution !== p.body.solution) {
      fail(`${id}: the legacy \`solution\` string differs`);
    }
  }
  console.log(`  ${served} lesson(s) served by both, ${refused} refused by both`);

  // Refusals have to match too, or a traversal closed on one side stays open on
  // the other. The dev side is the one that was traversable; production takes
  // no path from the client at all, so it should simply miss the map.
  console.log('\n=== ids that must be refused by both ===');
  const hostile = [
    '..',
    '../..',
    '../../package',
    'lessons/../package',
    '1-6-1-ch1-pa-design-chart/../../package',
    '',
    'no-such-lesson-at-all',
  ];
  for (const id of hostile) {
    const dev = await readLessonSolution(id, lessonsRoot);
    const p = await prod(id);
    const ok = dev === null && p.status !== 200;
    if (!ok) {
      fail(`${JSON.stringify(id)}: dev ${dev === null ? '404s' : 'SERVED'}, prod HTTP ${p.status}`);
    } else {
      console.log(`  ok    ${JSON.stringify(id)} refused by both`);
    }
  }

  // The one difference that is real and deliberate, asserted so it stays known
  // rather than being rediscovered: production gates on role, the dev stub does
  // not. Anyone who makes dev authoritative has to deal with this.
  console.log('\n=== the known, deliberate divergence ===');
  const asStudent = await prod('1-6-2-ch1-pa-build', 'student');
  if (asStudent.status !== 403) {
    fail(`production should 403 a student, got HTTP ${asStudent.status}`);
  } else {
    console.log('  ok    production 403s a student');
    console.log('  note  the dev server has NO role gate -- "works in dev" never');
    console.log('        exercises that check. Not a failure; recorded so it is not a surprise.');
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

console.log(
  failures === 0
    ? '\n[test-lesson-solution-parity] OK — dev and production answer identically\n'
    : `\n[test-lesson-solution-parity] ${failures} MISMATCH(ES)\n`,
);
process.exit(failures === 0 ? 0 : 1);
