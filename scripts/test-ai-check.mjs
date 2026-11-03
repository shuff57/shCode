// The "Grade with AI" button's pure halves (lib/ai-check.ts): turning the grader's criteria into
// verdicts, laying them over the Quest cards, and what Submit records. Also measures that the
// lessons carrying `aiCheck` are wired: every rubric id is a requirement id, the server has the
// grader (functions/_shared/ai-graders.generated.ts), and the lesson is NOT an `aiGrader` lesson
// (that field makes it a scored written part everywhere).
// Run: node --import ./scripts/register-ts.mjs scripts/test-ai-check.mjs

import { readFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as aiCheckLib from '../lib/ai-check.ts';
const { applyAiVerdicts, reportFromRequirements, verdictsFromCriteria } = aiCheckLib;

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
// a scored lab keeps its points when the AI's verdicts replace the pattern check's
const scored = [
  { id: 'a', title: 'a', description: '', status: 'passed', points: 10 },
  { id: 'b', title: 'b', description: '', status: 'failed', points: 5 },
  { id: 'c', title: 'c', description: '', status: 'passed', points: 15 },
];
const sr = reportFromRequirements(scored, 20);
check(sr.totalScore === 25 && sr.totalPossible === 30, 'report: green cards earn their points');
check(sr.passed === true && sr.passingScore === 20, 'report: a scored lab passes on its passing score, not on every card');
check(reportFromRequirements(scored, 28).passed === false, 'report: below the passing score is not passed');

// The pattern-check fallback (AI unreachable) grades through the runner a plain Run of the lab uses.
// It used to call the console runner on every code lab, so a moSHion sketch with top-level sprite
// code showed "ReferenceError: Canvas is not defined" after Check and Submit locked.
const { fallbackRunner } = aiCheckLib;
check(typeof fallbackRunner === 'function', 'lib/ai-check.ts exports fallbackRunner');
if (typeof fallbackRunner === 'function') {
  check(fallbackRunner({ preview: 'moshion' }) === 'moshion', 'fallback: a moSHion lab runs in the moSHion runner');
  check(fallbackRunner({ preview: 'console' }) === 'console', 'fallback: a console lab runs in the console runner (unchanged)');
  check(fallbackRunner({ editor: 'text', preview: 'console' }) === 'grade', 'fallback: a text lab only grades the file (unchanged)');
}
{
  const lw = readFileSync(path.join(root, 'components/LessonWorkspace.tsx'), 'utf8');
  const start = lw.indexOf('const fallBackToPatternCheck');
  const body = start < 0 ? '' : lw.slice(start, lw.indexOf('\n  };', start));
  check(body.includes('fallbackRunner(lesson)'), 'LessonWorkspace: the fallback picks its runner with fallbackRunner(lesson)');
  check(/runner === 'moshion'\)\s*runQ5\(\)/.test(body), 'LessonWorkspace: the fallback runs a moSHion lab through runQ5()');
  check(!/^\s*else runCode\(\);\s*$/m.test(body.split('fallbackRunner')[0] ?? ''), 'LessonWorkspace: no unconditional runCode() before the runner is picked');
}

// A sketch that threw is not submittable through Check (5.1.25, 2026-11-03). With the AI
// unreachable, Check's fallback re-runs the sketch (runQ5 clears the run error) and marks the cards
// 400 ms later. On a cold load the frame had not reported by then, so `!runtimeError` alone let
// Submit through with four green cards until the error arrived. The run is now "pending" until its
// frame reports: an error, or `preview-status` once the first frame ran clean.
const { runLetsSubmit } = aiCheckLib;
check(typeof runLetsSubmit === 'function', 'lib/ai-check.ts exports runLetsSubmit');
if (typeof runLetsSubmit === 'function') {
  const ERR = "Error: world.origin = 'math' must come before any sprite is made (line 7, col 16)";
  // The Check-fallback sequence on a sketch that throws, step by step.
  const afterRunQ5 = { error: null, pending: true };        // runQ5(): error cleared, frame loading
  check(!runLetsSubmit(afterRunQ5), 'fallback on a throwing sketch: Submit stays shut while the re-run has not reported (cards already green at 400 ms)');
  const oldGate = (run) => !run.error;
  check(oldGate(afterRunQ5) === true, 'calibration: the old gate (!runtimeError alone) was open at that moment');
  const afterError = { error: ERR, pending: false };         // the frame posts preview-error
  check(!runLetsSubmit(afterError), 'fallback on a throwing sketch: Submit stays shut once the error arrives');
  // The same sequence on a sketch that runs clean: only the grading failed.
  check(runLetsSubmit({ error: null, pending: false }), 'fallback on a clean sketch: Submit opens once the frame reports it came up');
  // Everything else keeps its old answer.
  check(runLetsSubmit({ error: null, pending: false }) === true, 'no run yet, or a clean run: open (unchanged)');
  check(runLetsSubmit({ error: ERR, pending: false }) === false, 'a run error: shut (unchanged)');
  check(runLetsSubmit({ error: ERR, pending: false }, true) === true, 'expectsRuntimeError accepts the error (unchanged)');
  check(runLetsSubmit({ error: null, pending: true }, true) === false, 'expectsRuntimeError does not accept a run that has not reported');
}
{
  const lw = readFileSync(path.join(root, 'components/LessonWorkspace.tsx'), 'utf8');
  const fn = (name) => { const s = lw.indexOf(`function ${name}(`); return s < 0 ? '' : lw.slice(s, lw.indexOf('\n  }', s)); };
  check(/setRunPending\(true\)/.test(fn('runQ5')), 'LessonWorkspace: runQ5() marks the run pending');
  check(/setRunPending\(false\)/.test(fn('stopRun')), 'LessonWorkspace: Stop clears the pending run');
  const handler = lw.slice(lw.indexOf("data.source === 'preview-status'"), lw.indexOf("data.source === 'preview-error'") + 200);
  check(/event\.source === frame\.contentWindow\) setRunPending\(false\)/.test(handler), "LessonWorkspace: only the lab's own frame's preview-status ends the pending run");
  check(/data\.source === 'preview-error' && data\.error\) \{\s*setRunPending\(false\)/.test(lw), 'LessonWorkspace: a preview-error ends the pending run');
  check(/runLetsSubmit\(\{ error: runtimeError, pending: isMoshionMode && runPending \}, expectsRuntimeError\)/.test(lw), 'LessonWorkspace: canSubmitByWork gates on runLetsSubmit');
  const runner = readFileSync(path.join(root, 'public/moshion/runner.html'), 'utf8');
  check(runner.includes("source: 'preview-status', status: 'running'"), "runner.html posts preview-status 'running' (scripts/test-runner-errors.mjs measures when)");
}

// wiring of every lesson that carries aiCheck
const gen =readFileSync(path.join(root, 'functions/_shared/ai-graders.generated.ts'), 'utf8');
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
  if (l.preview === 'moshion' && typeof fallbackRunner === 'function') {
    check(fallbackRunner(l) === 'moshion', `${id}: a moSHion aiCheck lab falls back to the moSHion runner`);
  }
}
check(labs >= 1, 'at least one lesson carries aiCheck');

console.log(failures ? `[test-ai-check] ${failures} FAILED of ${n}` : `[test-ai-check] ${n}/${n} checks passed`);
process.exit(failures ? 1 : 0);
