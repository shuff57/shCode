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
import type { Requirement } from './types';
import { blankStringContents, stripJsComments } from './js-source-clean';

type Kind = 'object' | 'array' | 'records' | 'function';
interface Decl { name: string; kind: Kind[]; at: number }

const ID = '[A-Za-z_$][\\w$]*';

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
  const decl = new RegExp(`\\b(?:const|let|var)\\s+(${ID})\\s*=\\s*`, 'g');
  let m: RegExpExecArray | null;
  while ((m = decl.exec(src))) {
    if (depth[m.index] !== 0) continue;
    const rest = src.slice(m.index + m[0].length, m.index + m[0].length + 400);
    const name = m[1];
    const kind: Kind[] = [];
    if (rest.startsWith('{')) kind.push('object');
    else if (rest.startsWith('[')) {
      kind.push('array');
      const pushed = new RegExp(`(?<![\\w$.])${name.replace(/\$/g, '\\$')}\\s*\\.\\s*push\\s*\\(\\s*\\{`);
      if (/^\[\s*\{/.test(rest) || (/^\[\s*\]/.test(rest) && pushed.test(src))) kind.push('records');
    } else if (new RegExp(`^(?:async\\s+)?(?:function\\b|\\([^)]*\\)\\s*=>|${ID}\\s*=>)`).test(rest)) kind.push('function');
    if (kind.length) out.push({ name, kind, at: m.index });
  }
  const fn = new RegExp(`\\bfunction\\s+(${ID})\\s*\\(`, 'g');
  while ((m = fn.exec(src))) {
    if (depth[m.index] === 0) out.push({ name: m[1], kind: ['function'], at: m.index });
  }
  return out.sort((a, b) => a.at - b.at);
}

/** The script's own name for each written name that is not declared as written.
 *  A written name that is already declared, or has no stand-in, is left out. */
export function studentNames(code: string, names: Requirement['names'] | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  if (!names || typeof code !== 'string') return map;
  const written = Object.keys(names);
  if (!written.length) return map;
  const decls = topLevelDecls(code);
  const declared = new Set(decls.map((x) => x.name));
  const taken = new Set<string>(written.filter((w) => declared.has(w)));
  for (const w of written) {
    if (declared.has(w)) continue;
    const want = names[w];
    const hit = decls.find((x) => x.kind.includes(want) && !taken.has(x.name));
    if (hit) { map[w] = hit.name; taken.add(hit.name); }
  }
  return map;
}

const esc = (s: string) => s.replace(/[$]/g, '\\$');

/** The requirement's regex with each written name read as the student's name. */
export function bindPattern(pattern: string, req: Requirement, rawCode: string): string {
  if (!req.names) return pattern;
  const map = studentNames(rawCode, req.names);
  let out = pattern;
  for (const w of Object.keys(map)) out = out.replace(new RegExp(`(?<![\\w$])${w.replace(/\$/g, '\\$')}(?![\\w$])`, 'g'), esc(map[w]));
  return out;
}

/** A sentence from lesson.json with each written name replaced by the student's. */
export function bindText(text: string, map: Record<string, string>): string {
  let out = text;
  for (const w of Object.keys(map)) out = out.replace(new RegExp(`(?<![\\w$])${w.replace(/\$/g, '\\$')}(?![\\w$])`, 'g'), () => map[w]);
  return out;
}

/** An author expression (JavaScript text) with each written name replaced by the
 *  student's: a name the text uses as a binding, and one inside a regex literal. */
export function bindCode(expr: string, map: Record<string, string>): string {
  let out = expr;
  for (const w of Object.keys(map)) out = out.replace(new RegExp(`(?:(?<![A-Za-z0-9_$.])|(?<=\\\\b))${w.replace(/\$/g, '\\$')}(?![\\w$])`, 'g'), () => map[w]);
  return out;
}
