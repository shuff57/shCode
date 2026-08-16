// Assertions for the flowchart libraries. Run via `npm run test:diagram`,
// which compiles lib/diagram-*.ts to CommonJS in a temp dir first and passes
// that dir in — these files are TypeScript and import each other without file
// extensions, so neither Node's type stripping nor plain ESM can load them
// directly.

const LIB = process.env.DIAGRAM_LIB_DIR;
if (!LIB) {
  console.error('Set DIAGRAM_LIB_DIR, or run `npm run test:diagram`.');
  process.exit(2);
}
const { fromMermaid, toMermaid, describeDiagram } = require(LIB + '/diagram-mermaid.js');
const { checkDiagram, allPassed } = require(LIB + '/diagram-check.js');
const { DEFAULT_RULES } = require(LIB + '/diagram-types.js');

let fails = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('  PASS  ' + name); }
  else { fails++; console.log('  FAIL  ' + name + (extra !== undefined ? '\n        ' + extra : '')); }
}
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ---------- parsing ----------
section('fromMermaid — shapes');
{
  const d = fromMermaid(`
flowchart TD
  %% a comment
  A([Start]) --> B[get the age]
  B --> C{age >= 18}
  C -- yes --> D[/print "You may vote"/]
  C -- no --> E[print Too young]
  D --> F([End])
  E --> F
`);
  const byId = Object.fromEntries(d.nodes.map(n => [n.id, n]));
  ok('6 nodes parsed', d.nodes.length === 6, 'got ' + d.nodes.length);
  ok('6 edges parsed', d.edges.length === 6, 'got ' + d.edges.length);
  ok('A is terminal', byId.A.shape === 'terminal', byId.A.shape);
  ok('B is process', byId.B.shape === 'process', byId.B.shape);
  ok('C is decision', byId.C.shape === 'decision', byId.C.shape);
  ok('D is io', byId.D.shape === 'io', byId.D.shape);
  ok('C label kept', byId.C.label === 'age >= 18', JSON.stringify(byId.C.label));
  ok('D label unquoted', byId.D.label === 'print "You may vote"', JSON.stringify(byId.D.label));
  const yes = d.edges.find(e => e.from === 'C' && e.to === 'D');
  const no = d.edges.find(e => e.from === 'C' && e.to === 'E');
  ok('yes branch labelled', yes && yes.label === 'yes', JSON.stringify(yes));
  ok('no branch labelled', no && no.label === 'no', JSON.stringify(no));
  ok('F declared once despite two refs', d.nodes.filter(n => n.id === 'F').length === 1);
  ok('layout ranks Start above End', byId.A.y < byId.F.y, byId.A.y + ' vs ' + byId.F.y);
  ok('branch siblings differ in x', byId.D.x !== byId.E.x, byId.D.x + ' vs ' + byId.E.x);
}

section('fromMermaid — pipe-label + chain + late declaration');
{
  const d = fromMermaid(`
graph TD
  A -->|first| B --> C
  B[named later]
`);
  const byId = Object.fromEntries(d.nodes.map(n => [n.id, n]));
  ok('chain makes 2 edges', d.edges.length === 2, JSON.stringify(d.edges));
  ok('pipe label captured', d.edges[0].label === 'first', JSON.stringify(d.edges[0]));
  ok('second edge unlabelled', d.edges[1].label === undefined);
  ok('late declaration renames B', byId.B.label === 'named later', byId.B.label);
  ok('bare A defaults to process', byId.A.shape === 'process');
}

section('fromMermaid — robustness');
{
  ok('empty input', fromMermaid('').nodes.length === 0);
  ok('header only', fromMermaid('flowchart TD').nodes.length === 0);
  const junk = fromMermaid('flowchart TD\n  !!!not valid!!!\n  A --> B');
  ok('bad line skipped, good line kept', junk.nodes.length === 2, JSON.stringify(junk.nodes.map(n=>n.id)));
  // a pure cycle has no zero-indegree node — layout must terminate
  const cyc = fromMermaid('flowchart TD\n A --> B\n B --> C\n C --> A');
  ok('cycle lays out without hanging', cyc.nodes.length === 3);
}

section('layout — a loop reads downward');
{
  // The return arrow (D --> C) closes a cycle. Ranking through it used to push
  // C and D one row lower on every trip around the loop until they hit the cap,
  // landing the loop body BELOW the shapes that come after the loop — a chart
  // that appears to run upward. Every loop figure in module 2.2 depends on this.
  const d = fromMermaid(
    'flowchart TD\n' +
      '  A([Start]) --> B[total = 0]\n' +
      '  B --> C{{i = 1 to 5}}\n' +
      '  C --> D[total = total + i]\n' +
      '  D --> C\n' +
      '  C --> E[/print total/]\n' +
      '  E --> F([End])',
  );
  const at = Object.fromEntries(d.nodes.map((n) => [n.id, n.y]));
  ok('loop setup sits below its own init', at.B < at.C, at.B + ' vs ' + at.C);
  ok('loop body sits below the loop setup', at.C < at.D, at.C + ' vs ' + at.D);
  ok('the return arrow does not sink the body', at.D < at.F, at.D + ' vs ' + at.F);
  ok('End is the lowest shape', Math.max(...Object.values(at)) === at.F, JSON.stringify(at));
  // The back edge must still exist — it is only excluded from ranking.
  ok('return arrow still drawn', d.edges.some((e) => e.from === 'D' && e.to === 'C'));
}

section('layout — a decision branches down and to the side');
{
  // The first answer written continues straight down in the parent's column;
  // the second finds it taken and shifts right. That is what lets the two
  // arrows leave the diamond on different sides instead of crossing.
  const d = fromMermaid(
    'flowchart TD\n' +
      '  A([Start]) --> B[/get the age/]\n' +
      '  B --> C{age >= 18}\n' +
      '  C -- yes --> D[print "You may vote"]\n' +
      '  C -- no --> E[print "Too young"]\n' +
      '  D --> F([End])\n' +
      '  E --> F',
  );
  const at = Object.fromEntries(d.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
  ok('straight run shares one column', at.A.x === at.B.x && at.B.x === at.C.x, JSON.stringify(at));
  ok('yes branch stays in the column', at.C.x === at.D.x, at.C.x + ' vs ' + at.D.x);
  ok('no branch shifts to the side', at.E.x > at.D.x, at.D.x + ' vs ' + at.E.x);
  ok('both answers sit on the same row', at.D.y === at.E.y, at.D.y + ' vs ' + at.E.y);
  ok('End rejoins under the yes branch', at.F.x === at.D.x && at.F.y > at.D.y, JSON.stringify(at.F));
}

// ---------- round trip ----------
section('toMermaid round trip');
{
  const src = 'flowchart TD\n A([Start]) --> B{x > 1}\n B -- yes --> C[do it]\n B -- no --> D([End])\n C --> D';
  const once = fromMermaid(src);
  const text = toMermaid(once);
  const twice = fromMermaid(text);
  ok('node count survives', twice.nodes.length === once.nodes.length, text);
  ok('edge count survives', twice.edges.length === once.edges.length, text);
  const shapes = s => s.nodes.map(n => n.shape).sort().join(',');
  ok('shapes survive', shapes(once) === shapes(twice), shapes(once) + ' -> ' + shapes(twice));
  const labels = s => s.nodes.map(n => n.label).sort().join('|');
  ok('labels survive', labels(once) === labels(twice), labels(once) + ' -> ' + labels(twice));
  ok('branch labels survive', twice.edges.filter(e => e.label).length === 2, text);
}

section('toMermaid quoting');
{
  const doc = { version: 1, nodes: [
    { id: 'x', shape: 'process', label: 'print "hi [there]"', x: 0, y: 0 },
    { id: 'y', shape: 'decision', label: 'a > b', x: 0, y: 0 },
  ], edges: [] };
  const text = toMermaid(doc);
  const back = fromMermaid(text);
  ok('punctuated label round-trips', back.nodes[0].label === 'print "hi [there]"', text + '\n -> ' + JSON.stringify(back.nodes.map(n=>n.label)));
  ok('comparison label round-trips', back.nodes[1].label === 'a > b', JSON.stringify(back.nodes.map(n=>n.label)));
  ok('shapes preserved through quoting', back.nodes[1].shape === 'decision', back.nodes[1].shape);
}

// ---------- checks ----------
const good = fromMermaid(`
flowchart TD
  A([Start]) --> B[get the age]
  B --> C{age < 13}
  C -- yes --> D[price = 8]
  C -- no --> E[price = 14]
  D --> F[/print price/]
  E --> F
  F --> G([End])
`);

section('checkDiagram — a correct diagram');
{
  const r = checkDiagram(good, DEFAULT_RULES);
  const bad = r.filter(x => !x.passed);
  ok('all default rules pass', allPassed(r), bad.map(x => x.id + ': ' + x.detail).join('\n        '));
}

section('checkDiagram — each rule catches its own defect');
function only(doc, id, count) {
  const r = checkDiagram(doc, [count === undefined ? { id } : { id, count }]);
  return r[0];
}
{
  const twoStarts = fromMermaid('flowchart TD\n A([Start]) --> C[x]\n B([Other]) --> C\n C --> Z([End])');
  const r = only(twoStarts, 'one-start');
  ok('one-start fails on two roots', !r.passed && r.offenders.length === 2, JSON.stringify(r));

  const noEnd = fromMermaid('flowchart TD\n A([Start]) --> B[x]');
  ok('has-end fails without a terminal leaf', !only(noEnd, 'has-end').passed);
  ok('has-end passes on the good doc', only(good, 'has-end').passed);

  // Regression: the starter diagram is two unconnected ovals. A Start oval
  // with nothing leading into it must not be reported as the finish.
  const bareStarter = fromMermaid('flowchart TD\n A([Start])\n Z([End])');
  const bs = only(bareStarter, 'has-end');
  ok('has-end fails on two unconnected ovals', !bs.passed, JSON.stringify(bs));
  ok('has-end does not name Start as the finish', !bs.detail.includes('Start'), bs.detail);
  const linked = fromMermaid('flowchart TD\n A([Start]) --> Z([End])');
  ok('has-end passes once Start leads to End', only(linked, 'has-end').passed);
  ok('has-end names only the End oval', only(linked, 'has-end').detail.includes('"End"'),
     only(linked, 'has-end').detail);

  const blank = { version: 1, nodes: [{ id: 'a', shape: 'process', label: '  ', x: 0, y: 0 }], edges: [] };
  const bl = only(blank, 'all-labeled');
  ok('all-labeled fails on whitespace label', !bl.passed && bl.offenders[0] === 'a', JSON.stringify(bl));

  const orphan = { version: 1, nodes: [
    { id: 'a', shape: 'terminal', label: 'Start', x: 0, y: 0 },
    { id: 'b', shape: 'terminal', label: 'End', x: 0, y: 0 },
    { id: 'c', shape: 'process', label: 'floating', x: 0, y: 0 },
  ], edges: [{ id: 'e', from: 'a', to: 'b' }] };
  const orp = only(orphan, 'no-orphans');
  ok('no-orphans finds the floater', !orp.passed && orp.offenders[0] === 'c', JSON.stringify(orp));

  const oneExit = fromMermaid('flowchart TD\n A([Start]) --> C{q}\n C -- yes --> Z([End])');
  const oe = only(oneExit, 'decision-two-exits');
  ok('decision-two-exits fails on one exit', !oe.passed && oe.offenders[0] === 'C', JSON.stringify(oe));

  const threeExit = fromMermaid('flowchart TD\n A([Start]) --> C{q}\n C -- a --> X[x]\n C -- b --> Y[y]\n C -- c --> W[w]\n X --> Z([End])\n Y --> Z\n W --> Z');
  ok('decision-two-exits fails on three exits', !only(threeExit, 'decision-two-exits').passed);

  const unlabelled = fromMermaid('flowchart TD\n A([Start]) --> C{q}\n C --> X[x]\n C -- no --> Y[y]\n X --> Z([End])\n Y --> Z');
  const ul = only(unlabelled, 'decision-labeled');
  ok('decision-labeled fails on a bare exit', !ul.passed && ul.offenders[0] === 'C', JSON.stringify(ul));
  ok('decision-labeled passes when both are labelled', only(good, 'decision-labeled').passed);
  ok('decision-labeled vacuously passes with no diamonds', only(fromMermaid('flowchart TD\n A([S]) --> Z([E])'), 'decision-labeled').passed);

  const stranded = { version: 1, nodes: [
    { id: 'a', shape: 'terminal', label: 'Start', x: 0, y: 0 },
    { id: 'b', shape: 'terminal', label: 'End', x: 0, y: 0 },
    { id: 'c', shape: 'process', label: 'unreachable', x: 0, y: 0 },
  ], edges: [{ id: 'e1', from: 'a', to: 'b' }, { id: 'e2', from: 'c', to: 'b' }] };
  // c has no incoming, so there are two roots -> reaches-end refuses to judge
  const st = only(stranded, 'reaches-end');
  ok('reaches-end defers when the start is ambiguous', !st.passed, JSON.stringify(st));

  const deadEnd = fromMermaid('flowchart TD\n A([Start]) --> B[x]\n B --> C[y]');
  ok('reaches-end fails with no End oval', !only(deadEnd, 'reaches-end').passed);
  ok('reaches-end passes on the good doc', only(good, 'reaches-end').passed);

  const selfLoop = { version: 1, nodes: [{ id: 'a', shape: 'process', label: 'x', x: 0, y: 0 }], edges: [{ id: 'e', from: 'a', to: 'a' }] };
  ok('no-self-loop catches it', !only(selfLoop, 'no-self-loop').passed);
  ok('no-self-loop passes on the good doc', only(good, 'no-self-loop').passed);

  ok('min-decisions 1 passes', only(good, 'min-decisions', 1).passed);
  ok('min-decisions 2 fails', !only(good, 'min-decisions', 2).passed);
  ok('min-process 2 passes', only(good, 'min-process', 2).passed, JSON.stringify(only(good, 'min-process', 2)));
  ok('min-nodes 99 fails', !only(good, 'min-nodes', 99).passed);

  const unknown = checkDiagram(good, [{ id: 'not-a-rule' }]);
  ok('unknown rule id fails loudly', !unknown[0].passed, JSON.stringify(unknown[0]));
}

section('checkDiagram — empty canvas');
{
  const r = checkDiagram({ version: 1, nodes: [], edges: [] }, DEFAULT_RULES);
  ok('empty canvas does not pass', !allPassed(r));
  ok('empty canvas produces no crash', r.length === DEFAULT_RULES.length);
}

section('checkDiagram — edge pointing at a deleted node');
{
  const doc = { version: 1, nodes: [
    { id: 'a', shape: 'terminal', label: 'Start', x: 0, y: 0 },
    { id: 'b', shape: 'terminal', label: 'End', x: 0, y: 0 },
  ], edges: [
    { id: 'e1', from: 'a', to: 'b' },
    { id: 'e2', from: 'a', to: 'ghost' },
  ] };
  const r = checkDiagram(doc, DEFAULT_RULES);
  ok('dangling edge ignored, diagram still valid', allPassed(r),
     r.filter(x => !x.passed).map(x => x.id + ': ' + x.detail).join('; '));
}

// ---------- the four programming shapes added after the book's basic set ----------
section('fromMermaid — subroutine / preparation / connector / comment');
{
  const d = fromMermaid(`
flowchart TD
  A([Start]) --> P{{i = 0 to 9}}
  P --> S[[drawScore()]]
  S --> C1((A))
  C2((A)) --> Z([End])
  N>remember to reset the score]
`);
  const byId = Object.fromEntries(d.nodes.map(n => [n.id, n]));
  ok('subroutine parsed from [[..]]', byId.S.shape === 'subroutine', byId.S.shape);
  ok('preparation parsed from {{..}}', byId.P.shape === 'preparation', byId.P.shape);
  ok('connector parsed from ((..))', byId.C1.shape === 'connector', byId.C1.shape);
  ok('comment parsed from >..]', byId.N.shape === 'comment', byId.N.shape);
  ok('subroutine label intact', byId.S.label === 'drawScore()', byId.S.label);
  ok('preparation label intact', byId.P.label === 'i = 0 to 9', byId.P.label);
  ok('comment label intact', byId.N.label === 'remember to reset the score', byId.N.label);
  // {{..}} must win over {..}, [[..]] over [..], ((..)) over (..)
  ok('decision still parses as decision', fromMermaid('flowchart TD\n X{q}').nodes[0].shape === 'decision');
  ok('process still parses as process', fromMermaid('flowchart TD\n X[t]').nodes[0].shape === 'process');
  ok('rounded terminal still parses', fromMermaid('flowchart TD\n X(t)').nodes[0].shape === 'terminal');
}

section('toMermaid round trip — new shapes');
{
  const src = 'flowchart TD\n A([S]) --> P{{i = 0 to 9}}\n P --> S[[draw()]]\n S --> C((A))\n N>a note]';
  const once = fromMermaid(src);
  const twice = fromMermaid(toMermaid(once));
  const shapes = s => s.nodes.map(n => n.shape).sort().join(',');
  ok('shapes survive a round trip', shapes(once) === shapes(twice), shapes(once) + ' -> ' + shapes(twice));
  const labels = s => s.nodes.map(n => n.label).sort().join('|');
  ok('labels survive a round trip', labels(once) === labels(twice), labels(once) + ' -> ' + labels(twice));
}

section('checkDiagram — notes sit outside the flow');
{
  // A valid chart plus a floating note. The note must not read as a second
  // start, a floating shape, or an unreachable shape.
  const withNote = fromMermaid(`
flowchart TD
  A([Start]) --> B[do it]
  B --> Z([End])
  N>this is a note]
`);
  const r = checkDiagram(withNote, DEFAULT_RULES);
  const failed = r.filter(x => !x.passed);
  ok('a note does not break any default rule', allPassed(r),
     failed.map(x => x.id + ': ' + x.detail).join('\n        '));
  ok('note is not counted as a second start', only(withNote, 'one-start').passed);
  ok('note is not called floating', only(withNote, 'no-orphans').passed);
  ok('note is not called unreachable', only(withNote, 'reaches-end').passed);
  ok('a blank note still fails all-labeled',
     !only(fromMermaid('flowchart TD\n A([S]) --> Z([E])\n N>]'), 'all-labeled').passed);
  ok('min-nodes ignores notes', !only(withNote, 'min-nodes', 4).passed,
     JSON.stringify(only(withNote, 'min-nodes', 4)));
}

section('checkDiagram — connectors are one logical point');
{
  // Start -> A ... A -> End. Without pairing, "End" is unreachable and the
  // landing connector looks like a second start.
  const jump = fromMermaid(`
flowchart TD
  S([Start]) --> T[do it]
  T --> C1((A))
  C2((A)) --> Z([End])
`);
  const r = checkDiagram(jump, DEFAULT_RULES);
  const failed = r.filter(x => !x.passed);
  ok('a matched connector pair keeps the chart valid', allPassed(r),
     failed.map(x => x.id + ': ' + x.detail).join('\n        '));
  ok('landing connector is not a second start', only(jump, 'one-start').passed);
  ok('flow crosses the jump to reach End', only(jump, 'reaches-end').passed);
  ok('matched pair passes connector-pairs', only(jump, 'connector-pairs').passed);

  const lonely = fromMermaid('flowchart TD\n S([Start]) --> C1((A))\n C1 --> Z([End])');
  const lp = only(lonely, 'connector-pairs');
  ok('a connector with no partner fails', !lp.passed, JSON.stringify(lp));

  const blankConn = fromMermaid('flowchart TD\n S([Start]) --> C1(( ))\n C1 --> Z([End])');
  ok('an unlabelled connector fails connector-pairs', !only(blankConn, 'connector-pairs').passed);

  ok('connector-pairs vacuously passes with no connectors',
     only(fromMermaid('flowchart TD\n A([S]) --> Z([E])'), 'connector-pairs').passed);

  // Case and spacing should not stop two halves matching.
  const casey = fromMermaid('flowchart TD\n S([Start]) --> C1((a))\n C2(( A )) --> Z([End])');
  ok('pairing ignores case and spacing', only(casey, 'connector-pairs').passed,
     JSON.stringify(only(casey, 'connector-pairs')));
}

section('checkDiagram — subroutine and loop setup behave like tasks');
{
  const d = fromMermaid(`
flowchart TD
  A([Start]) --> P{{i = 0 to 9}}
  P --> S[[drawRow()]]
  S --> Z([End])
`);
  const r = checkDiagram(d, DEFAULT_RULES);
  ok('function call + loop setup chart is valid', allPassed(r),
     r.filter(x => !x.passed).map(x => x.id + ': ' + x.detail).join('; '));
  ok('a floating subroutine is still caught',
     !only(fromMermaid('flowchart TD\n A([S]) --> Z([E])\n S[[orphan()]]'), 'no-orphans').passed);
}

section('describeDiagram');
{
  const text = describeDiagram(good);
  ok('includes mermaid fence', text.includes('```mermaid'));
  ok('names the decision shape in prose', text.includes('Decision (diamond)'), text.slice(0, 200));
  ok('states branch labels in prose', text.includes('on "yes" goes to'), text);
  ok('counts shapes', text.includes('7 shapes, 7 arrows'), text.match(/\d+ shapes, \d+ arrows/));
}

console.log('\n' + (fails === 0 ? 'ALL PASS' : fails + ' FAILURE(S)'));
process.exit(fails === 0 ? 0 : 1);
