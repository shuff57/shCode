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
// What it cannot prove: the model's verdict. That needs OLLAMA_API_KEY; run
// scripts/test-pa-ai-graders.mjs --live style fixtures for it.

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

const JUNK = `flowchart TD
  A([Start])
  B[a]
  C[b]
  D[c]
  E{d}
  F[e]
  G[f]
  Z([End])
  A --> B
  B --> C
  C --> D
  D --> E
  E -- "yes" --> F
  E -- "no" --> G
  F --> Z
  G --> Z`;

const VARIANTS = {
  '3-2-8-chart-parameter-trace': [
    // no separate "store" step; call labelled with the assignment; reversed question
    `flowchart TD
  A([Start])
  B[base = 100]
  C[[total = priceWithTax(base)]]
  D{total <= 100?}
  E[/Within budget/]
  F[/Over budget/]
  Z([End])
  A --> B
  B --> C
  C --> D
  D -- "yes" --> E
  D -- "no" --> F
  E --> Z
  F --> Z`,
    // input shape for base, shared print step
    `flowchart TD
  A([Start])
  B[/base is 100/]
  C[[call priceWithTax with base]]
  D[total gets the returned number]
  E{total > 100}
  F[print Over budget]
  G[print Within budget]
  Z([End])
  A --> B
  B --> C
  C --> D
  D --> E
  E -- "true" --> F
  E -- "false" --> G
  F --> Z
  G --> Z`,
  ],
  '3-2-18-chart-chained-calls': [
    `flowchart TD
  A([Start])
  B[[double(5)]]
  C[[addTen(10)]]
  D[result = 20]
  E{result > 25}
  F[/Big/]
  G[/Small/]
  Z([End])
  A --> B
  B --> C
  C --> D
  D --> E
  E -- "yes" --> F
  E -- "no" --> G
  F --> Z
  G --> Z`,
    // the 10 held in its own step between the two calls
    `flowchart TD
  A([Start])
  B[[call double with 5]]
  H[the 10 comes back]
  C[[call addTen with that 10]]
  D[set result to what addTen returned]
  E{is result greater than 25?}
  F[/print Big/]
  G[/print Small/]
  Z([End])
  A --> B
  B --> H
  H --> C
  C --> D
  D --> E
  E -- "yes" --> F
  E -- "no" --> G
  F --> Z
  G --> Z`,
  ],
  '3-3-11-chart-the-array-loop': [
    // no join step: yes path goes through the add and back, no path straight back
    `flowchart TD
  A([Start])
  B[cheapCount = 0]
  C{{i = 0 to prices.length - 1}}
  D{prices[i] < 10}
  E[cheapCount = cheapCount + 1]
  F[/print cheapCount/]
  Z([End])
  A --> B
  B --> C
  C -- "each item" --> D
  D -- "yes" --> E
  D -- "no" --> C
  E --> C
  C -- "finished" --> F
  F --> Z`,
    // a join box both branches meet at before the hexagon; price list set first
    `flowchart TD
  A([Start])
  P[prices holds the five prices]
  B[set cheapCount to 0]
  C{{for each price}}
  D{Is this price under 10?}
  E[add one to cheapCount]
  J[move on to the next price]
  F[/Print the count of cheap items/]
  Z([End])
  A --> P
  P --> B
  B --> C
  C -- "next" --> D
  D -- "yes" --> E
  D -- "no" --> J
  E --> J
  J --> C
  C -- "no more prices" --> F
  F --> Z`,
  ],
};

const SHAPE_WORD = {
  '3-2-8-chart-parameter-trace': 'Function call (predefined process)',
  '3-2-18-chart-chained-calls': 'Function call (predefined process)',
  '3-3-11-chart-the-array-loop': 'Loop setup (hexagon)',
};

try {
  execFileSync(process.execPath, [
    path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    'lib/diagram-types.ts', 'lib/diagram-mermaid.ts', 'lib/diagram-check.ts',
    '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
  ], { cwd: root, stdio: 'inherit' });
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const toUrl = (f) => 'file://' + path.join(out, f).replace(/\\/g, '/');
  const { fromMermaid, describeDiagram } = await import(toUrl('diagram-mermaid.js'));
  const { checkDiagram, allPassed } = await import(toUrl('diagram-check.js'));

  for (const [id, variants] of Object.entries(VARIANTS)) {
    console.log(id);
    const cfg = JSON.parse(readFileSync(path.join(root, 'lessons', id, 'lesson.json'), 'utf8'));
    const rules = cfg.diagram.rules;
    const ref = readFileSync(path.join(root, 'lessons', id, 'solution', 'chart.mmd'), 'utf8');
    const pass = (src) => allPassed(checkDiagram(fromMermaid(src), rules));

    check(pass(ref), 'reference chart passes the structural rules');
    variants.forEach((v, i) => check(pass(v), `variant ${i + 1} passes the structural rules`));
    check(!pass(cfg.diagram.starter), 'untouched starter fails the structural rules');
    check(pass(JUNK), 'generic junk chart passes the STRUCTURAL rules (expected: the aiGrader is the gate)');

    const g = cfg.diagram.aiGrader;
    check(!!g && g.strict === true, 'aiGrader present and strict');
    check(!!g && typeof g.prompt === 'string' && g.prompt.length > 200, 'aiGrader has a server-side prompt');
    check(!!g && g.rubric.length >= 5, 'at least 5 criteria');
    // Weighted points (20 total, pass line 70% = 14): the two criteria the lesson is ABOUT (the
    // required shape kind and the order/loop structure) carry 7 each, so missing either one alone
    // fails the chart (13/20). Measured live by scripts/test-chart-lessons-live.mjs.
    const total = g ? g.rubric.reduce((a, r) => a + r.points, 0) : 0;
    const heavy = g ? g.rubric.filter((r) => r.points >= 7).length : 0;
    check(total === 20, `rubric points total 20 (got ${total})`);
    check(heavy === 2 && g.rubric.every((r) => r.points >= 2), 'exactly two heavy (7) criteria, none under 2');
    check(!!g && g.rubric.every((r) => r.description && r.id), 'criteria have descriptions');
    check(describeDiagram(fromMermaid(ref)).includes(SHAPE_WORD[id]), `the walk the model reads names "${SHAPE_WORD[id]}"`);
    check(g && g.rubric.some((r) => r.description.includes(SHAPE_WORD[id].split(' (')[0].replace('Function call', 'function-call')) || r.description.includes(SHAPE_WORD[id])), 'a criterion asks for that shape kind');
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
console.log(failures === 0 ? '[test-diagram-chart-lessons] OK' : `[test-diagram-chart-lessons] ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
