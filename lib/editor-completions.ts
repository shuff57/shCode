// Autocomplete for every JavaScript editor (#80): the moSHion API, JavaScript's
// own built-ins, and the student's own variables and functions.
//
//   - moSHion names come from the engine's type file (lib/moshion-completions.generated.ts,
//     built by scripts/generate-moshion-completions.mjs), and are offered only when the
//     code is a moSHion sketch, so a plain JavaScript lab is not full of sprite words.
//   - After a dot: `world.`, `kb.`, `mouse.`, `camera.` complete their own members;
//     `player.vel.` a vector's; any other name a Sprite's, or a Group's when the code
//     made it with `new Group(...)`.
//   - Built-ins come from a short, named list (Math, console, JSON, ...), not the
//     whole browser `window`, which would bury the useful names under DOM ones.
//   - The student's own names come from lang-javascript's localCompletionSource,
//     which javascript() already registers.
//
// Keys: suggestions appear while typing; Enter or a click takes one, Escape
// closes them, Ctrl+Space opens them. Tab still indents (indentWithTab). When
// the highlighted suggestion is exactly the word already typed, Enter starts a
// new line instead of "accepting" the same word.

import {
  autocompletion,
  closeCompletion,
  completionStatus,
  selectedCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { javascriptLanguage, scopeCompletionSource } from '@codemirror/lang-javascript';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { Prec, type Extension } from '@codemirror/state';
import { insertNewlineAndIndent } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { MOSHION_GLOBALS, MOSHION_MEMBERS, MOSHION_TYPE_OF, type MoshionCompletion } from './moshion-completions.generated';

const SKIP_NODES = new Set(['String', 'TemplateString', 'LineComment', 'BlockComment', 'RegExp']);

/** True when the code looks like a moSHion sketch. */
export function isMoshionCode(doc: string): boolean {
  return /\bnew\s+(?:Sprite|Canvas|Group)\b|\bfunction\s+(?:setup|draw)\s*\(|\b(?:kb|world|mouse|camera|allSprites)\s*\./.test(doc);
}

const VECTOR_NAMES = new Set(['vel', 'pos', 'position', 'velocity', 'scale']);
// Objects JavaScript itself defines; their members come from the built-ins source.
const JS_OBJECTS = new Set(['Math', 'console', 'JSON', 'Object', 'Array', 'Number', 'String', 'Date', 'Promise', 'Map', 'Set', 'localStorage']);

/** Which moSHion type `name.` is, given the whole sketch. null = not ours to complete. */
export function moshionTypeFor(name: string, doc: string): string | null {
  if (MOSHION_TYPE_OF[name]) return MOSHION_TYPE_OF[name];
  if (VECTOR_NAMES.has(name)) return 'Vec2';
  if (JS_OBJECTS.has(name)) return null;
  if (name === 'this') return 'Sprite';
  const made = new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\s*=\\s*new\\s+([A-Za-z_$][\\w$]*)(\\.Sprite)?\\s*\\(`).exec(doc);
  if (made) {
    if (made[2]) return 'Sprite';
    if (MOSHION_MEMBERS[made[1]]) return made[1];
  }
  return 'Sprite';
}

const toCompletion = (c: MoshionCompletion, boost = 0): Completion => ({
  label: c.label,
  type: c.type === 'constant' ? 'constant' : c.type,
  detail: c.detail.length > 60 ? c.detail.slice(0, 57) + '…' : c.detail,
  info: c.info || undefined,
  boost,
});

function inSkippedNode(ctx: CompletionContext): boolean {
  // The parse up to the cursor, given a moment to finish: a tree cut short (a busy machine, a long file) does not
  // know the cursor is inside a string yet, and offered every global there (seen under npm test's load).
  const tree = ensureSyntaxTree(ctx.state, ctx.pos, 50) ?? syntaxTree(ctx.state);
  const node = tree.resolveInner(ctx.pos, -1);
  return SKIP_NODES.has(node.name);
}

export function moshionCompletionSource(ctx: CompletionContext): CompletionResult | null {
  if (inSkippedNode(ctx)) return null;
  const doc = ctx.state.doc.toString();
  if (!isMoshionCode(doc)) return null;
  const member = ctx.matchBefore(/([A-Za-z_$][\w$]*)\s*\.\s*([\w$]*)$/);
  if (member) {
    const m = /([A-Za-z_$][\w$]*)\s*\.\s*([\w$]*)$/.exec(member.text)!;
    const type = moshionTypeFor(m[1], doc);
    if (!type || !MOSHION_MEMBERS[type]) return null;
    return {
      from: member.to - m[2].length,
      options: MOSHION_MEMBERS[type].map((c) => toCompletion(c, 1)),
      validFor: /^[\w$]*$/,
    };
  }
  const word = ctx.matchBefore(/[A-Za-z_$][\w$]*/);
  if (!word || (word.from === word.to && !ctx.explicit)) return null;
  // Do not offer globals right after a dot on something we left alone (Math.).
  if (word.from > 0 && ctx.state.sliceDoc(word.from - 1, word.from) === '.') return null;
  return { from: word.from, options: MOSHION_GLOBALS.map((c) => toCompletion(c)), validFor: /^[\w$]*$/ };
}

// JavaScript's own built-ins, introspected from these real objects (so Math.flo
// completes to floor with the real member list).
const JS_SCOPE: Record<string, unknown> = typeof globalThis === 'undefined' ? {} : {
  Math, console, JSON, Object, Array, Number, String, Boolean, Date, Map, Set, Promise,
  parseInt, parseFloat, isNaN, isFinite, setTimeout, setInterval, clearTimeout, clearInterval,
  ...(typeof localStorage !== 'undefined' ? { localStorage } : {}),
};
const builtins = scopeCompletionSource(JS_SCOPE);
export function builtinCompletionSource(ctx: CompletionContext) {
  if (inSkippedNode(ctx)) return null;
  return builtins(ctx);
}

/** Enter on a suggestion that is already exactly what was typed: new line instead. */
const enterNewlineOnExactMatch = Prec.highest(keymap.of([{
  key: 'Enter',
  run: (view) => {
    if (completionStatus(view.state) !== 'active') return false;
    const sel = selectedCompletion(view.state);
    if (!sel) return false;
    const pos = view.state.selection.main.head;
    const line = view.state.doc.lineAt(pos);
    const before = /[\w$]*$/.exec(view.state.sliceDoc(line.from, pos))?.[0] ?? '';
    if (before !== sel.label) return false;
    closeCompletion(view);
    return insertNewlineAndIndent(view);
  },
}]));

/** Everything a JavaScript editor needs for autocomplete. */
export function jsAutocomplete(): Extension {
  return [
    enterNewlineOnExactMatch,
    autocompletion({ activateOnTypingDelay: 100, maxRenderedOptions: 60, icons: true }),
    javascriptLanguage.data.of({ autocomplete: moshionCompletionSource }),
    javascriptLanguage.data.of({ autocomplete: builtinCompletionSource }),
  ];
}
