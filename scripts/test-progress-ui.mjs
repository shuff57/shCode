// Guards three small UI rules from the 2026-10 live check: the lock rule that lets a locked lesson skip
// its mark-started POST (lib/lesson-lock.ts), the practice wording in the teacher's student drawer, and
// the layout rules that keep /progress from scrolling sideways on a phone. The layout and drawer checks
// are source assertions (the real measurement is a browser run); they pin the lines that fixed it.
import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-progress-ui-'));
let failures = 0;
const check = (name, actual, expected) => {
  if (actual === expected) return;
  failures++;
  console.error(`  FAIL ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};
const src = (f) => readFileSync(path.join(root, f), 'utf8');

try {
  execFileSync(process.execPath, [path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), 'lib/lesson-lock.ts', 'lib/up-next.ts',
    '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck'], { cwd: root, stdio: 'inherit' });
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const { isSequenceLocked } = createRequire(import.meta.url)(path.join(out, 'lesson-lock.js'));

  const { pickUpNext } = createRequire(import.meta.url)(path.join(out, 'up-next.js'));
  const ids = (xs) => xs.map((l) => l.id).join(',');
  const course = 'abcdefghij'.split('').map((id) => ({ id, graded: 'bdfhj'.includes(id) }));
  const isGraded = (l) => l.graded;
  check('up next skips a lesson skipped long ago', ids(pickUpNext(course, { c: 'completed' }, isGraded, 3)), 'd,f,h');
  check('up next tops up with non-graded ones in course order', ids(pickUpNext(course, { g: 'completed' }, isGraded, 5)), 'h,i,j');
  check('up next keeps a started lesson ahead and fills with it after the graded ones', ids(pickUpNext(course, { b: 'completed', c: 'started' }, isGraded, 5)), 'c,d,f,h,j');
  check('up next with nothing completed starts at the beginning', ids(pickUpNext(course, {}, isGraded, 3)), 'b,d,f');
  check('up next falls back to the earliest not started when nothing lies beyond', ids(pickUpNext(course, { j: 'completed' }, isGraded, 3)), 'a,b,c');
  check('up next is deterministic', ids(pickUpNext(course, { c: 'completed' }, isGraded)), ids(pickUpNext(course, { c: 'completed' }, isGraded)));
  check('up next is empty when everything is done', pickUpNext(course.slice(0, 2), { a: 'completed', b: 'completed' }, isGraded).length, 0);

  const mod = ['a', 'b', 'c'];
  check('first lesson is never locked', isSequenceLocked(mod, 'a', {}, 'student'), false);
  check('second lesson locked until the first is done', isSequenceLocked(mod, 'b', {}, 'student'), true);
  check('started is not done', isSequenceLocked(mod, 'b', { a: 'started' }, 'student'), true);
  check('second lesson open once the first is completed', isSequenceLocked(mod, 'b', { a: 'completed' }, 'student'), false);
  check('third lesson needs both', isSequenceLocked(mod, 'c', { a: 'completed' }, 'student'), true);
  check('teacher bypasses', isSequenceLocked(mod, 'c', {}, 'teacher'), false);
  check('admin bypasses', isSequenceLocked(mod, 'c', {}, 'admin'), false);
  check('a lesson outside the module is open', isSequenceLocked(mod, 'z', {}, 'student'), false);

  // progress.ts must consult the rule before posting, and the footer must hand it the module.
  check('recordLessonStarted skips a locked lesson', /isSequenceLocked\(siblingIds, lessonId, cache\.states, cache\.role\)\) return/.test(src('lib/progress.ts')), true);
  check('the footer no longer posts started itself', src('components/LessonProgressFooter.tsx').includes('recordLessonStarted('), false);
  const ms = src('components/MarkStarted.tsx');
  check('MarkStarted waits for the due-dates snapshot', /dues\.loaded && snap\.loaded/.test(ms) && /if \(!ready \|\| !open\) return/.test(ms), true);
  check('MarkStarted hands recordLessonStarted the module', /recordLessonStarted\(lessonId, siblings\)/.test(ms), true);
  const gate = src('components/LessonAccessGate.tsx');
  check('the gate mounts MarkStarted only on its open branches', (gate.match(/return open;/g) || []).length === 3 && /<MarkStarted /.test(gate), true);
  check('children are never returned bare', /return <>\{children\}<\/>/.test(gate), false);

  // Teacher drawer: same practice rule as the grid, no points value.
  const teacher = src('app/teacher/page.tsx');
  check('drawer uses practiceDisplay', /practiceDisplay\(\s*lessonGradeCategory/.test(teacher), true);
  check('drawer label', teacher.includes('practice (not graded)') && /Done \{'\\u00b7'\} practice \(not graded\)/.test(teacher), true);
  check('drawer hides points for practice', /ls\?\.state === 'completed' && !practice && ls\.score !== null/.test(teacher), true);
  check('grid tooltip drops the latest-try number for practice', /if \(graded && cell && cell\.possible/.test(teacher), true);

  // Layout: the page container and the table box must be allowed to shrink.
  const page = src('app/progress/page.tsx');
  check('progress container can shrink', /width: '100%',\s*minWidth: 0,/.test(page), true);
  const gb = src('components/StudentGradebook.tsx');
  check('table scrolls inside its own box', /overflowX: 'auto',\s*minWidth: 0,\s*maxWidth: '100%'/.test(gb), true);
  check('practice tag keeps its full text and a short form', gb.includes('gb-practice-full') && gb.includes('gb-practice-short'), true);
  const css = src('app/globals.css');
  check('short practice tag rule at phone width', /@media \(max-width: 480px\)\s*\{\s*\.gb-practice-short/.test(css), true);
} finally {
  rmSync(out, { recursive: true, force: true });
}
if (failures > 0) { console.error(`\ntest-progress-ui: ${failures} failure(s)`); process.exit(1); }
console.log('test-progress-ui: all checks passed');
