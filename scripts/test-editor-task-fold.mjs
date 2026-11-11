import assert from 'node:assert/strict';
import fs from 'node:fs';
import { EditorState } from '@codemirror/state';
import { extractLabTaskScenario } from '../lib/lab-task-scenario.ts';
import { taskCommentFold, taskFoldMarker, foldedLineCount } from '../lib/editor-task-fold.ts';

const starter = fs.readFileSync(new URL('../lessons/1-1-11-name-that-umbrella/script.js', import.meta.url), 'utf8');
const task = extractLabTaskScenario(starter);
assert.ok(task.scenario.startsWith('Miguel is on a team'));
assert.ok(!task.scenario.includes('Choose from:'));
assert.ok(task.fold.text.includes('Choose from:'));
assert.ok(task.fold.text.split('\n').every((line) => line.startsWith('//')));
const field = taskCommentFold(task);
const create = (doc = starter) => EditorState.create({ doc, extensions: [field] });
let state = create();
assert.equal(state.field(field).size, 1);
assert.equal(state.doc.toString(), starter, 'folding preserves every document byte');
const answerLine = state.doc.lineAt(task.fold.to + 2).number;
state = state.update({ changes: { from: state.doc.length, insert: '\nconsole.log("quality management");' } }).state;
assert.equal(state.field(field).size, 1, 'typing an answer leaves task folded');
assert.equal(state.doc.lineAt(task.fold.to + 2).number, answerLine, 'line numbers remain unchanged');
state = state.update({ selection: { anchor: task.fold.from + 4 } }).state;
assert.equal(state.field(field).size, 0, 'navigating into the comment reveals it');
state = state.update({ selection: { anchor: state.doc.length } }).state;
assert.equal(state.field(field).size, 0, 'moving away does not refold');

state = create().update({ changes: { from: task.fold.from + 5, insert: 'edited' } }).state;
assert.equal(state.field(field).size, 0, 'edits inside the comment reveal it');
state = state.update({ changes: { from: task.fold.from + 5, to: task.fold.from + 11 } }).state;
assert.equal(state.doc.toString(), starter);
assert.equal(state.field(field).size, 0, 'undoing an edit does not refold');
assert.equal(create(starter.replace('Miguel', 'MY NAME')).field(field).size, 0, 'saved edited scenarios stay visible');
assert.equal(create(starter.replace('// 1.1.11', '` 1.1.11 ')).field(field).size, 0, 'changed prefixes stay visible');
assert.equal(create().update({ changes: { from: 0, insert: '`' } }).state.field(field).size, 0);
assert.equal(extractLabTaskScenario('// Just a starter\nconsole.log(1);'), null);
assert.equal(extractLabTaskScenario('console.log(1);\n// STEP 1: A task\n// More text').fold, null);
assert.equal(extractLabTaskScenario('console.log("// STEP 1: not a comment");'), null);
assert.deepEqual(taskCommentFold(null), []);
// Only a real scenario block folds: 3+ comment lines carrying exactly one STEP marker.
assert.equal(extractLabTaskScenario('// 1.2.3 Title\n\n// STEP 1: Declare two variables\n\nlet a;').fold, null, 'a one-line STEP comment never folds');
assert.equal(extractLabTaskScenario('// STEP 1: Declare two variables\n//         and log them\n\nlet a;').fold, null, 'a two-line STEP comment never folds');
assert.equal(extractLabTaskScenario('// STEP 1: First thing to do here\n// STEP 2: Second thing to do here\n// and a note about both\n').fold, null, 'a block holding two STEP markers never folds');
assert.ok(extractLabTaskScenario('// STEP 1: A scenario line\n//   second line\n//   third line\n').fold, 'a three-line single-STEP block folds');
// Beside the "Your task" panel the fold is a short quiet label saying what it hides, never a
// second "Task card" label, and the document and fold range are exactly what the loud fold gives.
assert.equal(taskFoldMarker(true, 5).text, '⋯ 5 comment lines (task notes)');
assert.equal(taskFoldMarker(true, 1).text, '⋯ 1 comment line (task notes)');
assert.equal(foldedLineCount('// a\n//   b\n//   c\n'), 3, 'a trailing newline is not a line');
assert.ok(!taskFoldMarker(true).text.includes('Task card'));
assert.ok(taskFoldMarker(false).text.includes('Task card'));
assert.ok(taskFoldMarker(true).label.length > 0, 'the quiet marker keeps an accessible name');
{
  const quiet = taskCommentFold(task, { quiet: true });
  const q = EditorState.create({ doc: starter, extensions: [quiet] });
  assert.equal(q.field(quiet).size, 1, 'quiet fold still folds the starter comment');
  assert.equal(q.doc.toString(), starter, 'quiet fold preserves every document byte');
  const r = q.field(quiet).iter();
  assert.equal(r.from, task.fold.from);
  assert.equal(r.to, task.fold.to);
}
console.log('test-editor-task-fold: all checks passed');
