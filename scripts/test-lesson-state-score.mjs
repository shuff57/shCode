#!/usr/bin/env node
// Drives the REAL POST /api/lesson-state/[lessonId] against sqlite (every migration applied) to prove
// the best-of rule for UNCAPPED lessons: a weaker later pass never lowers a stored score, a stronger
// one raises it, a missing score never erases one, a teacher override and the reset flows still work,
// and a capped part is unchanged. Run: node scripts/test-lesson-state-score.mjs
import { compileHandler, makeD1, root } from './_d1-sqlite.mjs';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const h = compileHandler('api/lesson-state/[lessonId].ts', join(root, '.tmp-lesson-state-test'));
const capsSrc = readFileSync(join(root, 'functions/_shared/pa-pseudocode.generated.ts'), 'utf8');
const CAPPED = /ATTEMPT_CAPS[^{]*\{\s*(?:\/\/[^\n]*\n\s*)*'?"?([\w.-]+)"?'?\s*:/.exec(capsSrc)?.[1];
if (!CAPPED) throw new Error('no capped lesson found');
const FREE = '1-1-1-uncapped-test-lesson';

let n = 0;
function check(name, got, want) {
  if (JSON.stringify(got) === JSON.stringify(want)) { n++; console.log(`PASS  ${n}  ${name}`); }
  else { console.error(`FAIL: ${name} -- got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); process.exitCode = 1; }
}

const db = makeD1();
const E = 'kid@example.invalid';
const ASSETS = { fetch: async () => new Response('{}', { status: 404 }) };
async function post(lessonId, body, role = 'student') {
  const res = await h.onRequestPost({
    request: new Request(`http://x.invalid/api/lesson-state/${lessonId}`, { method: 'POST', body: JSON.stringify(body) }),
    env: { DB: db, ASSETS }, data: { email: E, role }, params: { lessonId },
  });
  return res.status;
}
const row = (id) => db.sqlite.prepare('SELECT state, score, score_override FROM lesson_state WHERE student_email=? AND lesson_id=?').get(E, id);

check('first pass stores 8', [await post(FREE, { state: 'completed', score: 8 }), row(FREE).score], [200, 8]);
check('weaker later pass keeps 8', [await post(FREE, { state: 'completed', score: 5 }), row(FREE).score], [200, 8]);
check('stronger pass raises to 10', [await post(FREE, { state: 'completed', score: 10 }), row(FREE).score], [200, 10]);
check('completion with no score never erases', [await post(FREE, { state: 'completed' }), row(FREE).score], [200, 10]);
check('explicit null never erases', [await post(FREE, { state: 'completed', score: null }), row(FREE).score], [200, 10]);
check('a score of 0 does not lower it', [await post(FREE, { state: 'completed', score: 0 }), row(FREE).score], [200, 10]);
check('negative score refused', await post(FREE, { state: 'completed', score: -1 }), 400);
check('NaN-ish string refused', await post(FREE, { state: 'completed', score: 'x' }), 400);
check('above the 100000 bound refused', await post(FREE, { state: 'completed', score: 100001 }), 400);
check('refusals changed nothing', row(FREE).score, 10);

// teacher override is separate and wins
db.sqlite.prepare('UPDATE lesson_state SET score_override = 3, score = 3 WHERE student_email=? AND lesson_id=?').run(E, FREE);
check('override wins over a higher pass', [await post(FREE, { state: 'completed', score: 9 }), row(FREE).score, row(FREE).score_override], [200, 3, 3]);

// the reset flows write score = NULL (lesson-unsubmit, tries-reset): next completion starts fresh
db.sqlite.prepare("UPDATE lesson_state SET state='started', completed_at=NULL, score=NULL, score_override=NULL WHERE student_email=? AND lesson_id=?").run(E, FREE);
check('after a teacher reset a lower score is accepted', [await post(FREE, { state: 'completed', score: 4 }), row(FREE).score], [200, 4]);

// student DELETE (reading reset) removes the row, so the next completion is fresh too
const del = await h.onRequestDelete({
  request: new Request(`http://x.invalid/api/lesson-state/${FREE}`, { method: 'DELETE' }),
  env: { DB: db, ASSETS }, data: { email: E, role: 'student' }, params: { lessonId: FREE },
});
check('delete then complete starts fresh', [del.status, await post(FREE, { state: 'completed', score: 2 }), row(FREE).score], [200, 200, 2]);

// 'started' stays sticky and does not touch a score
await post(FREE, { state: 'started' });
check('started after completed is a no-op', row(FREE), { state: 'completed', score: 2, score_override: null });

// a capped part: the browser's score is ignored; needs a hand-in first (unchanged behaviour)
check('capped: no hand-in is refused', await post(CAPPED, { state: 'completed', score: 5 }), 409);
check('capped: staff preview stores 0, ignoring the browser score', [await post(CAPPED, { state: 'completed', score: 99 }, 'teacher'), row(CAPPED).score], [200, 0]);
console.log(`test-lesson-state-score: ${n} checks`);
rmSync(join(root, '.tmp-lesson-state-test'), { recursive: true, force: true });
