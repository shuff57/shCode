// The three "Chart the Code" lessons (3.2.10, 3.2.22, 3.3.14) were graded by
// structural rules only, so ANY legal flowchart passed them. The structural rule
// vocabulary (lib/diagram-check.ts) has no "requires a function-call shape",
// "requires a hexagon" or "requires this label" rule, so the part that checks the
// chart is THIS program is the diagram.aiGrader on each lesson (convention: the
// ch1-3 PA charts and 2-2-12).
//
// OFFLINE, always in CI. What it proves:
//   - the stored reference chart and reasonable variants pass the lesson's own rules
//   - the untouched starter fails them
//   - a generic legal chart (Start, a, b, c, diamond, e, f, End) PASSES the structural
//     rules -- stated here on purpose, so nobody later believes the rules alone gate it
//   - the aiGrader that does gate it is present, strict, has a server-readable prompt,
//     enough criteria that the generic chart cannot reach the pass line, and the
//     walk the model reads names the shape kinds the rubric asks about.
// HYBRID (slice 1): the heavy 7+7 points are marked from the drawing by lib/diagram-score.ts, the
// model marks 6 points of wording. So this test also proves, with NO model call:
//   - the reference and >= 10 legitimate variants per chart earn 14/14 rule points and clear the
//     relevance gate;
//   - every gaming fixture (junk, Start->End, sandwich, injected label, decision-before-call,
//     print-inside-loop, rectangle for the required shape) ends at rule points + the AI's best
//     possible 6 < 14, so the model is never what stops them;
//   - single-edit mutations of each reference move the score where they should (table printed).
// What it cannot prove: the model's verdict on the wording items. That needs OLLAMA_API_KEY; run
// scripts/test-chart-lessons-live.mjs.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = mkdtempSync(path.join(tmpdir(), 'shcode-chartlessons-'));
let failures = 0;
const check = (ok, msg) => {
  if (!ok) { failures += 1; console.error('  FAIL  ' + msg); } else console.log('  ok    ' + msg);
};

// Fixtures (references, legitimate variants, gaming charts) live in chart-fixtures.mjs so the
// agreement-measuring tool's test (test-measure-chart-agreement.mjs) reuses the exact same charts.
import { refText, setCurrent, VARIANTS, SHAPE_KIND, SHAPE_WORD, GAMES, JUNK, MIN, SANDWICH, INJECT, STUFFED } from './chart-fixtures.mjs';

const AI_MAX = 6;

try {
  execFileSync(process.execPath, [
    path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    'lib/diagram-types.ts', 'lib/diagram-mermaid.ts', 'lib/diagram-check.ts', 'lib/diagram-score.ts',
    '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
  ], { cwd: root, stdio: 'inherit' });
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const toUrl = (f) => 'file://' + path.join(out, f).replace(/\\/g, '/');
  const { fromMermaid, describeDiagram } = await import(toUrl('diagram-mermaid.js'));
  const { checkDiagram, allPassed } = await import(toUrl('diagram-check.js'));
  const { scoreDiagram, splitRubric, mergeGrade } = await import(toUrl('diagram-score.js'));
  const KINDS = ['terminal', 'process', 'decision', 'io', 'subroutine', 'preparation', 'connector'];

  for (const id of Object.keys(VARIANTS)) {
    console.log(id);
    setCurrent(id);
    const cfg = JSON.parse(readFileSync(path.join(root, 'lessons', id, 'lesson.json'), 'utf8'));
    const rules = cfg.diagram.rules;
    const g = cfg.diagram.aiGrader;
    const { ruleItems, aiItems } = splitRubric(g.rubric);
    const ref = refText(id);
    const pass = (src) => allPassed(checkDiagram(fromMermaid(src), rules));
    const score = (src) => scoreDiagram(fromMermaid(src), ruleItems, g.gate);
    const ruleMax = ruleItems.reduce((a, r) => a + r.points, 0);

    check(pass(ref), 'reference chart passes the structural rules');
    check(!pass(cfg.diagram.starter), 'untouched starter fails the structural rules');
    // junk has no required shape, so min-shape (a structural rule now) is the one rule it fails;
    // everything else about it is legal, which is why the rule SCORE has to fail it too.
    const junkRes = checkDiagram(fromMermaid(JUNK), rules);
    check(junkRes.filter((r) => !r.passed).every((r) => r.id === 'min-shape'), 'junk fails ONLY the required-shape rule structurally (everything else about it is a legal chart)');

    // --- the reference and legitimate variants: 14/14 and gate ---
    const refScore = score(ref);
    check(refScore.earned === ruleMax && refScore.gate && refScore.gate.passed, `reference earns ${ruleMax}/${ruleMax} rule points and clears the gate`);
    const variants = VARIANTS[id]();
    check(variants.length >= 10, `at least 10 legitimate variants (${variants.length})`);
    for (const [name, mmd] of variants) {
      const sc = score(mmd);
      check(pass(mmd) && sc.earned === ruleMax && sc.gate.passed, `variant "${name}": structure green, ${sc.earned}/${ruleMax}, gate ${sc.gate.matched}/${sc.gate.min}` + (sc.earned !== ruleMax ? ' -- ' + sc.criteria.filter((c) => c.earned < c.max).map((c) => c.feedback).join(' ') : ''));
    }

    // --- gaming: no model call can rescue these ---
    const gaming = [
      ['generic junk', JUNK, 0], ['Start -> End', MIN, 0], ['sandwich', SANDWICH, 0], ['injected label', INJECT, 0], ['label stuffing, wrong shapes', STUFFED, 0],
      ...GAMES[id](ref),
    ];
    for (const [name, mmd, expectRule] of gaming) {
      const sc = score(mmd);
      const best = sc.earned + AI_MAX;
      check(sc.earned === expectRule && best < 14, `GAME ${name}: ${sc.earned} rule points (expected ${expectRule}) + best AI ${AI_MAX} = ${best} < 14, no model call needed`);
    }
    check(score(JUNK).earned < 14 && pass(JUNK) === junkRes.every((r) => r.passed), 'junk also fails the rule SCORE');

    // --- the gate: right shapes, none of the program's words ---
    const relabelled = fromMermaid(ref);
    for (const n of relabelled.nodes) if (n.shape !== 'terminal') n.label = 'x';
    const rs = scoreDiagram(relabelled, ruleItems, g.gate);
    check(rs.earned === ruleMax && rs.gate && !rs.gate.passed, 'every shape relabelled "x": rule points unchanged, relevance gate trips');
    const mg = mergeGrade(rs, { totalEarned: AI_MAX, totalPossible: AI_MAX, criteria: aiItems.map((r) => ({ id: r.id, earned: r.points, max: r.points, verdict: 'met', feedback: '' })), summary: '', hints: [] }, aiItems);
    check(mg.totalEarned === g.gate.capTo && mg.totalEarned < 14, `...and even with a perfect AI the total is held at ${g.gate.capTo} (< pass line 14)`);

    // --- mutations of the reference ---
    const base = fromMermaid(ref);
    const rows = [];
    const run = (label, doc) => { const sc = scoreDiagram(doc, ruleItems, g.gate); rows.push({ label, earned: sc.earned, gate: sc.gate.passed, structural: allPassed(checkDiagram(doc, rules)) }); return sc; };
    const clone = () => JSON.parse(JSON.stringify(base));
    for (const n of base.nodes) for (const k of KINDS) {
      if (k === n.shape) continue;
      const d = clone(); d.nodes.find((x) => x.id === n.id).shape = k;
      run(`kind ${n.id}(${n.shape}) -> ${k}`, d);
    }
    for (const e of base.edges) {
      const d1 = clone(); d1.edges = d1.edges.filter((x) => x.id !== e.id); run(`delete edge ${e.from}->${e.to}`, d1);
      const d2 = clone(); const ed = d2.edges.find((x) => x.id === e.id); [ed.from, ed.to] = [ed.to, ed.from]; run(`reverse edge ${e.from}->${e.to}`, d2);
    }
    for (const n of base.nodes) {
      const d = clone(); d.nodes = d.nodes.filter((x) => x.id !== n.id); d.edges = d.edges.filter((e) => e.from !== n.id && e.to !== n.id); run(`delete node ${n.id}(${n.shape})`, d);
    }
    const dx = clone(); for (const n of dx.nodes) if (n.shape !== 'terminal') n.label = 'x';
    const rx = run('relabel every shape "x"', dx);
    check(rx.earned === ruleMax && !rx.gate.passed, 'mutation: relabel every shape "x" leaves the rule points and trips the gate');
    // the required shape: changing it away drops at least 7
    const key = ruleItems[0].check.steps[0].match.kind;
    const keyNodes = base.nodes.filter((n) => n.shape === key);
    const dropped = keyNodes.map((n) => { const d = clone(); d.nodes.find((x) => x.id === n.id).shape = 'process'; return ruleMax - scoreDiagram(d, ruleItems, g.gate).earned; });
    check(dropped.every((x) => x >= 7), `mutation: turning any one required ${key} shape into a rectangle drops at least 7 (drops: ${dropped.join(', ')})`);
    check(rows.every((r) => r.earned <= ruleMax && r.earned >= 0), 'no mutation scores outside 0..max');
    const survivors = rows.filter((r) => r.earned === ruleMax && r.structural && r.gate && !/relabel/.test(r.label));
    const down = rows.filter((r) => r.earned < ruleMax).length;
    console.log(`  info  ${rows.length} mutations: ${down} lower the rule score, ${rows.length - down} leave it at ${ruleMax}` + (survivors.length ? `; still 14/14 AND structurally legal: ${survivors.map((r) => r.label).join('; ')}` : ''));
    const hist = {};
    for (const r of rows) hist[r.earned] = (hist[r.earned] || 0) + 1;
    console.log('  info  rule-score histogram over mutations: ' + Object.entries(hist).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join('  '));

    // --- config shape ---
    check(!!g && g.strict === true, 'aiGrader present and strict');
    check(!!g && typeof g.prompt === 'string' && g.prompt.length > 200, 'aiGrader has a server-side prompt');
    check(!!g && g.rubric.length >= 5, 'at least 5 criteria');
    // Weighted points (20 total, pass line 70% = 14): the two criteria the lesson is ABOUT (the
    // required shape kind and the order/loop structure) carry 7 each and are the RULE items now, so
    // missing either one alone fails the chart (13/20) and no model is involved in that.
    const total = g.rubric.reduce((a, r) => a + r.points, 0);
    const heavy = g.rubric.filter((r) => r.points >= 7);
    check(total === 20, `rubric points total 20 (got ${total})`);
    check(heavy.length === 2 && g.rubric.every((r) => r.points >= 2), 'exactly two heavy (7) criteria, none under 2');
    check(heavy.every((r) => r.check) && aiItems.length === 3 && aiItems.every((r) => r.points === 2), 'both heavy criteria are rule-scored; the three wording criteria (2 each) stay with the AI');
    check(!!g && g.rubric.every((r) => r.description && r.id), 'criteria have descriptions');
    check(!!g.gate && g.gate.anyOf.length === 5 && g.gate.min === 2 && g.gate.capTo === 13, 'relevance gate: 5 token groups, min 2, capTo 13');
    check(!cfg.grading.formative && !!cfg.assignmentCode && !g.maxSubmissions && !cfg.diagram.maxSubmissions, 'counted: a lab code, unlimited tries');
    check(describeDiagram(fromMermaid(ref)).includes(SHAPE_WORD[id]), `the walk the model reads names "${SHAPE_WORD[id]}"`);
    check(heavy.some((r) => /function-call|hexagon/.test(r.description)) && ruleItems.some((r) => JSON.stringify(r.check).includes(SHAPE_KIND[id])), 'a rule item asks for that shape kind');
    check(aiItems.every((r) => !/double-rail|hexagon|function-call|loop-setup|predefined/i.test(r.description)), 'the AI-marked items never ask the model about shape kinds');
    check(!/double-rail|hexagon|function-call|loop-setup|diamond|predefined/i.test(g.prompt), 'the prompt never asks the model about shape kinds (it tells it those points are not its)');
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
console.log(failures === 0 ? '[test-diagram-chart-lessons] OK' : `[test-diagram-chart-lessons] ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
