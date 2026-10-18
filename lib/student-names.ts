// Students name things what suits what they are building. A requirement written
// with `book` in mind must not fail a script that says `song`, so a requirement
// can carry `names` ({ "book": "object" }): the name it was written with, and the
// kind of thing that name stands for. The lookup is on the SCRIPT'S TEXT, before
// anything runs, and it only ever fills in for a name that is not there:
//   - the written name is declared at the top of the script -> it is used as is
//     (every script written to the lesson as authored behaves exactly as before)
//   - otherwise the first top-level declaration of that kind stands in for it.
// Kinds: object   const x = { ... }
//        array    const x = [ ... ]
//        records  const x = [ { ... } ]  (or [] that is pushed an object)
//        function function x(...) / const x = function / const x = (..) => ...
//        value    any other declaration, `let x;` included; its `has`/`lacks` text is the
//                 initializer plus the right-hand side of every later `x = ...`
import type { Requirement } from './types';
import { blankStringContents, stripJsComments } from './js-source-clean';

type Kind = 'object' | 'array' | 'records' | 'function' | 'value';
/** Decl: where it is, what it holds, and the text a `has`/`lacks` test reads
 *  (a function's body, or the initializer of a variable), strings blanked. */
interface Decl { name: string; kind: Kind[]; at: number; text: string }
export type NameSpec = Kind | { kind: Kind; has?: string; lacks?: string };

const ID = '[A-Za-z_$][\\w$]*';

/** The text from `open` (a `{`) to its matching `}`, or to the end of the source. */
function braceBody(src: string, open: number): string {
  let d = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') d++;
    else if (src[i] === '}' && --d === 0) return src.slice(open, i + 1);
  }
  return src.slice(open);
}

/** Top-level declarations of the script in source order, with what each holds. */
function topLevelDecls(code: string): Decl[] {
  const src = blankStringContents(stripJsComments(code));
  // depth[i] = bracket depth just before character i
  const depth = new Int32Array(src.length + 1);
  let d = 0;
  for (let i = 0; i < src.length; i++) {
    depth[i] = d;
    const c = src[i];
    if (c === '{' || c === '(' || c === '[') d++;
    else if (c === '}' || c === ')' || c === ']') d = Math.max(0, d - 1);
  }
  const out: Decl[] = [];
  // The right-hand side of every later `name = ...` (any depth): a `has` test on a variable
  // reads what it is GIVEN, not only what it starts as (let restored; ... restored = JSON.parse(t)).
  // `skip`: where the declaration's own name is, so its initializer is not read twice.
  const assigned = (name: string, skip: number): string => {
    const re = new RegExp(`(?<![\\w$.])${name.replace(/\$/g, '\\$')}\\s*=(?![=>])\\s*([^;\\n]*)`, 'g');
    let a: RegExpExecArray | null;
    let s = '';
    while ((a = re.exec(src))) if (a.index !== skip) s += ' ' + a[1];
    return s;
  };
  const decl = new RegExp(`\\b(?:const|let|var)\\s+(${ID})\\s*=\\s*`, 'g');
  let m: RegExpExecArray | null;
  // let x;  (declared, given a value later)
  const bare = new RegExp(`\\b(?:let|var)\\s+(${ID})\\s*(?=[;\\n]|$)`, 'g');
  while ((m = bare.exec(src))) {
    if (depth[m.index] !== 0) continue;
    out.push({ name: m[1], kind: ['value'], at: m.index, text: assigned(m[1], -1) });
  }
  // Where one declarator's initializer ends: a `,` or `;` at its own depth, the bracket that closes
  // around it, or (code without semicolons) a line that starts the next statement.
  const initEnd = (start: number): number => {
    let k = 0;
    for (let i = start; i < src.length; i++) {
      const c = src[i];
      if (c === '{' || c === '(' || c === '[') k++;
      else if (c === '}' || c === ')' || c === ']') { if (k === 0) return i; k--; }
      else if (k === 0 && (c === ',' || c === ';')) return i;
      else if (k === 0 && c === '\n' && /^\s*(?:const|let|var|function|class|if|for|while|console)\b/.test(src.slice(i + 1, i + 40))) return i;
    }
    return src.length;
  };
  const declare = (name: string, start: number, at: number, nameAt: number) => {
    const rest = src.slice(start, start + 400);
    const kind: Kind[] = [];
    let text = '';
    if (new RegExp(`^(?:async\\s+)?(?:function\\b|\\([^)]*\\)\\s*=>|${ID}\\s*=>)`).test(rest)) {
      kind.push('function');
      const o = src.indexOf('{', start);
      const arrow = /=>\s*/.exec(rest);
      text = arrow && !rest.slice(arrow.index + arrow[0].length).startsWith('{') ? rest.split(/[;\n]/)[0] : o >= 0 ? braceBody(src, o) : rest;
    } else {
      kind.push('value');
      // up to the end of the declarator: a `;` at a line end, a `,` before the next declarator,
      // or (code without semicolons) a line that starts the next statement
      text = src.slice(start, Math.min(start + 600, initEnd(start))).split(/;\s*(?:\n|$)|\n(?=\s*(?:const|let|var|function|class|if|for|while|console)\b)/)[0] + assigned(name, nameAt);
      if (rest.startsWith('{')) kind.push('object');
      else if (rest.startsWith('[')) {
        kind.push('array');
        const pushed = new RegExp(`(?<![\\w$.])${name.replace(/\$/g, '\\$')}\\s*\\.\\s*push\\s*\\(\\s*\\{`);
        if (/^\[\s*\{/.test(rest) || (/^\[\s*\]/.test(rest) && pushed.test(src))) kind.push('records');
      }
    }
    out.push({ name, kind, at, text });
  };
  const more = new RegExp(`^,\\s*(${ID})\\s*=(?![=>])\\s*`);
  while ((m = decl.exec(src))) {
    if (depth[m.index] !== 0) continue;
    const start = m.index + m[0].length;
    declare(m[1], start, m.index, m.index + m[0].indexOf(m[1], m[0].search(/\s/)));
    // const a = [1, 2], b = [3, 4];  each further declarator is a declaration of its own
    let e = initEnd(start);
    for (let guard = 0; guard < 50 && src[e] === ','; guard++) {
      const mm = more.exec(src.slice(e, e + 200));
      if (!mm) break;
      const s2 = e + mm[0].length;
      declare(mm[1], s2, e, e + mm[0].indexOf(mm[1]));
      e = initEnd(s2);
    }
  }
  const fn = new RegExp(`\\bfunction\\s+(${ID})\\s*\\(`, 'g');
  while ((m = fn.exec(src))) {
    if (depth[m.index] !== 0) continue;
    const o = src.indexOf('{', m.index + m[0].length);
    out.push({ name: m[1], kind: ['function'], at: m.index, text: o >= 0 ? braceBody(src, o) : '' });
  }
  return out.sort((a, b) => a.at - b.at);
}

const specOf = (v: NameSpec): { kind: Kind; has?: string; lacks?: string } => (typeof v === 'string' ? { kind: v } : v);
const test = (re: string | undefined, text: string, want: boolean) => {
  if (!re) return true;
  try { return new RegExp(re).test(text) === want; } catch { return false; }
};

/** The script's own name for each written name that is not declared as written.
 *  A written name that is already declared, or has no stand-in, is left out.
 *  Names that carry a `has`/`lacks` test are settled first, so the plain ones
 *  (birthday, beside birthdaySafe) take what is left. */
export function studentNames(code: string, names: Requirement['names'] | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  if (!names || typeof code !== 'string') return map;
  const written = Object.keys(names);
  if (!written.length) return map;
  const decls = topLevelDecls(code);
  const declared = new Set(decls.map((x) => x.name));
  const taken = new Set<string>(written.filter((w) => declared.has(w)));
  const narrow = (w: string) => { const sp = specOf(names[w]); return sp.has || sp.lacks ? 0 : 1; };
  for (const w of [...written].sort((a, b) => narrow(a) - narrow(b))) {
    if (declared.has(w)) continue;
    const sp = specOf(names[w]);
    const hit = decls.find((x) => x.kind.includes(sp.kind) && !taken.has(x.name) && test(sp.has, x.text, true) && test(sp.lacks, x.text, false));
    if (hit) { map[w] = hit.name; taken.add(hit.name); }
  }
  return map;
}

const esc = (s: string) => s.replace(/[$]/g, '\\$');
const escRe = (s: string) => s.replace(/[$]/g, '\\$');

/** Replace every written name in one pass (a swap such as a->b, b->a stays a swap). */
function swapWords(text: string, map: Record<string, string>, before: string, after: string, lit: (s: string) => string): string {
  const keys = Object.keys(map);
  if (!keys.length) return text;
  const re = new RegExp(`${before}(${keys.map(escRe).join('|')})${after}`, 'g');
  return text.replace(re, (_m, w: string) => lit(map[w]));
}

/** The requirement's regex with each written name read as the student's name. */
export function bindPattern(pattern: string, req: Requirement, rawCode: string): string {
  if (!req.names) return pattern;
  return swapWords(pattern, studentNames(rawCode, req.names), '(?<![\\w$])', '(?![\\w$])', esc);
}

/** A sentence from lesson.json with each written name replaced by the student's. */
export function bindText(text: string, map: Record<string, string>): string {
  return swapWords(text, map, '(?<![\\w$])', '(?![\\w$])', (x) => x);
}

/** An author expression (JavaScript text) with each written name replaced by the
 *  student's: a name the text uses as a binding (spread ones included, [...first]),
 *  and one inside a regex literal. A property name after a single dot is left alone. */
export function bindCode(expr: string, map: Record<string, string>): string {
  return swapWords(expr, map, '(?:(?<![A-Za-z0-9_$.])|(?<=\\\\b)|(?<=\\.\\.\\.))', '(?![\\w$])', (x) => x);
}
