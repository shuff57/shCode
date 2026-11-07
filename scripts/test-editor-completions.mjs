#!/usr/bin/env node
// Autocomplete (#80, lib/editor-completions.ts) on real CodeMirror state:
//   - moSHion globals and members appear in a moSHion sketch and NOT in a plain
//     JavaScript lab;
//   - `world.` / `kb.` / `player.vel.` / a Group / `this` complete the right type;
//   - nothing is offered inside a string or a comment;
//   - JavaScript's built-ins (Math.) come from the built-ins source;
//   - the generated list is up to date with the engine's type file.
// Run: node scripts/test-editor-completions.mjs

import { execFileSync } from 'node:child_process';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { ensureSyntaxTree } from '@codemirror/language';
import { moshionCompletionSource, builtinCompletionSource, isMoshionCode, moshionTypeFor } from '../lib/editor-completions.ts';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ' -- ' + JSON.stringify(detail) : ''}`); }
}

/** Run a source with the cursor at the `|` in `src`. */
function complete(source, src, explicit = false) {
  const pos = src.indexOf('|');
  const doc = src.replace('|', '');
  const state = EditorState.create({ doc, extensions: [javascript()] });
  ensureSyntaxTree(state, state.doc.length, 5000);
  const r = source(new CompletionContext(state, pos, explicit));
  return r ? r.options.map((o) => o.label) : null;
}

const SKETCH = 'let player, coins;\nfunction setup() {\n  new Canvas(400, 400);\n  coins = new Group();\n  player = new Sprite(200, 200, 40);\n}\nfunction draw() {\n  ';

check('a sketch is recognised', isMoshionCode(SKETCH));
check('a plain JS lab is not', !isMoshionCode('const items = [1, 2, 3];\nconsole.log(items.slice(1));'));

let o = complete(moshionCompletionSource, SKETCH + 'player.|\n}');
check('player. offers Sprite members, including clone and vel', o && o.includes('vel') && o.includes('clone') && o.includes('colliding'), o?.slice(0, 8));
o = complete(moshionCompletionSource, SKETCH + 'coins.|\n}');
check('coins (new Group) offers Group members (cull, deleteAll, newSprite)', o && o.includes('cull') && o.includes('deleteAll') && o.includes('newSprite'), o?.slice(0, 8));
check('…and not Sprite-only ones like clone', o && !o.includes('clone'), o?.filter((x) => x === 'clone'));
o = complete(moshionCompletionSource, SKETCH + 'world.|\n}');
check('world. offers World members, including maxSpeed and gravity', o && o.includes('maxSpeed') && o.includes('gravity'), o);
o = complete(moshionCompletionSource, SKETCH + 'kb.pre|\n}');
check('kb.pre narrows within Kb (presses, pressing)', o && o.includes('presses') && o.includes('pressing'), o);
o = complete(moshionCompletionSource, SKETCH + 'player.vel.|\n}');
check('player.vel. offers a vector (x, y)', o && o.includes('x') && o.includes('y') && !o.includes('clone'), o);
o = complete(moshionCompletionSource, SKETCH + 'Math.|\n}');
check('Math. is left to the built-ins', o === null, o);
o = complete(moshionCompletionSource, SKETCH + 'backg|\n}');
check('a word offers moSHion globals (background)', o && o.includes('background') && o.includes('loadSound'), o?.slice(0, 5));
o = complete(moshionCompletionSource, SKETCH + "text('backg|', 10, 20);\n}");
check('nothing inside a string', o === null, o);
o = complete(moshionCompletionSource, SKETCH + '// player.|\n}');
check('nothing inside a comment', o === null, o);
o = complete(moshionCompletionSource, 'const items = [1, 2];\nitems.|');
check('nothing moSHion in a plain JS lab', o === null, o);
check('this. inside a class is a Sprite', moshionTypeFor('this', SKETCH) === 'Sprite');
check('a coin made by new coins.Sprite(...) is a Sprite', moshionTypeFor('c', 'let c = new coins.Sprite(1, 2);') === 'Sprite');

o = complete(builtinCompletionSource, 'Math.fl|');
check('Math.fl offers floor', o && o.includes('floor'), o);
o = complete(builtinCompletionSource, 'cons|');
check('cons offers console', o && o.includes('console'), o?.slice(0, 5));
o = complete(builtinCompletionSource, "const s = 'Math.fl|';");
check('no built-ins inside a string', o === null, o);
o = complete(builtinCompletionSource, 'docu|');
check('the browser window is not offered (document)', !o || !o.includes('document'), o);

try {
  execFileSync('node', ['scripts/generate-moshion-completions.mjs', '--check'], { stdio: 'pipe' });
  check('the generated moSHion list matches the engine type file', true);
} catch (e) {
  check('the generated moSHion list matches the engine type file', false, String(e.stderr));
}

console.log(`\ntest-editor-completions: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
