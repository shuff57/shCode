// The nine "Chart the Code" lessons of modules 3.4-3.8 were graded by generic structural rules
// only: Start, a few boxes labelled "step 0", a diamond and End passed every one of them (found by
// the advanced student lens, 2026-10-09). Each now carries a rules-only diagram.aiGrader (no model
// call): the points come from shape KINDS and arrow TOPOLOGY, and the relevance gate caps a chart
// whose words say nothing about the program below the pass line.
//
// OFFLINE, always in CI. For every chart it proves:
//   - the reference (lessons/<id>/solution/chart.mmd) earns every point;
//   - a legitimate variant (other words, other shape order where the lesson allows) passes;
//   - the same chart with every label replaced by "step N" fails (the gate);
//   - the same chart with every shape a plain rectangle fails (the shapes carry the points);
//   - the lesson-specific wrong-arrow mutations fail;
//   - Start -> End fails.
// Run: node scripts/test-diagram-charts-3x.mjs   (also part of `npm test`)

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { compileScorer } from './lib/chart-corpus.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { fromMermaid, scoreDiagram, cleanup } = await compileScorer();
let failures = 0;
let n = 0;
const check = (ok, msg) => { n++; if (!ok) { failures++; console.log('  FAIL  ' + msg); } };

// scoreDiagram + the gate cap, the way the server totals a rules-only chart
function total(cfg, doc) {
  const g = cfg.diagram.aiGrader;
  const items = g.rubric.filter((r) => r.check);
  const s = scoreDiagram(doc, items, g.gate);
  const possible = items.reduce((a, r) => a + r.points, 0);
  const earned = s.gate && !s.gate.passed ? Math.min(s.earned, s.gate.capTo) : s.earned;
  return { earned, possible, passAt: Math.ceil(possible * 0.8 - 1e-9) };
}
const rename = (doc) => ({ ...doc, nodes: doc.nodes.map((nd, i) => (nd.shape === 'terminal' ? nd : { ...nd, label: `step ${i}` })) });
const flat = (doc) => ({ ...doc, nodes: doc.nodes.map((nd) => (nd.shape === 'terminal' ? nd : { ...nd, shape: 'process' })) });
const flip = (text) => text.replace(/\|yes\|/g, '|TMP|').replace(/\|no\|/g, '|yes|').replace(/\|TMP\|/g, '|no|');
const swap = (text, a, b) => { if (!text.includes(a)) throw new Error('anchor missing: ' + a); return text.replace(a, b); };

const CASES = {
  '3-4-9-chart-expand-arrow': {
    variant: `flowchart TD
  A([Start])
  B[/take in the function and the number/]
  C[call the function once on the number]
  D[call the function on that answer]
  E[/show the answer/]
  Z([End])
  A --> B
  B --> C
  C --> D
  D --> E
  E --> Z`,
    mutations: {
      'a loop that is not in the code': (t) => swap(t, '  D --> E\n', '  D --> C\n  D --> E\n'),
      'only two steps before the print': (t) => swap(swap(t, '  C --> D\n  D --> E\n', '  C --> E\n'), '  D[second = operation of first]\n', ''),
    },
  },
  '3-4-15-chart-form-decision': {
    variant: `flowchart TD
  A([Start])
  B[/read the function's job/]
  C{Is the body a single expression?}
  D[Use a one-line arrow, implicit return]
  E{Is it a main operation called from several places?}
  F[Use a function declaration]
  G[Use an arrow with a block body and return]
  Z([End])
  A --> B
  B --> C
  C -->|yes| D
  C -->|no| E
  E -->|yes| F
  E -->|no| G
  D --> Z
  F --> Z
  G --> Z`,
    mutations: {
      'only one question': (t) => swap(swap(t, '  C -->|no| E\n', '  C -->|no| G\n'), '  E -->|yes| F\n  E -->|no| G\n', ''),
      'only two forms': (t) => swap(swap(t, '  E -->|no| G\n', '  E -->|no| F\n'), '  G --> Z\n', ''),
    },
  },
  '3-4-20-chart-forms-comparison': {
    variant: `flowchart TD
  A([Start])
  B[/read the job: add two numbers/]
  C{Does the function have a name?}
  D[declaration addA with return]
  E[const addB = function with no name]
  F{Are there braces on the body?}
  G[keep the braces and the return in addB]
  H[drop braces and return in addC arrow]
  I[/show 3 3 3/]
  Z([End])
  A --> B
  B --> C
  C -->|yes| D
  C -->|no| E
  E --> F
  F -->|yes| G
  F -->|no| H
  D --> I
  G --> I
  H --> I
  I --> Z`,
    mutations: {
      'one form dead-ends before the print': (t) => swap(swap(t, '  H --> I\n', ''), '  I --> Z', '  H --> Z\n  I --> Z'),
      'no braces question': (t) => swap(swap(t, '  E --> F\n', '  E --> H\n'), '  F -->|yes| G\n  F -->|no| H\n', '  G --> I\n'),
    },
  },
  '3-5-11-chart-nested-access': {
    variant: `flowchart TD
  A([Start])
  B[total starts at 0]
  C{{for each item in order.items}}
  D[add order.items i price to total]
  E[name = the customer's name]
  F{is the customer a VIP?}
  G[/print name, VIP, total/]
  H[/print name and total/]
  Z([End])
  A --> B
  B --> C
  C --> D
  D --> C
  C --> E
  E --> F
  F -->|yes| G
  F -->|no| H
  G --> Z
  H --> Z`,
    mutations: {
      'adding task goes on to the decision, not back to the loop': (t) => swap(t, '  D --> C\n', '  D --> F\n'),
      'decision inside the loop': (t) => swap(swap(t, '  C --> E\n  E --> F\n', '  C --> E\n  E --> C\n'), '  D --> C\n', '  D --> F\n  F -->|again| C\n'),
      'no hexagon': (t) => swap(t, '{{i = 0 to order.items.length - 1}}', '[i = 0 to order.items.length - 1]'),
    },
  },
  '3-5-21-chart-destructure-vs-access': {
    variant: `flowchart TD
  A([Start])
  B[take width, height and color out of options]
  C[note = color box width x height]
  D{is width greater than height?}
  E[add wide to the note]
  F[/print the note/]
  Z([End])
  A --> B
  B --> C
  C --> D
  D -->|yes| E
  D -->|no| F
  E --> F
  F --> Z`,
    mutations: {
      'yes and no arrows swapped': (t) => flip(t),
      'decision before any task': (t) => swap(swap(t, '  A --> B\n  B --> C\n  C --> D\n', '  A --> D\n  D --> B\n  B --> C\n'), '  D -->|yes| E\n  D -->|no| F\n', '  C -->|yes| E\n  C -->|no| F\n'),
      'both exits go to the same place': (t) => swap(t, '  D -->|yes| E\n', '  D -->|yes| F\n'),
    },
  },
  '3-6-7-chart-reassign-vs-mutate': {
    variant: `flowchart TD
  A([Start])
  B[scores holds three numbers]
  C[[call process with scores]]
  D[nums element 0 becomes 0]
  E{does the caller see that change?}
  F[yes: scores shows 0 first]
  G[nums now points at a new array]
  H{does the caller see that?}
  I[no: scores still points at the old array]
  J[the caller sees the new array]
  K[/print scores/]
  Z([End])
  A --> B
  B --> C
  C --> D
  D --> E
  E -->|yes| F
  E -->|no| G
  F --> G
  G --> H
  H -->|no| I
  H -->|yes| J
  I --> K
  J --> K
  K --> Z`,
    mutations: {
      'plain rectangle for the call': (t) => swap(t, 'C[[process scores]]', 'C[process scores]'),
      'only one question': (t) => swap(swap(swap(t, '  G --> H\n  H -->|no| I\n  H -->|yes| J\n  I --> K\n  J --> K\n', '  G --> I\n  I --> K\n'), 'F --> G', 'F --> G'), '  E -->|no| G\n', '  E -->|no| G\n'),
    },
  },
  '3-7-5-chart-map-trace': {
    variant: `flowchart TD
  A([Start])
  B[withTax starts empty]
  C{{loop over prices}}
  D{any price left?}
  E[add the taxed price to withTax]
  F[/show withTax/]
  Z([End])
  A --> B
  B --> C
  C --> D
  D -->|yes| E
  E --> C
  D -->|no| F
  F --> Z`,
    mutations: {
      'yes and no arrows swapped': (t) => flip(t),
      'print inside the loop, the loop never ends': (t) => swap(swap(t, '  D -->|no| F\n  F --> Z', '  D -->|no| F\n  F --> C\n  C --> Z'), '  E --> C\n', '  E --> C\n'),
      'no arrow back': (t) => swap(t, '  E --> C\n', '  E --> F\n'),
      'no hexagon': (t) => swap(t, '{{for each price in prices}}', '[for each price in prices]'),
    },
  },
  '3-7-16-chart-spread-vs-rest': {
    variant: `flowchart TD
  A([Start])
  B[sum starts at zero]
  C{{loop over the numbers}}
  D{any number left?}
  E[add the number to sum]
  F[/return the total/]
  Z([End])
  A --> B
  B --> C
  C --> D
  D -->|yes| E
  E --> C
  D -->|no| F
  F --> Z`,
    mutations: {
      'yes and no arrows swapped': (t) => flip(t),
      'no arrow back': (t) => swap(t, '  E --> C\n', '  E --> F\n'),
      'no hexagon': (t) => swap(t, '{{for i from 0 to numbers.length - 1}}', '[for i from 0 to numbers.length - 1]'),
    },
  },
  '3-8-17-chart-save-load-round-trip': {
    variant: `flowchart TD
  A([Start])
  B[turn the settings into JSON text]
  C[store the text under a key]
  D[read the text stored at the key]
  E{is anything stored?}
  F[return the defaults]
  G{does the parse work?}
  H[return the parsed settings]
  I[return the defaults]
  J[/show what came back/]
  Z([End])
  A --> B
  B --> C
  C --> D
  D --> E
  E -->|no| F
  E -->|yes| G
  G -->|yes| H
  G -->|no| I
  F --> J
  H --> J
  I --> J
  J --> Z`,
    mutations: {
      'parse question before the missing-key question': (t) => swap(swap(t, 'E{text === null?}', 'E{did the parse succeed?}'), 'G{did the parse succeed?}', 'G{text === null?}'),
      'only one question': (t) => swap(swap(t, '  E -->|no| G\n  G -->|yes| H\n  G -->|no| I\n', '  E -->|no| H\n'), '  I --> J\n', ''),
    },
  },
};

try {
  for (const id of Object.keys(CASES)) {
    console.log(id);
    const cfg = JSON.parse(readFileSync(path.join(root, 'lessons', id, 'lesson.json'), 'utf8'));
    const ref = readFileSync(path.join(root, 'lessons', id, 'solution', 'chart.mmd'), 'utf8');
    const c = CASES[id];
    check(cfg.grading && cfg.grading.formative === true && !cfg.assignmentCode, `${id}: stays practice (formative, no lab code) -- an aiGrader alone would make it a Written item in the grade`);
    const t = (src) => total(cfg, typeof src === 'string' ? fromMermaid(src) : src);
    const r = t(ref);
    check(r.earned === r.possible, `${id}: reference earns every point (${r.earned}/${r.possible})`);
    const v = t(c.variant);
    check(v.earned >= v.passAt, `${id}: a legitimate variant passes (${v.earned}/${v.possible}, needs ${v.passAt})`);
    const nonsense = t(rename(fromMermaid(ref)));
    check(nonsense.earned < nonsense.passAt, `${id}: the reference structure with every label "step N" fails (${nonsense.earned}/${nonsense.possible})`);
    const rects = t(flat(fromMermaid(ref)));
    check(rects.earned < rects.passAt, `${id}: the reference words in plain rectangles fail (${rects.earned}/${rects.possible})`);
    const bare = t('flowchart TD\n  A([Start])\n  Z([End])\n  A --> Z');
    check(bare.earned < bare.passAt, `${id}: Start -> End fails`);
    for (const [name, mutate] of Object.entries(c.mutations)) {
      const m = t(mutate(ref));
      check(m.earned < m.passAt, `${id}: ${name} fails (${m.earned}/${m.possible})`);
    }
  }
} finally {
  cleanup();
}
if (failures) { console.log(`diagram charts 3.4-3.8: ${failures} of ${n} checks wrong`); process.exit(1); }
console.log(`diagram charts 3.4-3.8: ${n} checks OK`);
