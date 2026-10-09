// Applies scripts/_chart-3x-spec.cjs to the nine lessons (idempotent) and writes the reference
// charts that were missing. Run: node scripts/apply-chart-3x.cjs
const fs = require('fs');
const path = require('path');
const SPEC = require('./_chart-3x-spec.cjs');
const root = path.resolve(__dirname, '..');

const REFS = {
  '3-4-9-chart-expand-arrow': `flowchart TD
  A([Start])
  B[read operation and value]
  C[first = operation of value]
  D[second = operation of first]
  E[/print second/]
  Z([End])
  A --> B
  B --> C
  C --> D
  D --> E
  E --> Z
`,
  '3-6-7-chart-reassign-vs-mutate': `flowchart TD
  A([Start])
  B[scores = 10, 20, 30]
  C[[process scores]]
  D[nums 0 = 0: change the shared array]
  E{did this write escape to the caller?}
  F[caller's scores now starts with 0]
  G[nums = 9, 9: point the local name at a new array]
  H{did this write escape to the caller?}
  I[caller's scores unchanged]
  J[caller's scores becomes 9, 9]
  K[/print scores: 0, 20, 30/]
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
  K --> Z
`,
  '3-7-5-chart-map-trace': `flowchart TD
  A([Start])
  B[withTax = empty list]
  C{{for each price in prices}}
  D{is there another price?}
  E[add price * 1.08 to withTax]
  F[/print withTax/]
  Z([End])
  A --> B
  B --> C
  C --> D
  D -->|yes| E
  E --> C
  D -->|no| F
  F --> Z
`,
  '3-7-16-chart-spread-vs-rest': `flowchart TD
  A([Start])
  B[sum = 0]
  C{{for i from 0 to numbers.length - 1}}
  D{is there another number?}
  E[sum = sum + numbers i]
  F[/return sum/]
  Z([End])
  A --> B
  B --> C
  C --> D
  D -->|yes| E
  E --> C
  D -->|no| F
  F --> Z
`,
};

for (const [id, spec] of Object.entries(SPEC)) {
  const p = path.join(root, 'lessons', id, 'lesson.json');
  const raw = fs.readFileSync(p, 'utf8');
  const crlf = raw.includes('\r\n');
  const j = JSON.parse(raw);
  // structural rules: same ids, new counts
  const rules = j.diagram.rules;
  for (const [rid, v] of Object.entries(spec.rules)) {
    if (v === null) { const k = rules.findIndex((r) => r.id === rid); if (k >= 0) rules.splice(k, 1); continue; }
    const want = typeof v === 'number' ? { id: rid, count: v } : { id: rid, ...v };
    const i = rules.findIndex((r) => r.id === rid);
    if (i >= 0) rules[i] = want; else rules.push(want);
  }
  j.diagram.aiGrader = {
    rubricTitle: spec.rubricTitle,
    model: 'glm-5.3-flash:cloud',
    contextDocs: [],
    strict: true,
    prompt: 'This chart is scored entirely by rules from its shapes and arrows. No model reads it.',
    rubric: spec.rubric,
    gate: spec.gate,
  };
  // An aiGrader makes the manifest call the lesson a scored Written item, which would put the chart in
  // the grade. These are practice: formative nulls maxScore/scoreKind (scripts/lesson-score-fields.mjs).
  j.grading = { ...j.grading, formative: true };
  let out = JSON.stringify(j, null, 2) + '\n';
  if (crlf) out = out.replace(/\n/g, '\r\n');
  fs.writeFileSync(p, out);
  if (REFS[id]) {
    const dir = path.join(root, 'lessons', id, 'solution');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'chart.mmd'), REFS[id]);
  }
}
console.log('applied', Object.keys(SPEC).length);
