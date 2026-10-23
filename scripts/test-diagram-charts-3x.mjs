// The "Chart the Code" lessons of modules 3.4-3.8 that still have students draw a chart were graded by generic structural rules
// only: Start, a few boxes labelled "step 0", a diamond and End passed every one of them (found by
// the advanced student lens, 2026-10-09). Each now carries a rules-only diagram.aiGrader (no model
// call): the points come from shape KINDS and arrow TOPOLOGY, and the relevance gate caps a chart
// whose words say nothing about the program below the pass line.
// (3.7.5, 3.7.16 and 3.8.17 are now Plain English to Pseudocode labs: see scripts/test-pseudocode-labs.mjs.)
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

// 3.5.11 with the reference's shapes and arrows, three labels of the caller's choosing (second
// pass, 2026-10-14): the adding task is the one that names an item AND adds, so a set-up box such
// as "sum = 0" or "total price = 0" before the loop, or a "+" after it, no longer costs 5 points.
const chart11 = ({ B = 'total = 0', D = 'total = total + order.items[i].price', E = 'name = order.customer.name', C = 'i = 0 to order.items.length - 1', F = 'order.customer.vip', G = 'print name + " (VIP) total: " + total', H = 'print name + " total: " + total' } = {}) => `flowchart TD
  A([Start])
  B[${B}]
  C{{${C}}}
  D[${D}]
  E[${E}]
  F{${F}}
  G[/${G}/]
  H[/${H}/]
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
  H --> Z`;
// 3.5.21 with one unpack box replaced by the given boxes, in a row before the note
const chart21 = (boxes) => `flowchart TD
  A([Start])
${boxes.map((b, i) => `  B${i}[${b}]`).join('\n')}
  C[build note: color + " box " + width + "x" + height]
  D{width > height}
  E[note = note + " (wide)"]
  F[/print note/]
  Z([End])
  A --> B0
${boxes.slice(1).map((_, i) => `  B${i} --> B${i + 1}`).join('\n')}${boxes.length > 1 ? '\n' : ''}  B${boxes.length - 1} --> C
  C --> D
  D -->|yes| E
  D -->|no| F
  E --> F
  F --> Z`;

// 3.5.11, fourth pass: the name task before the loop, and a while-style chart (the hexagon sets up
// the counter, a "more items?" diamond runs the loop). Both are legal and earn every point.
const CHART11_NAME_FIRST = `flowchart TD
  A([Start])
  B[total = 0]
  E[name = order.customer.name]
  C{{i = 0 to order.items.length - 1}}
  D[total = total + order.items[i].price]
  F{order.customer.vip}
  G[/print name + " (VIP) total: " + total/]
  H[/print name + " total: " + total/]
  Z([End])
  A --> B
  B --> E
  E --> C
  C --> D
  D --> C
  C --> F
  F -->|yes| G
  F -->|no| H
  G --> Z
  H --> Z`;
const CHART11_WHILE = `flowchart TD
  A([Start])
  B[total = 0]
  C{{i = 0}}
  W{more items in the order?}
  D[total = total + order.items[i].price]
  E[name = order.customer.name]
  F{is the customer a VIP?}
  G[/print name + " (VIP) total: " + total/]
  H[/print name + " total: " + total/]
  Z([End])
  A --> B
  B --> C
  C --> W
  W -->|yes| D
  D --> W
  W -->|no| E
  E --> F
  F -->|yes| G
  F -->|no| H
  G --> Z
  H --> Z
`;

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
      'no arrow question': (t) => swap(swap(t, '  C -->|no| F\n', '  C -->|no| G\n'), '  F -->|no| G\n  F -->|yes| H\n', ''),
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
      'the loop body only says "add"': (t) => swap(t, 'D[total = total + order.items[i].price]', 'D[add]'),
      'the loop body never names an item ("add 1")': (t) => swap(t, 'D[total = total + order.items[i].price]', 'D[add 1]'),
      'the adding task after the loop, the name task inside it': (t) => swap(swap(t, 'D[total = total + order.items[i].price]', 'D[name = order.customer.name]'), 'E[name = order.customer.name]', 'E[total = total + order.items[i].price]'),
      // third pass (2026-10-14): the four arrow-order checks are worth 6 of 29 each (pass at 24), so
      // each one alone fails the chart; at 4 or 5 of 20 the old pass line of 16 let them slide
      'yes and no arrows swapped': (t) => flip(t),
      'both exits lead to the one print': (t) => swap(swap(swap(t, '  F -->|no| H\n', '  F -->|no| G\n'), '  H[/print name + " total: " + total/]\n', ''), '  H --> Z\n', ''),
      'the VIP print does not say VIP': (t) => swap(t, 'G[/print name + " (VIP) total: " + total/]', 'G[/print name + " total: " + total/]'),
      'one print before the diamond, its exits go to End': (t) => swap(swap(swap(swap(t, '  E --> F\n', '  E --> G\n  G --> F\n'), '  F -->|yes| G\n  F -->|no| H\n', '  F -->|yes| Z\n  F -->|no| Z\n'), '  G --> Z\n  H --> Z\n', ''), '  H[/print name + " total: " + total/]\n', ''),
      // fourth pass (2026-10-15): an arrow around the loop straight to the name task
      'a bypass arrow skips the loop (B --> E)': (t) => swap(t, '  B --> C\n', '  B --> C\n  B --> E\n'),
    },
    accepts: {
      'set-up box "sum = 0"': chart11({ B: 'sum = 0', D: 'sum = sum + order.items[i].price' }),
      'set-up box "cost = 0"': chart11({ B: 'cost = 0', D: 'cost = cost + order.items[i].price' }),
      'set-up box "total price = 0"': chart11({ B: 'total price = 0', D: 'total price = total price + order.items[i].price' }),
      'set-up box "set the total cost to 0"': chart11({ B: 'set the total cost to 0', D: 'add the item price to the total cost' }),
      'set-up box "start total at 0, no prices yet"': chart11({ B: 'start total at 0, no prices yet' }),
      'a box after the loop with a +': chart11({ E: 'note = order.customer.name + " total: " + total' }),
      'loop body "add the item\'s price to the total"': chart11({ D: "add the item's price to the total" }),
      'loop body "total += order.items[i].price"': chart11({ D: 'total += order.items[i].price' }),
      'loop body "sum = sum + current item"': chart11({ D: 'sum = sum + current item' }),
      'loop body "running total grows by the price"': chart11({ D: 'running total grows by the price' }),
      'loop body "total = total plus this item cost"': chart11({ D: 'total = total plus this item cost' }),
      'VIP print written "member total"': chart11({ G: 'print member total', H: 'print total' }),
      'prints in prose: "show the name, VIP and the total"': chart11({ G: "show the customer's name, VIP, and total", H: 'show the name and total' }),
      // fourth pass (2026-10-15): the name task drawn before the loop; a while-style loop whose
      // hexagon is the set-up and whose "more items?" diamond sits inside the repeat
      'the name task before the loop': CHART11_NAME_FIRST,
      'while-style: hexagon as set-up, a "more items?" diamond': CHART11_WHILE,
      'while-style, the counter steps in its own box': CHART11_WHILE.replace('  D --> W\n', '  D --> I\n  I[i = i + 1]\n  I --> W\n'),
    },
    rejects: {
      'while-style with the VIP yes and no swapped': flip(CHART11_WHILE).replace('W -->|no| E', 'W -->|yes| E').replace('W -->|yes| D', 'W -->|no| D'),
      'while-style with both VIP exits to End': CHART11_WHILE.replace('  F -->|yes| G\n  F -->|no| H\n', '  F -->|yes| Z\n  F -->|no| Z\n').replace('  G --> Z\n  H --> Z\n', '').replace('  G[/print name + " (VIP) total: " + total/]\n  H[/print name + " total: " + total/]\n', ''),
      'while-style with no print': CHART11_WHILE.replace('G[/print name + " (VIP) total: " + total/]', 'G[mark the order as VIP]').replace('H[/print name + " total: " + total/]', 'H[mark the order as normal]'),
      'while-style with the VIP diamond inside the loop': CHART11_WHILE.replace('  W -->|no| E\n', '  W -->|no| Z\n').replace('  D --> W\n', '  D --> E\n').replace('  G --> Z\n  H --> Z\n', '  G --> W\n  H --> W\n'),
      'one-word labels (total / loop / add / name / vip? / print)': `flowchart TD
  A([Start])
  B[total]
  C{{loop}}
  D[add]
  E[name]
  F{vip?}
  G[/print/]
  H[/print2/]
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
      // third pass (2026-10-14): every check is worth 6 of 24 (pass at 20), so each one alone fails
      'a bypass arrow skips the decision': (t) => swap(t, '  C --> D\n', '  C --> D\n  C --> F\n'),
      'the diamond asks width < height': (t) => swap(t, '{width > height}', '{width < height}'),
      'the diamond asks height > width': (t) => swap(t, '{width > height}', '{height > width}'),
      'the diamond names width with no direction': (t) => swap(t, '{width > height}', '{width and height}'),
      'no note is built before the decision': (t) => swap(swap(t, '  C[build note: color + " box " + width + "x" + height]\n', ''), '  B --> C\n  C --> D\n', '  B --> D\n'),
      'the yes arrow leads to an unrelated task': (t) => swap(t, 'E[note = note + " (wide)"]', 'E[do something]'),
      'the print is a plain task': (t) => swap(t, 'F[/print note/]', 'F[show the note]'),
      // fourth pass (2026-10-15): the negated question, and "or equal" (a square is not wide)
      'the diamond asks "is the box NOT wide?"': (t) => swap(t, '{width > height}', '{is the box NOT wide?}'),
      'the diamond asks width >= height': (t) => swap(t, '{width > height}', '{width >= height}'),
      'the diamond asks "is width greater than or equal to height?"': (t) => swap(t, '{width > height}', '{is width greater than or equal to height?}'),
    },
    // the unpack is ONE task: a box per field read out of options is plain access (second pass)
    accepts: {
      'const { width, height, color } = options': chart21(['const { width, height, color } = options']),
      'unpack options': chart21(['unpack options']),
      'destructure options into width, height, color': chart21(['destructure options into width, height, color']),
      'the note box names options again': chart21(['unpack width, height, color from options', 'note uses the values from options: color, width and height']),
      'decision "is the box wide?"': chart21(['unpack width, height, color from options']).replace('{width > height}', '{is the box wide?}'),
      'decision "is width bigger than height?"': chart21(['unpack width, height, color from options']).replace('{width > height}', '{is width bigger than height?}'),
      'yes box "append wide to the note"': chart21(['unpack width, height, color from options']).replace('E[note = note + " (wide)"]', 'E[append wide to the note]'),
      'build box "make the string"': chart21(['unpack width, height, color from options']).replace('C[build note: color + " box " + width + "x" + height]', 'C[make the string]'),
    },
    rejects: {
      'three scattered reads, one field each': chart21(['get width from options', 'get height from options', 'get color from options']),
      'two fields unpacked, the third read on its own': chart21(['unpack width, height from options', 'get color from options']),
      'one field read from options': chart21(['read width from options']),
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
    rejects: {
      'prints the reassigned array': (() => {
        const base = readFileSync(path.join(root, 'lessons/3-6-7-chart-reassign-vs-mutate/solution/chart.mmd'), 'utf8');
        return swap(base, 'K[/print scores: 0, 20, 30/]', 'K[/print scores: 9, 9/]');
      })(),
      'keyword soup, no reassignment task': `flowchart TD
  A([Start])
  B[scores shared with caller]
  C[[process scores]]
  D[change shared scores]
  E{caller sees change?}
  F[caller sees shared scores]
  G[local scores]
  H{caller sees local?}
  I[caller scores]
  J[shared caller scores]
  K[/print caller scores/]
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
    const oneWord = t({ ...fromMermaid(ref), nodes: fromMermaid(ref).nodes.map((nd) => (nd.shape === 'terminal' ? nd : { ...nd, label: 'print result' })) });
    check(oneWord.earned < oneWord.passAt, `${id}: every shape labelled with the same two on-topic words fails (${oneWord.earned}/${oneWord.possible})`);
    const bare = t('flowchart TD\n  A([Start])\n  Z([End])\n  A --> Z');
    check(bare.earned < bare.passAt, `${id}: Start -> End fails`);
    for (const [name, mutate] of Object.entries(c.mutations)) {
      const m = t(mutate(ref));
      check(m.earned < m.passAt, `${id}: ${name} fails (${m.earned}/${m.possible})`);
    }
    for (const [name, text] of Object.entries(c.accepts ?? {})) {
      const a = t(text);
      check(a.earned === a.possible, `${id}: ${name} earns every point (${a.earned}/${a.possible})`);
    }
    for (const [name, text] of Object.entries(c.rejects ?? {})) {
      const x = t(text);
      check(x.earned < x.passAt, `${id}: ${name} fails (${x.earned}/${x.possible})`);
    }
  }
  {
    // fourth pass: the bypass costs exactly the after-loop item (6 of 29): 23, under the pass line
    const id = '3-5-11-chart-nested-access';
    const cfg = JSON.parse(readFileSync(path.join(root, 'lessons', id, 'lesson.json'), 'utf8'));
    const ref = readFileSync(path.join(root, 'lessons', id, 'solution', 'chart.mmd'), 'utf8');
    const b = total(cfg, fromMermaid(swap(ref, '  B --> C\n', '  B --> C\n  B --> E\n')));
    check(b.earned === 23 && b.possible === 29, `${id}: the bypass arrow scores 23/29 (${b.earned}/${b.possible})`);
  }
} finally {
  cleanup();
}
if (failures) { console.log(`diagram charts 3.4-3.8: ${failures} of ${n} checks wrong`); process.exit(1); }
console.log(`diagram charts 3.4-3.8: ${n} checks OK`);
