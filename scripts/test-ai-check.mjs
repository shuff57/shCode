// The "Grade with AI" button's pure halves (lib/ai-check.ts): turning the grader's criteria into
// verdicts, laying them over the Quest cards, and what Submit records. Also measures that the
// lessons carrying `aiCheck` are wired: every rubric id is a requirement id, the server has the
// grader (functions/_shared/ai-graders.generated.ts), and the lesson is NOT an `aiGrader` lesson
// (that field makes it a scored written part everywhere).
// Run: node --import ./scripts/register-ts.mjs scripts/test-ai-check.mjs

import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { applyAiVerdicts, reportFromRequirements, verdictsFromCriteria } from '../lib/ai-check.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, failures = 0;
const check = (ok, msg) => { n++; if (!ok) { failures++; console.log('  FAIL  ' + msg); } };

const reqs = ['r1', 'r2', 'r3'].map((id) => ({ id, title: id, description: '', status: 'failed', messages: ['regex says no'] }));

// verdicts: only a clear "met" is green; unknown ids and junk are ignored
const v = verdictsFromCriteria(
  [
    { id: 'r1', verdict: 'met', feedback: ' good ' },
    { id: 'r2', verdict: 'partial', feedback: 'close' },
    { id: 'r3', verdict: 'missing' },
    { id: 'zz', verdict: 'met' },
  ],
  ['r1', 'r2', 'r3'],
);
check(v.r1.passed === true && v.r1.feedback === 'good', 'met is green, feedback trimmed');
check(v.r2.passed === false && v.r3.passed === false, 'partial and missing stay red');
check(!('zz' in v), 'an id that is not a requirement is ignored');

// overlay
const out = applyAiVerdicts(reqs, v);
check(out[0].status === 'passed' && out[0].messages[0] === 'good', 'a met card turns green and shows the AI note');
check(out[1].status === 'failed' && out[1].messages[0] === 'close', 'a partial card is red with the AI note');
check(out[2].status === 'failed' && out[2].messages.length === 0, 'a missing card with no note has no message (the regex hint is replaced, not stacked)');
check(applyAiVerdicts(reqs, null) === reqs, 'no verdicts: the cards are untouched');
check(applyAiVerdicts(reqs, { r1: { passed: true, feedback: '' } })[1] === reqs[1], 'a card with no verdict keeps what it had');

// submit report
const rep = reportFromRequirements(out);
check(rep.passed === false && rep.results.length === 3 && rep.totalPossible === 0, 'report: one red card means not passed, 0-point lab');
const allGreen = applyAiVerdicts(reqs, Object.fromEntries(reqs.map((r) => [r.id, { passed: true, feedback: '' }])));
check(reportFromRequirements(allGreen).passed === true, 'report: all green is passed');
check(reportFromRequirements([]).passed === false, 'report: no cards is not passed');

// wiring of every lesson that carries aiCheck
const gen = readFileSync(path.join(root, 'functions/_shared/ai-graders.generated.ts'), 'utf8');
let labs = 0;
for (const id of readdirSync(path.join(root, 'lessons'))) {
  const f = path.join(root, 'lessons', id, 'lesson.json');
  if (!existsSync(f)) continue;
  const l = JSON.parse(readFileSync(f, 'utf8'));
  if (!l.aiCheck) continue;
  labs++;
  const reqIds = new Set(l.requirements.map((r) => r.id));
  check(!l.aiGrader && !(l.diagram && l.diagram.aiGrader), `${id}: aiCheck lab must not also carry aiGrader`);
  check(l.aiCheck.rubric.every((r) => reqIds.has(r.id)), `${id}: every aiCheck rubric id is a requirement id`);
  check(l.aiCheck.rubric.length === l.requirements.length, `${id}: aiCheck covers every requirement`);
  check(typeof l.aiCheck.prompt === 'string' && l.aiCheck.prompt.length > 40, `${id}: aiCheck has a grading brief`);
  check(gen.includes(JSON.stringify(id) + ':'), `${id}: the server-side grader config was generated`);
}
check(labs >= 1, 'at least one lesson carries aiCheck');

console.log(failures ? `[test-ai-check] ${failures} FAILED of ${n}` : `[test-ai-check] ${n}/${n} checks passed`);
process.exit(failures ? 1 : 0);
