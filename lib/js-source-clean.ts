// Pure text helpers shared by the regex grader and the name lookup (lib/student-names.ts).
// Kept apart from lib/grader.ts so the test runner, which student-names reaches through
// lib/test-harness-source.ts, does not drag the whole grader in with it.

// The four characters JavaScript ends a line with (ECMA-262 LineTerminator). Comments end at any of them, and `-->` is only a comment
// at the start of such a line; reading only '\n' let `\u00a0-->`, `\u2028-->` and `\r-->` ride through as code.
const isLT = (ch: string | undefined) => ch === '\n' || ch === '\r' || ch === '\u2028' || ch === '\u2029';
const isLTCode = (c: number) => c === 10 || c === 13 || c === 0x2028 || c === 0x2029;

// JavaScript's white space and line ends: exactly what \s and trimEnd() take (so NBSP, BOM and the Zs spaces count).
const WS = /\s/;
function isWs(c: number): boolean {
  return c === 32 || (c >= 9 && c <= 13) || (c > 127 && WS.test(String.fromCharCode(c)));
}

// The text a scanner has produced so far, kept as UTF-16 code units in a growing buffer. The scanners used to grow a string with
// `+=` and read it back after every character that mattered; each read made the engine copy the whole string into one piece, so a
// file of `}/` cost a copy of itself per '/'. Reading this buffer costs nothing.
class Text {
  len = 0;
  protected buf = new Uint16Array(256);
  add(s: string): void {
    const m = s.length;
    if (this.len + m > this.buf.length) {
      let size = this.buf.length * 2;
      while (size < this.len + m) size *= 2;
      const next = new Uint16Array(size);
      next.set(this.buf.subarray(0, this.len));
      this.buf = next;
    }
    for (let k = 0; k < m; k++) this.buf[this.len++] = s.charCodeAt(k);
  }
  at(k: number): number {
    return k >= 0 && k < this.len ? this.buf[k] : -1;
  }
  slice(from: number, end: number): string {
    let s = '';
    for (let k = from; k < end; k += 8192) s += String.fromCharCode.apply(null, this.buf.subarray(k, Math.min(end, k + 8192)) as unknown as number[]);
    return s;
  }
  toString(): string {
    return this.slice(0, this.len);
  }
  // Where white space ending at `end` begins: `slice(0, end).trimEnd().length`.
  skipWsBack(end: number): number {
    while (end > 0 && isWs(this.buf[end - 1])) end--;
    return end;
  }
}

// `-->` starts a comment when only white space came before it on its line (or since a block comment that held a line break, at
// `floor`). Walks back from the end and stops at the first character that is not white space, so a long line costs nothing.
function onlySpaceSinceLineStart(out: Text, floor: number): boolean {
  for (let k = out.len; k > 0 && k > floor; k--) {
    const c = out.at(k - 1);
    if (isLTCode(c)) return true;
    if (!isWs(c)) return false;
  }
  return true;
}

// Strip JS // and /* */ comments so a commented-out answer can't pass a
// regex requirement. Respects strings so tokens inside "// not a comment"
// survive. Template literals (with `${ }` code inside them) and regex
// literals are tracked so their text is never read as a comment, and a
// comment inside `${ }` is never kept as string text.
export function stripJsComments(src: string, htmlComments = true): string {
  const out = new Text();
  // `shadow` is `out` as blankStringContents would see it (string and template text and regex bodies blanked), so the
  // "does this / start a regex" question is answered on the same text by both scanners. Parentheses inside a string
  // ("(") otherwise made the two disagree and let a comment ride through as code.
  const shadow = new Brackets();
  let i = 0;
  const n = src.length;
  let inStr: string | null = null;
  // Template literals nest: `${ ... }` is code (comments in it are comments), and a backtick inside it opens another template.
  const exprDepth: number[] = []; // open-brace depth inside each active ${ }
  const blankOf = (t: string) => t.replace(/[^\n]/g, ' ');
  let newlineCommentAt = -1;
  let regexEnd = -1; // length of `shadow` just after the last regex literal: a '/' straight after one divides
  while (i < n) {
    const c = src[i];
    const nx = src[i + 1];
    if (inStr) {
      if (c === '\\' && i + 1 < n) { out.add(c + src[i + 1]); shadow.add(inStr === '`' ? (src[i + 1] === '\n' ? ' \n' : '  ') : '  '); i += 2; continue; }
      if (inStr === '`' && c === '$' && nx === '{') { out.add('${'); shadow.add('${'); exprDepth.push(0); inStr = null; i += 2; continue; }
      // A " or ' string cannot span a raw newline, so an unterminated one
      // ends at the end of its line instead of swallowing the rest of the
      // file. Without this the scan desynchronizes on the first missing
      // quote and never recovers: every comment below it survives as
      // "string content", so a fix written in a comment satisfies the regex.
      // Measured on 2.7.3, whose starter opens with an unterminated string.
      out.add(c);
      if (c === inStr || ((inStr === '"' || inStr === "'") && (c === '\n' || c === '\r'))) { shadow.add(c); inStr = null; }
      else shadow.add(c === '\n' ? '\n' : ' ');
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      // A " or ' string cannot span a raw newline. If this quote has no partner
      // before the end of the line then the file is mid-syntax-error, and the
      // rest of that line is CODE, not string content -- so say so and let the
      // branch below strip a // that follows. Reading it as a string start is
      // what let a fix hidden in a comment satisfy 2.7.3's r1: the comment sat
      // inside the phantom string and survived verbatim. A ` template may span
      // lines, so it keeps the old behaviour.
      if (c !== '`') {
        let j = i + 1;
        let closed = false;
        while (j < n && src[j] !== '\n' && src[j] !== '\r') {
          if (src[j] === '\\') { j += 2; continue; }
          if (src[j] === c) { closed = true; break; }
          j++;
        }
        if (!closed) { out.add(c); shadow.add(c); i++; continue; }
      }
      inStr = c; out.add(c); shadow.add(c); i++; continue;
    }
    if (exprDepth.length) {
      if (c === '{') exprDepth[exprDepth.length - 1]++;
      else if (c === '}') {
        if (exprDepth[exprDepth.length - 1] === 0) { exprDepth.pop(); out.add(c); shadow.add(c); inStr = '`'; i++; continue; }
        exprDepth[exprDepth.length - 1]--;
      }
    }
    // Annex B: a classic <script> (which is how the sketch runs) treats `<!--` anywhere as a line comment, and `-->` as one
    // when only whitespace (or comments) came before it on the line. Without this `<!-- player.overlaps(...)` ran nothing and read as code.
    // A hashbang line (`#!` as the very first two characters) is a comment too (ES2023, Chrome 74+ in a classic script).
    if (htmlComments && i === 0 && c === '#' && nx === '!') { while (i < n && !isLT(src[i])) i++; continue; }
    if (htmlComments && ((c === '<' && src.startsWith('<!--', i)) || (c === '-' && src.startsWith('-->', i) && onlySpaceSinceLineStart(out, newlineCommentAt)))) {
      while (i < n && !isLT(src[i])) i++;
      continue;
    }
    if (c === '/' && nx === '/') {
      while (i < n && !isLT(src[i])) i++;
      continue;
    }
    if (c === '/' && nx === '*') {
      const start = i;
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      if (/[\n\r\u2028\u2029]/.test(src.slice(start, i))) newlineCommentAt = out.len; // a block comment with a line break in it counts as a line start for `-->`
      continue;
    }
    if (c === '/' && slashStartsRegex(shadow, regexEnd)) {
      // A regular-expression literal: copy it whole (unless a '/' or '*' follows its closing slash: that slash opened a // or /* comment
      // and this one is a division, as in `x = function () {} / 1 // note`), so a quote inside it ( /'/ ) does not open a phantom string
      // that carries the comments after it through as code.
      let j = i + 1;
      let inClass = false;
      let closed = false;
      while (j < n && !isLT(src[j])) {
        const d = src[j];
        if (d === '\\') { j += 2; continue; }
        if (d === '[') inClass = true;
        else if (d === ']') inClass = false;
        else if (d === '/' && !inClass) { closed = true; break; }
        j++;
      }
      if (closed && j > i + 1) {
        out.add(src.slice(i, j + 1));
        shadow.add('/' + blankOf(src.slice(i + 1, j)) + '/');
        regexEnd = shadow.len;
        i = j + 1;
        continue;
      }
    }
    out.add(c);
    shadow.add(c);
    i++;
  }
  return out.toString();
}

// --- Does a '/' start a regular-expression literal, or divide? ---
// JavaScript decides by what came before it. After a '}' that depends on what the brace closed: a value (an object literal, a function
// or class expression) is divided, a block is followed by a new statement, and a '/' there opens a regex. `Brackets` reads the
// scanner's text once, forward, so each of these questions is a lookup rather than a walk back over the whole file (a file of `}/`
// or of nested `{ a: {` blocks used to cost a walk per character, and past a step budget a '}' was guessed to be a block).

const ID_REST = /[\p{ID_Continue}$\u200c\u200d]/u; // a character that continues an identifier
const FN_HEAD_CHAR = /[\p{ID_Continue}\s]/u; // non-ASCII characters a function head (`async function* name `) can hold
// Words after which an expression starts, so a '/' there opens a regex literal. `of` (for (x of /re/)) and `yield` count too.
const VALUE_WORDS = new Set(['return', 'typeof', 'void', 'delete', 'in', 'of', 'new', 'instanceof', 'await', 'yield', 'throw', 'case']);
const REGEX_WORDS = new Set([...VALUE_WORDS, 'else', 'do']);
const LONGEST_WORD = 10; // `instanceof`
// The head of a function expression or declaration, just before its '(' / a class head just before its '{'. Group 1 is the head itself.
const FN_TAIL = /(?:^|[^\p{ID_Continue}$.\u200c\u200d])((?:async\s+)?function\s*\*?\s*(?:[\p{ID_Start}$_][\p{ID_Continue}$]*)?\s*)$/u;
const CLASS_TAIL = /(?:^|[^\p{ID_Continue}$.\u200c\u200d])(class(?:\s+[\p{ID_Start}$_][\p{ID_Continue}$]*)?(?:\s+extends\s+[^{;]*)?\s*)$/u;
const VALUE_BEFORE = '=(,[?!&|+-*%<>~^'; // a '{' after one of these opens an object literal
const REGEX_AFTER = '(,=:[!&|?{};*%<>~^/'; // a '/' after one of these opens a regex literal

const isHigh = (c: number) => c >= 0xd800 && c <= 0xdbff;
const isLow = (c: number) => c >= 0xdc00 && c <= 0xdfff;
const isAsciiId = (c: number) => (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 36 || c === 95;
const CH = (c: number) => String.fromCharCode(c);

// The scanner's text, plus what it knows about the brackets in it, indexed forward one character at a time. The last character
// is left for the next call, because a '?' is only a ternary '?' once the character after it is known (`?.` and `??` are not).
class Brackets extends Text {
  private n = 0; // characters indexed
  // At a '}' its '{' (braces counted alone); at a ')' its '(' (parentheses counted alone); -1 when there is none.
  private match: number[] = [];
  // At a '{': 1 when it opens a VALUE (an object literal, the body of a function or class expression), 0 when it opens a block.
  private value: number[] = [];
  // top[e]: the innermost bracket of any kind still open after text[0..e), -1 at the top level. qs[e] / cs[e]: the '?' and ':'
  // seen at that bracket's own depth since it opened or since its last ';'.
  private top: number[] = [-1];
  private qs: number[] = [0];
  private cs: number[] = [0];
  private braces: number[] = [];
  private parens: number[] = [];
  private open: number[] = [];
  private savedQ: number[] = [];
  private savedC: number[] = [];
  private q = 0;
  private c = 0;

  sync(): void {
    while (this.n < this.len - 1) this.step(this.n++);
  }

  private step(k: number): void {
    const ch = this.buf[k];
    let m = -1;
    let v = 0;
    if (ch === 40 || ch === 91 || ch === 123) { // ( [ {
      if (ch === 123) { v = this.opensValue(k) ? 1 : 0; this.braces.push(k); }
      else if (ch === 40) this.parens.push(k);
      this.open.push(k);
      this.savedQ.push(this.q);
      this.savedC.push(this.c);
      this.q = 0;
      this.c = 0;
    } else if (ch === 41 || ch === 93 || ch === 125) { // ) ] }
      if (this.open.length) { this.open.pop(); this.q = this.savedQ.pop()!; this.c = this.savedC.pop()!; }
      else { this.q = 0; this.c = 0; } // a closer with nothing open: what came before it is not part of any later count
      if (ch === 125) m = this.braces.length ? this.braces.pop()! : -1;
      else if (ch === 41) m = this.parens.length ? this.parens.pop()! : -1;
    } else if (ch === 59) { this.q = 0; this.c = 0; } // ;
    else if (ch === 58) this.c++; // :
    else if (ch === 63 && this.at(k - 1) !== 63 && this.at(k + 1) !== 63 && this.at(k + 1) !== 46) this.q++; // a '?' that is not ?? or ?.
    this.match.push(m);
    this.value.push(v);
    this.top.push(this.open.length ? this.open[this.open.length - 1] : -1);
    this.qs.push(this.q);
    this.cs.push(this.c);
  }

  // The '{' or '(' that the '}' or ')' at k closes, -1 if none. The last character is not indexed yet: its partner is the innermost
  // one of its kind still open.
  openerOf(k: number): number {
    if (k < this.n) return this.match[k];
    const s = this.buf[k] === 125 ? this.braces : this.parens;
    return s.length ? s[s.length - 1] : -1;
  }

  // Does the '}' at k close a VALUE (`x = {} / 1`, `x = function () {} / 1`, `x = class {} / 1`), after which '/' divides,
  // rather than a block, after which '/' starts a regex?
  closesValue(k: number): boolean {
    const o = this.openerOf(k);
    return o >= 0 && this.value[o] === 1;
  }

  // Does the '{' at `open` open a VALUE? Found by reading what stands in front of it.
  private opensValue(open: number): boolean {
    const e = this.skipWsBack(open);
    if (e === 0 || (this.buf[e - 1] === 62 && this.at(e - 2) === 61)) return false; // `=> {`: an arrow function body is not something you divide
    if (this.buf[e - 1] === 41) {
      // `function name (...) {` / `async function* (...) {`: a value only when `function` itself sits where a value goes
      const k = this.match[e - 1];
      if (k < 0) return false;
      const h = this.functionHeadStart(k);
      return h >= 0 && this.expectsValue(h);
    }
    const h = this.classHeadStart(e);
    if (h >= 0) return this.expectsValue(h);
    return this.expectsValue(e); // an object literal: `x = {`, `f({`, `return {`, `{ k: {`
  }

  // Does text[0..end) leave the parser expecting a VALUE next (`x =`, `f(`, `return`, `a ?`)? A statement start (`;`, `{`, `}`, `)`,
  // nothing) is not one.
  private expectsValue(end: number): boolean {
    const e = this.skipWsBack(end);
    if (e === 0) return false;
    const last = this.buf[e - 1];
    if (last === 62 && this.at(e - 2) === 61) return true; // =>
    if (last === 123 && this.at(e - 2) === 36) return true; // ${
    if (VALUE_BEFORE.includes(CH(last))) return true;
    if (last === 58) return this.colonStartsValue(e - 1); // :
    return this.wordIn(e, VALUE_WORDS);
  }

  // The ':' at k: does a value follow it? True for an object key (`{ k:`) and the else side of `a ? b :`; false for the colon of a
  // label or of `case x:` / `default:`, which start a statement.
  private colonStartsValue(k: number): boolean {
    if (this.qs[k] > this.cs[k]) return true; // `a ? b :` : more '?' than ':' since the statement (or the enclosing bracket) began
    const open = this.top[k];
    if (open < 0) return false; // top level: a label
    if (this.buf[open] !== 123) return true; // inside ( or [ : a value
    return this.value[open] === 1; // `{ k:` is an object key, `{ lbl:` / `case x:` inside a block starts a statement
  }

  // Where the run of identifier characters that ends at `end` begins, looking back at most `max` characters (-1 past that).
  // Unicode-aware: `éreturn` is one word, not `return`.
  private wordStart(end: number, max: number): number {
    let k = end;
    while (k > 0) {
      if (end - k > max) return -1;
      const c = this.buf[k - 1];
      if (c < 128) { if (isAsciiId(c)) { k--; continue; } break; }
      if (isLow(c) && k >= 2 && isHigh(this.buf[k - 2])) { if (ID_REST.test(String.fromCharCode(this.buf[k - 2], c))) { k -= 2; continue; } break; }
      if (ID_REST.test(CH(c))) { k--; continue; }
      break;
    }
    return end - k > max ? -1 : k;
  }

  // Is the whole word ending at `end` one of `words`, and not a property name (`a.return`)?
  wordIn(end: number, words: Set<string>): boolean {
    const s = this.wordStart(end, LONGEST_WORD);
    return s >= 0 && s < end && words.has(this.slice(s, end)) && this.at(s - 1) !== 46;
  }

  // True when text[0..open) is an if / while / for / for await / with head, so the parenthesis at `open` begins a statement head
  // (`if (ok) /text/;` holds a regex), while after `f(x)` or `(a + b)` a '/' divides.
  statementHeadBefore(open: number): boolean {
    const e = this.skipWsBack(open);
    const s = this.wordStart(e, 5);
    if (s < 0) return false;
    const w = this.slice(s, e);
    if (w === 'if' || w === 'while' || w === 'for' || w === 'with') return this.at(s - 1) !== 46;
    if (w !== 'await') return false;
    const e2 = this.skipWsBack(s);
    if (e2 === s) return false;
    const s2 = this.wordStart(e2, 3);
    return s2 >= 0 && this.slice(s2, e2) === 'for' && this.at(s2 - 1) !== 46;
  }

  // FN_TAIL / CLASS_TAIL tested on text[0..end), but only on the stretch a head can occupy, so the test does not rescan the file.
  // `from` is one character before that stretch: a character no head holds, so the pattern's left edge sees what it would see in
  // the whole text. Returns where the head (group 1) starts, or -1.
  private headStart(re: RegExp, end: number, from: number): number {
    if (from > 0 && isLow(this.buf[from]) && isHigh(this.buf[from - 1])) from--;
    const m = re.exec(this.slice(from, end));
    return m ? from + m.index + m[0].length - m[1].length : -1;
  }
  private functionHeadStart(end: number): number {
    let r = end; // a function head is identifier characters, white space and '*'
    while (r > 0) {
      const c = this.buf[r - 1];
      if (c < 128) { if (isAsciiId(c) || c === 42 || c === 32 || (c >= 9 && c <= 13)) { r--; continue; } break; }
      if (isLow(c) && r >= 2 && isHigh(this.buf[r - 2])) { if (FN_HEAD_CHAR.test(String.fromCharCode(this.buf[r - 2], c))) { r -= 2; continue; } break; }
      if (FN_HEAD_CHAR.test(CH(c))) { r--; continue; }
      break;
    }
    return this.headStart(FN_TAIL, end, r > 0 ? r - 1 : 0);
  }
  private classHeadStart(end: number): number {
    let r = end; // a class head holds no '{' and no ';'
    while (r > 0 && this.buf[r - 1] !== 123 && this.buf[r - 1] !== 59) r--;
    return this.headStart(CLASS_TAIL, end, r > 0 ? r - 1 : 0);
  }
}

// Shared by stripJsComments and blankStringContents: does a '/' that follows `out` start a regex literal?
// `regexEnd` is the length `out` had just after the last regex literal; a '/' right after one divides (`/a/ / 2`).
function slashStartsRegex(out: Brackets, regexEnd: number): boolean {
  out.sync();
  const e = out.skipWsBack(out.len);
  if (regexEnd >= 0 && e === regexEnd) return false;
  if (e === 0) return true;
  const last = out.at(e - 1);
  if (last === 125) return !out.closesValue(e - 1); // }
  if (REGEX_AFTER.includes(CH(last))) return true;
  if (last === 43 || last === 45) { // + or -: a regex follows a lone sign, not the second sign of ++ / --
    let run = 0;
    while (run < e && out.at(e - 1 - run) === last) run++;
    if (run % 2 === 1) return true;
  }
  if (out.wordIn(e, REGEX_WORDS)) return true;
  if (last !== 41) return false;
  // the ')' of an if / while / for / with head: `if (ok) /text/;`
  const o = out.openerOf(e - 1);
  return o >= 0 && out.statementHeadBefore(o);
}

// Blank the CONTENT of string literals and template-literal text (the quote
// characters stay, `${...}` expressions stay code), preserving length and
// newlines. Runs after comment stripping. Without it a regex requirement is
// satisfied by text a student merely PRINTS: `console.log("function findMax(
// return ")` defined nothing, yet matched `function\\s+findMax\\s*\\(`.
// OPT-IN per requirement (`ignoreStrings: true`): 49 other lessons match text
// inside strings on purpose (printed output, asset paths, SQL-ish literals).
//
// `keepUpTo` (default 0) keeps a literal whose whole content is at most that many
// characters, so `kind === 'J'` still reads as a comparison with the letter J
// while `"'J' at += 2"` is one long string and is blanked. Opt-in per requirement
// (`keepShortStrings: true` keeps 1-character literals).
export function blankStringContents(src: string, keepUpTo = 0): string {
  const out = new Brackets();
  let i = 0;
  const n = src.length;
  const braces: number[] = []; // open-brace depth inside each active ${ }
  let inTemplate = false;
  let regexEnd = -1; // length of `out` just after the last regex literal: a '/' straight after one divides
  while (i < n) {
    const c = src[i];
    if (inTemplate) {
      if (c === '\\') { out.add(src[i + 1] === '\n' ? ' \n' : '  '); i += 2; continue; }
      if (c === '`') { out.add(c); inTemplate = false; i++; continue; }
      if (c === '$' && src[i + 1] === '{') { out.add('${'); braces.push(0); inTemplate = false; i += 2; continue; }
      out.add(c === '\n' ? '\n' : ' ');
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      let closed = false;
      while (j < n && src[j] !== '\n' && src[j] !== '\r') {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === c) { closed = true; break; }
        j++;
      }
      if (!closed) { out.add(c); i++; continue; } // mid-syntax-error: leave it code
      if (j - i - 1 <= keepUpTo && !src.slice(i + 1, j).includes('\\')) { out.add(src.slice(i, j + 1)); i = j + 1; continue; }
      out.add(c + ' '.repeat(j - i - 1) + c);
      i = j + 1;
      continue;
    }
    if (c === '`') {
      // A short template with no `${` and no escape is kept whole, like a short quoted literal.
      const end = src.indexOf('`', i + 1);
      if (keepUpTo > 0 && end > i && end - i - 1 <= keepUpTo && !/[\\$\n]/.test(src.slice(i + 1, end))) {
        out.add(src.slice(i, end + 1)); i = end + 1; continue;
      }
      out.add(c); inTemplate = true; i++; continue;
    }
    // A regular-expression literal is text, not code: `const r = /a.push(.)/` calls nothing.
    // A '/' starts one when the last thing before it is an operator, an opening bracket, a
    // separator (a '/' after a division '/' too; a '+' or '-' only when it is not the second sign of ++ / --), or return/typeof; after an identifier, a number or ')' / ']' it is division.
    if (c === '/') {
      const startsRegex = slashStartsRegex(out, regexEnd);
      if (startsRegex) {
        let j = i + 1;
        let inClass = false;
        let closed = false;
        while (j < n && !isLT(src[j])) {
          const d = src[j];
          if (d === '\\') { j += 2; continue; }
          if (d === '[') inClass = true;
          else if (d === ']') inClass = false;
          else if (d === '/' && !inClass) { closed = true; break; }
          j++;
        }
        if (closed && j > i + 1) {
          out.add('/' + ' '.repeat(j - i - 1) + '/');
          regexEnd = out.len;
          i = j + 1;
          continue;
        }
      }
    }
    if (braces.length) {
      if (c === '{') braces[braces.length - 1]++;
      else if (c === '}') {
        if (braces[braces.length - 1] === 0) { braces.pop(); out.add(c); inTemplate = true; i++; continue; }
        braces[braces.length - 1]--;
      }
    }
    out.add(c);
    i++;
  }
  return out.toString();
}
