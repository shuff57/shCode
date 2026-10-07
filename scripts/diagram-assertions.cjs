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
const { nextFreeSlot } = require(LIB + '/diagram-layout.js');
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

section('checkDiagram — reaches-end catches a branch that never finishes');
{
  // The defect this closes: reaches-end used to ask only "can Start get to
  // every shape, and is SOME End oval reached". Both are true here, and the
  // "no" branch still stops dead on a process box. It is the exact mistake
  // 1.5.30's own text warns about, and the rule passed it.
  const deadBranch = fromMermaid(`
flowchart TD
  A([Start]) --> B{age >= 18}
  B -- yes --> C[/print "You may vote"/]
  C --> Z([End])
  B -- no --> D[print Too young]
`);
  const r = only(deadBranch, 'reaches-end');
  ok('a branch that stops on a task box fails', !r.passed, JSON.stringify(r));
  ok('the dead end is named', /Too young/.test(r.detail), r.detail);
  ok('the dead end is highlightable', r.offenders.length === 1, JSON.stringify(r.offenders));
  // The half that already worked must keep working.
  ok('every shape still reachable is not enough on its own',
     only(deadBranch, 'no-orphans').passed);

  // A loop with no exit reaches no End either — 2-4-22's whole subject.
  const noExit = fromMermaid(`
flowchart TD
  A([Start]) --> B[count = 0]
  B --> C[count = count + 1]
  C --> B
  A --> Z([End])
`);
  ok('a loop with no way out fails', !only(noExit, 'reaches-end').passed);

  // And a correct chart with BOTH branches finishing still passes.
  const good = fromMermaid(`
flowchart TD
  A([Start]) --> B{age >= 18}
  B -- yes --> C[/print "You may vote"/]
  B -- no --> D[print Too young]
  C --> Z([End])
  D --> Z
`);
  ok('both branches reaching End passes', only(good, 'reaches-end').passed,
     JSON.stringify(only(good, 'reaches-end')));
  ok('the whole correct chart is still valid', allPassed(checkDiagram(good, DEFAULT_RULES)),
     checkDiagram(good, DEFAULT_RULES).filter(x => !x.passed).map(x => x.id + ': ' + x.detail).join('; '));
}

section('fromMermaid — quoted edge labels');
{
  const d = fromMermaid('flowchart TD\n  A{ok?} -- "yes" --> B[go]\n  A -->|"no"| C[stop]\n  A -- maybe --> C');
  ok('quotes are stripped from -- "yes" -->', d.edges[0].label === 'yes', JSON.stringify(d.edges[0]));
  ok('quotes are stripped from -->|"no"|', d.edges[1].label === 'no', JSON.stringify(d.edges[1]));
  ok('an unquoted label is unchanged', d.edges[2].label === 'maybe', JSON.stringify(d.edges[2]));
  const rt = fromMermaid(toMermaid(d));
  ok('round trip keeps the unquoted labels', rt.edges.map(e => e.label).join() === 'yes,no,maybe', JSON.stringify(rt.edges.map(e => e.label)));
}

section('nextFreeSlot — palette shapes do not stack');
{
  const size = { w: 176, h: 72 };
  const origin = { x: 40, y: 40 };
  const place = () => {
    const rs = [];
    for (let i = 0; i < 10; i++) rs.push({ ...nextFreeSlot(rs, size, origin), ...size });
    return rs;
  };
  const rs = place();
  let overlap = false;
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    const a = rs[i], b = rs[j];
    if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) overlap = true;
  }
  ok('10 shapes added in sequence never overlap', !overlap, JSON.stringify(rs));
  ok('same inputs give the same slots', JSON.stringify(place()) === JSON.stringify(rs));
  const first = nextFreeSlot([], size, origin);
  ok('empty canvas uses the origin', first.x === 40 && first.y === 40, JSON.stringify(first));
  // Slot 0 and slot 2 taken: the first free one is slot 1.
  const step = size.w + 40;
  const gap = nextFreeSlot([
    { x: 40, y: 40, ...size }, { x: 40 + 2 * step, y: 40, ...size },
  ], size, origin);
  ok('first free slot in a gap is used', gap.x === 40 + step && gap.y === 40, JSON.stringify(gap));
  const beside = nextFreeSlot([{ x: 40, y: 40, ...size }], size, origin);
  ok('occupied origin lands beside, not on', beside.x >= 40 + size.w && beside.y === 40, JSON.stringify(beside));
  const crowded = [];
  for (let i = 0; i < 300; i++) crowded.push({ x: 40 + (i % 4) * step, y: 40 + Math.floor(i / 4) * 112, ...size });
  const fb = nextFreeSlot(crowded, size, origin);
  ok('a full grid falls back to a finite position', Number.isFinite(fb.x) && Number.isFinite(fb.y));
}

section('describeDiagram');
{
  const text = describeDiagram(good);
  ok('includes mermaid fence', text.includes('```mermaid'));
  ok('names the decision shape in prose', text.includes('Decision (diamond)'), text.slice(0, 200));
  ok('states branch labels in prose', text.includes('on "yes" goes to'), text);
  ok('counts shapes', text.includes('7 shapes, 7 arrows'), text.match(/\d+ shapes, \d+ arrows/));
}


// ---------- hybrid scoring (lib/diagram-score.ts) ----------
const SC = require(LIB + '/diagram-score.js');
{
  const D = (mmd) => fromMermaid('flowchart TD\n' + mmd);
  const item = (points, check, id = 'x') => ({ id, title: id, points, check });
  const one = (mmd, check, points = 7) => SC.scoreDiagram(D(mmd), [item(points, check)]).criteria[0];
  const CALL = { kind: 'subroutine' };

  section('score: count');
  const REF = `
  A([Start])
  B[set it]
  C[[call it]]
  Q{ok?}
  P[/print yes/]
  R[/print no/]
  Z([End])
  A --> B
  B --> C
  C --> Q
  Q -- yes --> P
  Q -- no --> R
  P --> Z
  R --> Z`;
  ok('count: one call shape on the path earns it', one(REF, { steps: [{ op: 'count', match: CALL, min: 1 }] }).earned === 7);
  ok('count: rectangle instead of call earns 0', one(REF.replace('C[[call it]]', 'C[call it]'), { steps: [{ op: 'count', match: CALL, min: 1 }] }).earned === 0);
  const DECOY = `
  A([Start])
  B[set it]
  X[[decoy call]]
  Z([End])
  A --> B
  B --> Z
  B --> X`;
  ok('count: a call on a dead-end side branch is off the path and does not count', one(DECOY, { steps: [{ op: 'count', match: CALL, min: 1 }] }).earned === 0);
  const FLOAT = `
  A([Start])
  B[set it]
  Z([End])
  X[[floating call]]
  A --> B
  B --> Z`;
  ok('count: a floating (unconnected) call does not count', one(FLOAT, { steps: [{ op: 'count', match: CALL, min: 1 }] }).earned === 0);
  const CONN = `
  A([Start])
  K1((J))
  K2((J))
  C[[call it]]
  Z([End])
  A --> K1
  K2 --> C
  C --> Z`;
  ok('count: a connector pair is ONE logical node (min 2 connectors fails, min 1 passes)',
    one(CONN, { steps: [{ op: 'count', match: { kind: 'connector' }, min: 2 }] }).earned === 0 &&
    one(CONN, { steps: [{ op: 'count', match: { kind: 'connector' }, min: 1 }] }).earned === 7);
  ok('count: a call still counts across a connector jump', one(CONN, { steps: [{ op: 'count', match: CALL, min: 1 }] }).earned === 7);
  const NOTE = REF + `\n  N>a note beside the chart]`;
  ok('count: a note shape is dropped and never counts', one(NOTE, { steps: [{ op: 'count', match: { kind: 'comment' }, min: 1 }] }).earned === 0);
  const TWO = `
  A([Start])
  B[[first]]
  C[[second]]
  Q{ok?}
  P[/yes/]
  R[/no/]
  Z([End])
  A --> B
  B --> C
  C --> Q
  Q -- yes --> P
  Q -- no --> R
  P --> Z
  R --> Z`;
  const ONEOFTWO = TWO.replace('C[[second]]', 'C[second]');
  const lin = { scale: 'linear', steps: [{ op: 'count', match: CALL, min: 2 }] };
  ok('count linear: both calls earn the full 7', one(TWO, lin).earned === 7 && one(TWO, lin).verdict === 'met');
  ok('count linear: one of two earns 3.5 (partial)', one(ONEOFTWO, lin).earned === 3.5 && one(ONEOFTWO, lin).verdict === 'partial', JSON.stringify(one(ONEOFTWO, lin)));
  ok('count linear: none earns 0 (missing)', one(ONEOFTWO.replace('B[[first]]', 'B[first]'), lin).earned === 0);
  ok('count (not linear): one of two earns 0', one(ONEOFTWO, { steps: [{ op: 'count', match: CALL, min: 2 }] }).earned === 0);
  ok('count: default fail line says what is missing and gives the count, no label',
    /at least 2 function-call shapes.*yours has 1/.test(one(ONEOFTWO, lin).feedback), one(ONEOFTWO, lin).feedback);
  ok('count: max is enforced', one(TWO, { steps: [{ op: 'count', match: CALL, min: 1, max: 1 }] }).earned === 0);
  ok('matcher: re is ORed, case-folded and not: excludes',
    one(REF, { steps: [{ op: 'count', match: { kind: 'process', re: ['zzz', 'SET'] }, min: 1 }] }).earned === 7 &&
    one(REF, { steps: [{ op: 'count', match: { kind: 'process', re: 'set', not: { re: 'it$' } }, min: 1 }] }).earned === 0);

  section('score: sequence (dominator chain)');
  const seq = (mmd, of) => one(mmd, { steps: [{ op: 'sequence', of }] }).earned === 7;
  const CD = [CALL, { kind: 'decision' }];
  ok('sequence: reference order accepted', seq(REF, CD));
  ok('sequence: an extra step between call and decision is tolerated', seq(REF.replace('C --> Q', 'C --> E1[hold it]\n  E1 --> Q'), CD));
  ok('sequence: a join node before the decision is tolerated', seq(REF.replace('B --> C', 'B --> J[join]\n  J --> C'), CD));
  ok('sequence: a connector pair between them is tolerated', seq(REF.replace('C --> Q', 'C --> K1((J))\n  K2((J)) --> Q'), CD));
  ok('sequence: decision BEFORE the call is rejected', !seq(`
  A([Start])
  Q{ok?}
  C[[call it]]
  P[/yes/]
  Z([End])
  A --> Q
  Q -- yes --> C
  Q -- no --> P
  C --> Z
  P --> Z`, CD));
  ok('sequence: a call on one branch only (does not dominate the decision) is rejected', !seq(`
  A([Start])
  Q0{first?}
  C[[call it]]
  E[step]
  Q{ok?}
  P[/yes/]
  R[/no/]
  Z([End])
  A --> Q0
  Q0 -- yes --> C
  Q0 -- no --> E
  C --> Q
  E --> Q
  Q -- yes --> P
  Q -- no --> R
  P --> Z
  R --> Z`, CD));
  const CCD = [CALL, CALL, { kind: 'decision' }];
  ok('sequence: call, call, decision accepted', seq(TWO, CCD));
  ok('sequence: calls on separate branches rejected', !seq(`
  A([Start])
  Q0{pick}
  B[[first]]
  C[[second]]
  Q{ok?}
  Z([End])
  A --> Q0
  Q0 -- yes --> B
  Q0 -- no --> C
  B --> Q
  C --> Q
  Q -- yes --> Z
  Q -- no --> Z`, CCD));
  ok('sequence: a decision BETWEEN the two calls rejected', !seq(`
  A([Start])
  B[[first]]
  Q{ok?}
  C[[second]]
  E[step]
  Z([End])
  A --> B
  B --> Q
  Q -- yes --> C
  Q -- no --> E
  C --> Z
  E --> Z`, CCD));
  ok('sequence: one call cannot satisfy two slots (distinct nodes)', !seq(REF, CCD));

  section('score: loop-exit / cycles');
  const LOOP = `
  A([Start])
  B[count = 0]
  H{{for each}}
  D{small?}
  E[add one]
  F[/print count/]
  Z([End])
  A --> B
  B --> H
  H -- next --> D
  D -- yes --> E
  D -- no --> H
  E --> H
  H -- done --> F
  F --> Z`;
  const LX = { steps: [{ op: 'loop-exit', loop: { kind: 'preparation' }, minAfter: 1, from: 'loop' }] };
  ok('loop-exit: print after the loop accepted', one(LOOP, LX).earned === 7);
  ok('loop-exit: a join on the return arrow accepted', one(LOOP.replace('D -- no --> H', 'D -- no --> J[next]\n  J --> H').replace('E --> H', 'E --> J'), LX).earned === 7);
  ok('loop-exit: edge labels are never read (swap them)', one(LOOP.replace('H -- done --> F', 'H -- next --> F').replace('H -- next --> D', 'H -- done --> D'), LX).earned === 7);
  ok('loop-exit: print INSIDE the loop (exit goes straight to End) rejected',
    one(LOOP.replace('H -- done --> F\n  F --> Z', 'H -- done --> Z').replace('E --> H', 'E --> F\n  F --> H'), LX).earned === 0);
  ok('loop-exit: no loop at all rejected', one(`
  A([Start])
  H{{setup}}
  F[/print/]
  Z([End])
  A --> H
  H --> F
  F --> Z`, LX).earned === 0);
  ok('loop-exit: hexagon on no cycle (setup only, a diamond does the looping) rejected', one(`
  A([Start])
  H{{i = 0}}
  D{more?}
  E[body]
  F[/print/]
  Z([End])
  A --> H
  H --> D
  D -- yes --> E
  E --> D
  D -- no --> F
  F --> Z`, LX).earned === 0);
  ok('loop-exit from:any accepts that same chart when the diamond is the head', one(`
  A([Start])
  H{{i = 0}}
  D{more?}
  E[body]
  F[/print/]
  Z([End])
  A --> H
  H --> D
  D -- yes --> E
  E --> D
  D -- no --> F
  F --> Z`, { steps: [{ op: 'loop-exit', loop: { kind: 'decision' }, minAfter: 1, from: 'any' }] }).earned === 7);
  ok('loop-exit: minAfter 2 needs two steps after the loop', one(LOOP, { steps: [{ op: 'loop-exit', loop: { kind: 'preparation' }, minAfter: 2 }] }).earned === 0 &&
    one(LOOP.replace('F --> Z', 'F --> G[tidy]\n  G --> Z'), { steps: [{ op: 'loop-exit', loop: { kind: 'preparation' }, minAfter: 2 }] }).earned === 7);
  ok('in-cycle: the hexagon is in the repeat', one(LOOP, { steps: [{ op: 'in-cycle', match: { kind: 'preparation' } }] }).earned === 7);
  ok('in-cycle: the print is not', one(LOOP, { steps: [{ op: 'in-cycle', match: { kind: 'io' } }] }).earned === 0);
  ok('not-in-cycle: the print is outside, the hexagon is not', one(LOOP, { steps: [{ op: 'not-in-cycle', match: { kind: 'io' } }] }).earned === 7 &&
    one(LOOP, { steps: [{ op: 'not-in-cycle', match: { kind: 'preparation' } }] }).earned === 0);
  ok('in-cycle: a shape that is not there fails', one(LOOP, { steps: [{ op: 'in-cycle', match: { kind: 'subroutine' } }] }).earned === 0);

  section('score: branch and label');
  const br = (mmd, step) => one(mmd, { steps: [Object.assign({ op: 'branch' }, step)] }).earned === 7;
  ok('branch: two different results accepted', br(REF, { at: { kind: 'decision' }, yes: { kind: 'io' }, no: { kind: 'io' }, distinct: true }));
  ok('branch: both exits to the same node rejected with distinct', !br(REF.replace('Q -- no --> R', 'Q -- no --> P'), { at: { kind: 'decision' }, yes: { kind: 'io' }, no: { kind: 'io' }, distinct: true }));
  ok('branch: orientation any accepts yes/no swapped',
    br(REF, { at: { kind: 'decision' }, yes: { kind: 'io', re: 'print yes' }, no: { kind: 'io', re: 'print no' } }) &&
    br(REF.replace('Q -- yes --> P\n  Q -- no --> R', 'Q -- yes --> R\n  Q -- no --> P'), { at: { kind: 'decision' }, yes: { kind: 'io', re: 'print yes' }, no: { kind: 'io', re: 'print no' } }));
  ok('branch: orientation labelled follows the yes/no labels',
    br(REF, { at: { kind: 'decision' }, yes: { re: 'print yes' }, no: { re: 'print no' }, orientation: 'labelled' }) &&
    !br(REF.replace('Q -- yes --> P\n  Q -- no --> R', 'Q -- yes --> R\n  Q -- no --> P'), { at: { kind: 'decision' }, yes: { re: 'print yes' }, no: { re: 'print no' }, orientation: 'labelled' }));
  ok('label: opt-in label read on the path', one(REF, { steps: [{ op: 'label', match: { re: 'set' }, min: 1 }] }).earned === 7 && one(REF, { steps: [{ op: 'label', match: { re: 'banana' }, min: 1 }] }).earned === 0);

  section('score: bad charts and messages');
  ok('no Start (everything has an incoming arrow) scores 0 with a fix-structure line',
    /structure first/i.test(one(`
  B[a]
  C[b]
  B --> C
  C --> B`, { steps: [{ op: 'count', match: {}, min: 1 }] }).feedback));
  ok('author fail/pass lines are used verbatim', one(REF.replace('C[[call it]]', 'C[call it]'), { steps: [{ op: 'count', match: CALL, min: 1, fail: 'FAILLINE' }] }).feedback === 'FAILLINE' &&
    one(REF, { steps: [{ op: 'count', match: CALL, min: 1, pass: 'PASSLINE' }] }).feedback === 'PASSLINE');
  ok('offenders name real node ids for a failed loop-exit', Array.isArray(one(LOOP.replace('H -- done --> F\n  F --> Z', 'H -- done --> Z').replace('E --> H', 'E --> F\n  F --> H'), LX).offenders));

  section('splitRubric / gate / mergeGrade');
  const rub = [{ id: 'a', points: 7, check: { steps: [] } }, { id: 'b', points: 2 }, { id: 'c', points: 7, check: { steps: [] } }];
  const sp = SC.splitRubric(rub);
  ok('splitRubric: items with a check are the rule items, the rest go to the model', sp.ruleItems.map((r) => r.id).join() === 'a,c' && sp.aiItems.map((r) => r.id).join() === 'b');
  ok('splitRubric: no check anywhere leaves ruleItems empty (behaves exactly as before)', SC.splitRubric([{ id: 'z', points: 1 }]).ruleItems.length === 0);
  const gate = { anyOf: ['base|\\b100\\b', 'price|tax'], min: 2, capTo: 13, fail: 'GATEFAIL' };
  const g1 = SC.evalGate(D(`A([Start])\n  B[set base]\n  C[tax price]\n  Z([End])\n  A --> B\n  B --> C\n  C --> Z`), gate);
  const g2 = SC.evalGate(D(`A([Start])\n  B[set base]\n  C[x]\n  Z([End])\n  A --> B\n  B --> C\n  C --> Z`), gate);
  ok('gate: counts token groups across all labels; passes at min', g1.matched === 2 && g1.passed);
  ok('gate: one group is below min', g2.matched === 1 && !g2.passed);
  ok('gate: a comment does not satisfy it', SC.evalGate(D(`A([Start])\n  B[set base]\n  N>tax price]\n  Z([End])\n  A --> B\n  B --> Z`), gate).matched === 1);
  ok('gate: absent gate is null', SC.evalGate(D('A([Start])\n  Z([End])\n  A --> Z'), null) === null);

  const items = [item(7, { steps: [{ op: 'count', match: CALL, min: 1 }] }, 'call'), item(7, { steps: [{ op: 'sequence', of: CD }] }, 'order')];
  const aiItems = [{ id: 'w1', title: 'W1', points: 2 }, { id: 'w2', title: 'W2', points: 2 }, { id: 'w3', title: 'W3', points: 2 }];
  const aiRes = { totalEarned: 5, totalPossible: 6, criteria: [{ id: 'w1', earned: 2, max: 2, verdict: 'met', feedback: 'f1' }, { id: 'w2', earned: 2, max: 2, verdict: 'met', feedback: 'f2' }, { id: 'w3', earned: 1, max: 2, verdict: 'partial', feedback: 'f3' }], summary: 'AISUM', hints: ['h'] };
  const gateRef = { anyOf: ['set it', 'call it', 'print'], min: 2, capTo: 13, fail: 'GATEFAIL' };
  const det = SC.scoreDiagram(D(REF), items, gateRef);
  const m = SC.mergeGrade(det, aiRes, aiItems);
  ok('mergeGrade: rule + AI totals (14 + 5 = 19 of 20)', m.totalEarned === 19 && m.totalPossible === 20, JSON.stringify([m.totalEarned, m.totalPossible]));
  ok('mergeGrade: rule criteria first, then AI, with source tags', m.criteria.map((c) => c.id + ':' + c.source).join() === 'call:rules,order:rules,w1:ai,w2:ai,w3:ai', m.criteria.map((c) => c.id).join());
  ok('mergeGrade: AI criteria keep their titles; summary names both halves; hints from AI only',
    m.criteria[2].title === 'W1' && /Shapes and order: 14 of 14\. Wording: 5 of 6\./.test(m.summary) && m.summary.includes('AISUM') && m.hints.join() === 'h');
  ok('mergeGrade: gate passing leaves the total alone', !m.capped);
  const detBad = SC.scoreDiagram(D(REF.replace(/set it|call it|ok\?|print yes|print no/g, 'x')), items, gateRef);
  ok('gate: relabelling everything leaves the rule points at 14', detBad.earned === 14 && detBad.gate && !detBad.gate.passed);
  const mc = SC.mergeGrade(detBad, aiRes, aiItems);
  ok('mergeGrade: a failed gate caps the TOTAL at capTo (19 -> 13), says why, still 20 possible', mc.totalEarned === 13 && mc.totalPossible === 20 && mc.capped === true && mc.summary.includes('GATEFAIL'), mc.summary);
  ok('mergeGrade: a cap never RAISES a lower total', SC.mergeGrade(SC.scoreDiagram(D(REF.replace('C[[call it]]', 'C[call it]').replace(/set it|ok\?/g, 'x')), items, gateRef), { ...aiRes, totalEarned: 0, criteria: aiRes.criteria.map((c) => ({ ...c, earned: 0, verdict: 'missing' })) }, aiItems).totalEarned === 0);
  const mn = SC.mergeGrade(det, null, aiItems);
  ok('mergeGrade: AI null lists the AI items as zero, rules intact (the server never records this shape)', mn.criteria.length === 5 && mn.totalEarned === 14 && mn.criteria.slice(2).every((c) => c.earned === 0 && c.source === 'ai'));
  ok('mergeGrade: every item rule-scored (no AI) has no Wording line', !/Wording/.test(SC.mergeGrade(det, null, []).summary));

  // The summary states the authoritative numbers first, labels the model's text, and says "Not passed yet" below the pass line.
  const aiGood = { ...aiRes, summary: 'Excellent work! You earned all 6 points on this rubric.', totalEarned: 6, criteria: aiRes.criteria.map((c) => ({ ...c, earned: c.max, verdict: 'met' })) };
  const detLow = { ...det, earned: 7, criteria: det.criteria.map((c, i) => (i === 0 ? { ...c, earned: 0, verdict: 'missing' } : c)) }; // one 7-point rule item lost: 7 of 14
  const mlow = SC.mergeGrade(detLow, aiGood, aiItems);
  ok('mergeGrade: a 13/20 summary starts with the authoritative line', mlow.totalEarned === 13 && mlow.summary.startsWith('Shapes and order: 7 of 14. Wording: 6 of 6. Total 13 of 20 (pass at 14).'), mlow.summary);
  ok('mergeGrade: below the pass line says Not passed yet BEFORE the model text, which is labelled and unedited',
    mlow.summary.includes('Not passed yet.') && mlow.summary.indexOf('Not passed yet.') < mlow.summary.indexOf('Wording feedback: Excellent work! You earned all 6 points on this rubric.'), mlow.summary);
  const mfull = SC.mergeGrade(det, { ...aiGood }, aiItems);
  ok('mergeGrade: a 20/20 has the authoritative line, no Not passed yet', mfull.totalEarned === 20 && mfull.summary.startsWith('Shapes and order: 14 of 14. Wording: 6 of 6. Total 20 of 20 (pass at 14).') && !/Not passed yet/.test(mfull.summary), mfull.summary);
  ok('mergeGrade: a capped total also says Not passed yet', /Not passed yet/.test(mc.summary) && mc.summary.includes('Total 13 of 20'));
  ok('mergeGrade: no AI text means no Wording feedback label', !/Wording feedback/.test(SC.mergeGrade(det, { ...aiRes, summary: '' }, aiItems).summary));

  section('score: regexes cannot hang');
  {
    // Every regex any lesson ships (check re + gate groups) against worst-case 300-char labels.
    const fs = require('fs');
    const path = require('path');
    const lessonsDir = path.resolve(__dirname, '..', 'lessons');
    const pats = [];
    const walk = (v) => { if (v && typeof v === 'object') { if (typeof v.re === 'string') pats.push(v.re); if (Array.isArray(v.re)) pats.push(...v.re); for (const k of Object.keys(v)) walk(v[k]); } };
    for (const id of fs.readdirSync(lessonsDir)) {
      const f = path.join(lessonsDir, id, 'lesson.json');
      if (!fs.existsSync(f)) continue;
      const g = JSON.parse(fs.readFileSync(f, 'utf8')).diagram?.aiGrader;
      if (!g) continue;
      for (const r of g.rubric || []) if (r.check) walk(r.check);
      if (g.gate) pats.push(...g.gate.anyOf);
    }
    const worst = ['a'.repeat(300), 'ab'.repeat(150), ('x '.repeat(150)), '('.repeat(300), '1'.repeat(300), ('aaaa!'.repeat(60))];
    let slowest = 0;
    for (const p of pats) for (const w of worst) {
      const re = new RegExp(p, 'iu');
      const t0 = process.hrtime.bigint();
      re.test(SC.foldLabel(w));
      slowest = Math.max(slowest, Number(process.hrtime.bigint() - t0) / 1e6);
    }
    ok(`every shipped pattern (${pats.length}) tests a 300-char worst-case label in under 20 ms (slowest ${slowest.toFixed(2)} ms)`, pats.length > 0 && slowest < 20);
    // And the whole scorer on a 200-node chain with a back edge, against the time budget.
    const nodes = [{ id: 'n0', shape: 'terminal', label: 'Start', x: 0, y: 0 }];
    const edges = [];
    for (let i = 1; i < 199; i++) { nodes.push({ id: 'n' + i, shape: i % 7 === 0 ? 'subroutine' : i % 5 === 0 ? 'decision' : 'process', label: 'step ' + i, x: 0, y: i }); edges.push({ id: 'e' + i, from: 'n' + (i - 1), to: 'n' + i }); }
    nodes.push({ id: 'nz', shape: 'terminal', label: 'End', x: 0, y: 999 });
    edges.push({ id: 'ez', from: 'n198', to: 'nz' }, { id: 'eb', from: 'n150', to: 'n20' });
    const big = { version: 1, nodes, edges };
    const t0 = Date.now();
    const bigScore = SC.scoreDiagram(big, [item(7, { steps: [{ op: 'sequence', of: [CALL, CALL, CALL, { kind: 'decision' }] }, { op: 'loop-exit', loop: { kind: 'process' }, from: 'any' }] })]);
    ok(`a 200-node chart scores in well under a second (${Date.now() - t0} ms)`, Date.now() - t0 < 1000 && typeof bigScore.earned === 'number');
  }
}

console.log('\n' + (fails === 0 ? 'ALL PASS' : fails + ' FAILURE(S)'));
process.exit(fails === 0 ? 0 : 1);
