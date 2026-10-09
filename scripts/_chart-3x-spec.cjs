// Single source for the nine rules-only chart graders of modules 3.4-3.8 (applied by
// scripts/apply-chart-3x.cjs, pinned by scripts/test-diagram-charts-3x.mjs).
// Every item is scored from shape KINDS and arrow TOPOLOGY (lib/diagram-score.ts); labels are read
// only by the relevance gate, which can lower the total and never raises it.
const K = (kind) => ({ kind });
const seq = (of, fail, pass) => ({ op: 'sequence', of, fail, pass });
const cnt = (kind, min, fail, pass, max) => ({ op: 'count', match: K(kind), min, ...(max ? { max } : {}), fail, pass });
const cyc = (kind, fail, pass) => ({ op: 'in-cycle', match: K(kind), fail, pass });
const ncyc = (kind, fail, pass) => ({ op: 'not-in-cycle', match: K(kind), fail, pass });
const loopExit = (fail, pass) => ({ op: 'loop-exit', loop: K('preparation'), minAfter: 1, from: 'any', orSetup: true, fail, pass });
const branch = (yes, no, fail, pass) => ({ op: 'branch', at: K('decision'), distinct: true, ...(yes ? { yes } : {}), ...(no ? { no } : {}), fail, pass });
const branchL = (yes, no, fail, pass) => ({ op: 'branch', at: K('decision'), orientation: 'labelled', distinct: true, ...(yes ? { yes } : {}), ...(no ? { no } : {}), fail, pass });
const item = (id, title, points, description, ...steps) => ({ id, title, points, description, check: { steps } });
const GATE = (anyOf) => ({ anyOf, min: 3, capTo: 13, fail: 'None of your shapes say what this program does. Label each shape in your own words.' });

const LOOP_ITEMS = (what, exitWhat) => [
  item('hexagon', 'The loop is drawn with the loop-setup hexagon', 6, 'Scored by the editor (shape kind): a loop-setup (hexagon) shape on the Start-to-End path.',
    cnt('preparation', 1, 'A for-loop header has its own shape, the loop-setup hexagon from the shape palette. None of the shapes on your path is one.', 'A loop-setup hexagon is on the path.')),
  item('way-out', exitWhat, 7, 'Scored by the editor (arrow order): the steps that repeat have an arrow leading back, and the arrow that leaves the repeat leads on to a step that runs once, before End.',
    loopExit('Two things must hold: the steps that run each time round must have an arrow leading back (to the hexagon, or to the diamond that asks whether there is another), and the arrow that leaves that repeat must lead to a step that runs once, after it, before End.', 'The way out of the loop leads on to the step after it.')),
  item('yes-no', what, 7, 'Scored by the editor (arrow order): a decision whose yes exit goes to a task and whose no exit goes to the print or return, two different places.',
    branchL(K('process'), K('io'), 'The diamond has to split into two different results: its yes arrow goes to the task that does the work, its no arrow goes to the input/output step.', 'The decision splits into the task and the print.')),
];

module.exports = {
  '3-4-9-chart-expand-arrow': {
    rubricTitle: 'Arrow expansion chart: structure check',
    gate: GATE(['operation|function|callback|apply', 'value|number|input|\\bn\\b', 'twice|again|second|first|once', 'print|show|display|log|output', 'result|return|double']),
    rules: { 'min-process': 2, 'min-decisions': null, 'min-nodes': 6 },
    rubric: [
      item('three-steps', 'Read, first call, second call, then the print', 7, 'Scored by the editor (shape kind): at least four task or input/output shapes, for reading the parameters, the two calls and the print.',
        { op: 'count', match: { kind: ['process', 'io'] }, min: 4, fail: 'The code does four things: it reads operation and value, calls operation once, calls it again on that result, and prints. Draw a shape for each.', pass: 'There is a shape for each step.' }),
      item('order', 'The work comes first, then the print, then End', 7, 'Scored by the editor (arrow order): tasks, then an input/output step, then End, on every route.',
        seq([K('process'), K('io'), K('terminal')], 'The print comes after the work, and it is the last step before End.', 'The tasks come first and the print is last.')),
      item('straight', 'A straight line, no repeat', 6, 'Scored by the editor (arrow order): no task is part of a repeat.',
        ncyc('process', 'This code runs once from top to bottom, so no arrow should lead back to an earlier step. In your chart one does.', 'No arrow leads back.')),
    ],
  },
  '3-4-15-chart-form-decision': {
    rubricTitle: 'Form decision chart: structure check',
    gate: GATE(['declaration|function|named|main', 'arrow|expression|one-line|implicit|callback', 'called|several|places|body|single|block', 'write|use|choose|return', 'yes|no|job|read']),
    rules: { 'min-process': 3, 'min-decisions': 2, 'min-nodes': 6 },
    rubric: [
      item('two-questions', 'A second question follows the first', 7, 'Scored by the editor (arrow order): one decision comes before another on the route.',
        seq([K('decision'), K('decision')], 'The rule asks two questions, one after the other. Draw a second diamond that comes after the first one.', 'The second question follows the first.')),
      item('three-forms', 'Three forms to choose from', 7, 'Scored by the editor (shape kind): at least three task rectangles, one for each way to write the function.',
        cnt('process', 3, 'There are three ways to write the function (a declaration, a one-line arrow, an arrow with a block body). Draw a task rectangle for each.', 'There is a task for each form.')),
      item('no-loops', 'A rule, not a repeat', 6, 'Scored by the editor (arrow order): no decision is part of a repeat.',
        ncyc('decision', 'This is a decision tree, so no arrow should lead back to a diamond. In your chart one does.', 'No arrow leads back to a diamond.')),
    ],
  },
  '3-4-20-chart-forms-comparison': {
    rubricTitle: 'Forms comparison chart: structure check',
    gate: GATE(['named|name|declaration|function', 'braces|brace|block|return|implicit|explicit', 'expression|const|arrow|assign', 'print|show|log|output|result', '\\b3\\b|add|sum|1 \\+ 2']),
    rules: { 'min-process': 3, 'min-decisions': 2, 'min-nodes': 8 },
    rubric: [
      item('two-questions', 'Naming first, then braces', 7, 'Scored by the editor (arrow order): one decision comes before another on the route.',
        seq([K('decision'), K('decision')], 'The comparison asks two questions in order: is the function named, then does the body use braces. Draw the second diamond after the first.', 'The second question follows the first.')),
      item('three-forms', 'One task for each form', 7, 'Scored by the editor (shape kind): at least three task rectangles.',
        cnt('process', 3, 'Draw a task rectangle for each of the three forms.', 'There is a task for each form.')),
      item('one-print', 'All three forms reach the print', 6, 'Scored by the editor: an input/output step for the print, which comes after the decisions.',
        cnt('io', 1, 'The three forms are one choice made three times, so they should all lead to one print. Draw an input/output step for the print.', 'There is a print.'),
        seq([K('decision'), K('io'), K('terminal')], 'Every route has to pass a decision and then the print before End: one of your forms skips the print.', 'Every route passes the decisions, then the print, then End.')),
    ],
  },
  '3-5-11-chart-nested-access': {
    rubricTitle: 'Nested access chart: structure check',
    gate: GATE(['total|price|items|order', 'name|customer|vip', 'loop|each|every|next|\\bi\\b|length', 'print|show|log|output', 'yes|no|\\+|add']),
    rules: { 'min-decisions': 1, 'min-nodes': 7, 'min-shape': { shape: 'preparation', count: 1 } },
    rubric: [
      item('hexagon', 'The loop is drawn with the loop-setup hexagon', 6, 'Scored by the editor (shape kind).',
        cnt('preparation', 1, 'The for-loop header has its own shape, the loop-setup hexagon from the shape palette.', 'A loop-setup hexagon is on the path.')),
      item('after-loop', 'The loop, then more steps after it', 7, 'Scored by the editor (arrow order): the loop repeats, and the arrow that leaves it leads on to the steps after it.',
        { op: 'loop-exit', loop: K('preparation'), minAfter: 2, from: 'any', orSetup: true, fail: 'The adding task must lead back to the hexagon, and the arrow that leaves the loop must lead on to the name task, the decision and the print (at least two more steps before End).', pass: 'The way out of the loop leads on to the steps after it.' }),
      item('decision-outside', 'The VIP decision is outside the loop', 7, 'Scored by the editor (arrow order): the decision is not part of a repeat.',
        ncyc('decision', 'The VIP test runs once, after the loop. In your chart an arrow leads back to the diamond, so it runs on every pass.', 'The decision is outside the loop.')),
    ],
  },
  '3-5-21-chart-destructure-vs-access': {
    rubricTitle: 'Destructuring chart: structure check',
    gate: GATE(['unpack|destructur|width|height|color|options', 'note|box|build', 'wide|greater|>|bigger', 'print|show|log|output|return']),
    rules: { 'min-decisions': 1, 'min-nodes': 6 },
    rubric: [
      item('unpack-first', 'The unpack comes before the decision', 7, 'Scored by the editor (arrow order): a task comes before the decision on every route.',
        seq([K('process'), K('decision')], 'The unpack is its own task, drawn before the decision that uses the names.', 'A task comes before the decision.')),
      item('exits', 'The wide path adds to the note', 7, 'Scored by the editor: the decision has two different exits, and the yes exit goes to a task.',
        branchL(K('process'), null, 'The yes arrow must lead to the task that appends to the note, and the no arrow to somewhere different.', 'The yes arrow goes to the task that adds to the note.')),
      item('one-print', 'The print comes after the decision', 6, 'Scored by the editor: an input/output step for the print, after the decision.',
        cnt('io', 1, 'Both paths finish at one print. Draw an input/output step for the print.', 'There is a print.'),
        seq([K('decision'), K('io'), K('terminal')], 'Both paths must meet at the print, and the print must come after the decision, before End.', 'Both paths meet at the print before End.')),
    ],
  },
  '3-6-7-chart-reassign-vs-mutate': {
    rubricTitle: 'Reassign vs mutate chart: structure check',
    gate: GATE(['nums|scores|array|\\[', 'mutat|reassign|escape|caller|shared|local|change', 'process|call|\\(', 'print|show|log|output']),
    rules: { 'min-decisions': 2, 'min-nodes': 7, 'min-shape': { shape: 'subroutine', count: 1 } },
    rubric: [
      item('call-shape', 'The call is one function-call shape', 5, 'Scored by the editor (shape kind): a double-rail function-call shape on the path.',
        cnt('subroutine', 1, 'A call to a function has its own shape, the double-rail rectangle from the shape palette.', 'A function-call shape is on the path.')),
      item('order', 'Call, two decisions, then one print', 8, 'Scored by the editor (arrow order): the call, then a decision, then another decision, then the print, on every route.',
        seq([K('subroutine'), K('decision'), K('decision'), K('io'), K('terminal')], 'The order matters: the call comes first, then the question after the mutation, then the question after the reassignment, then the print once.', 'Call, two questions and the print are in order.')),
      item('different-exits', 'Each question splits into two different results', 7, 'Scored by the editor: a decision whose yes and no arrows lead to two different shapes, and a print.',
        branch(null, null, 'Each diamond must have a yes and a no arrow that lead to two different places.', 'The decision has two different exits.'),
        cnt('io', 1, 'The two paths rejoin before one print. Draw an input/output step for the print.', 'There is a print.')),
    ],
  },
  '3-7-5-chart-map-trace': {
    rubricTitle: 'Map trace chart: structure check',
    gate: GATE(['price|prices|\\b10\\b|\\b20\\b|\\b30\\b|item', 'tax|withtax|callback|1\\.08|apply|add|collect|result', 'next|another|more|each|loop|\\bi\\b|list', 'print|show|log|output']),
    rules: { 'min-process': 2, 'min-decisions': 1, 'min-nodes': 7, 'min-shape': { shape: 'preparation', count: 1 } },
    rubric: LOOP_ITEMS('The "another price?" question sends yes to the callback and no to the print', 'The print is after the loop, off the way out'),
  },
  '3-7-16-chart-spread-vs-rest': {
    rubricTitle: 'Spread vs rest chart: structure check',
    gate: GATE(['sum|total|numbers|\\[i\\]|add', 'next|another|more|each|loop|\\bi\\b|index', '\\b0\\b|zero|initial', 'return|print|show|log|output']),
    rules: { 'min-process': 2, 'min-decisions': 1, 'min-nodes': 7, 'min-shape': { shape: 'preparation', count: 1 } },
    rubric: LOOP_ITEMS('The "another number?" question sends yes to the add and no to the return', 'The return is after the loop, off the way out'),
  },
  '3-8-17-chart-save-load-round-trip': {
    rubricTitle: 'Save/load chart: structure check',
    gate: GATE(['null|stored|missing|nothing|text|read|key', 'parse|succeed|catch|try|json', 'default|fallback|return', 'stringify|save|store|setitem', 'print|show|log|output|restored']),
    rules: { 'min-decisions': 2, 'min-nodes': 10 },
    rubric: [
      item('order', 'Read the key, check for nothing, then check the parse', 8, 'Scored by the editor (arrow order): a task, then a decision, then a second decision, on every route.',
        seq([K('process'), { kind: 'decision', re: 'null|stor|nothing|missing|anything|empty|exist|found|saved|key|text|data' }, { kind: 'decision', re: 'pars|succe|work|valid|json|catch|try|error|fail|read|ok|corrupt|bad' }], 'Load asks two questions in order: first "is anything stored?", then "did the parse succeed?". Put the missing-key question first, and the parse question after it.', 'The missing-key check comes before the parse check.')),
      item('missing-first', 'Nothing stored leads to the defaults, not to the parse', 6, 'Scored by the editor: one of the first decision\'s exits leads straight to a task (the defaults), the other to the second decision.',
        branch(K('process'), K('decision'), 'The first diamond has two different exits: one goes straight to a task that returns the defaults, the other goes on to the parse question.', 'One exit returns the defaults, the other goes on to the parse question.')),
      item('one-print', 'Every path ends at the print', 6, 'Scored by the editor: an input/output step for the print, after the decisions.',
        cnt('io', 1, 'All the paths finish at one print. Draw an input/output step for the print.', 'There is a print.'),
        seq([K('decision'), K('io'), K('terminal')], 'Every path must pass the decisions and then the print before End.', 'Every path passes the decisions, then the print, then End.')),
    ],
  },
};
