// Pure text helpers shared by the regex grader and the name lookup (lib/student-names.ts).
// Kept apart from lib/grader.ts so the test runner, which student-names reaches through
// lib/test-harness-source.ts, does not drag the whole grader in with it.

// Strip JS // and /* */ comments so a commented-out answer can't pass a
// regex requirement. Respects strings so tokens inside "// not a comment"
// survive. Template literals (with `${ }` code inside them) and regex
// literals are tracked so their text is never read as a comment, and a
// comment inside `${ }` is never kept as string text.
export function stripJsComments(src: string, htmlComments = true): string {
  let out = '';
  // `shadow` is `out` as blankStringContents would see it (string and template text and regex bodies blanked), so the
  // "does this / start a regex" question is answered on the same text by both scanners. Parentheses inside a string
  // ("(") otherwise made the two disagree and let a comment ride through as code.
  let shadow = '';
  let i = 0;
  const n = src.length;
  let inStr: string | null = null;
  // Template literals nest: `${ ... }` is code (comments in it are comments), and a backtick inside it opens another template.
  const exprDepth: number[] = []; // open-brace depth inside each active ${ }
  const blankOf = (t: string) => t.replace(/[^\n]/g, ' ');
  let newlineCommentAt = -1;
  while (i < n) {
    const c = src[i];
    const nx = src[i + 1];
    if (inStr) {
      if (c === '\\' && i + 1 < n) { out += c + src[i + 1]; shadow += inStr === '`' ? (src[i + 1] === '\n' ? ' \n' : '  ') : '  '; i += 2; continue; }
      if (inStr === '`' && c === '$' && nx === '{') { out += '${'; shadow += '${'; exprDepth.push(0); inStr = null; i += 2; continue; }
      // A " or ' string cannot span a raw newline, so an unterminated one
      // ends at the end of its line instead of swallowing the rest of the
      // file. Without this the scan desynchronizes on the first missing
      // quote and never recovers: every comment below it survives as
      // "string content", so a fix written in a comment satisfies the regex.
      // Measured on 2.7.3, whose starter opens with an unterminated string.
      out += c;
      if (c === inStr || ((inStr === '"' || inStr === "'") && c === '\n')) { shadow += c === '\n' ? '\n' : c; inStr = null; }
      else shadow += c === '\n' ? '\n' : ' ';
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
        while (j < n && src[j] !== '\n') {
          if (src[j] === '\\') { j += 2; continue; }
          if (src[j] === c) { closed = true; break; }
          j++;
        }
        if (!closed) { out += c; shadow += c; i++; continue; }
      }
      inStr = c; out += c; shadow += c; i++; continue;
    }
    if (exprDepth.length) {
      if (c === '{') exprDepth[exprDepth.length - 1]++;
      else if (c === '}') {
        if (exprDepth[exprDepth.length - 1] === 0) { exprDepth.pop(); out += c; shadow += c; inStr = '`'; i++; continue; }
        exprDepth[exprDepth.length - 1]--;
      }
    }
    // Annex B: a classic <script> (which is how the sketch runs) treats `<!--` anywhere as a line comment, and `-->` as one
    // when only whitespace (or comments) came before it on the line. Without this `<!-- player.overlaps(...)` ran nothing and read as code.
    // A hashbang line (`#!` as the very first two characters) is a comment too (ES2023, Chrome 74+ in a classic script).
    if (htmlComments && i === 0 && c === '#' && nx === '!') { while (i < n && src[i] !== '\n') i++; continue; }
    if (htmlComments && ((c === '<' && src.startsWith('<!--', i)) || (c === '-' && src.startsWith('-->', i) && /^[ \t\r\f\v]*$/.test(out.slice(Math.max(out.lastIndexOf('\n') + 1, newlineCommentAt)))))) {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && nx === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && nx === '*') {
      const start = i;
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      if (src.slice(start, i).includes('\n')) newlineCommentAt = out.length; // a block comment with a line break in it counts as a line start for `-->`
      continue;
    }
    if (c === '/' && slashStartsRegex(shadow)) {
      // A regular-expression literal: copy it whole (unless a '/' or '*' follows its closing slash: that slash opened a // or /* comment
      // and this one is a division, as in `x = function () {} / 1 // note`), so a quote inside it ( /'/ ) does not open a phantom string
      // that carries the comments after it through as code.
      let j = i + 1;
      let inClass = false;
      let closed = false;
      while (j < n && src[j] !== '\n') {
        const d = src[j];
        if (d === '\\') { j += 2; continue; }
        if (d === '[') inClass = true;
        else if (d === ']') inClass = false;
        else if (d === '/' && !inClass) { closed = true; break; }
        j++;
      }
      if (closed && j > i + 1 && !(src[j + 1] === '/' || src[j + 1] === '*')) {
        out += src.slice(i, j + 1);
        shadow += '/' + blankOf(src.slice(i + 1, j)) + '/';
        i = j + 1;
        continue;
      }
    }
    out += c;
    shadow += c;
    i++;
  }
  return out;
}

// True when `before` ends with the ')' of an if / while / for / with head: a '/' there starts a
// regular-expression literal (`if (ok) /text/;`), while after `f(x)` or `(a + b)` it divides.
function closesStatementHead(before: string): boolean {
  if (before[before.length - 1] !== ')') return false;
  let depth = 0;
  for (let k = before.length - 1; k >= 0; k--) {
    const ch = before[k];
    if (ch === ')') depth++;
    else if (ch === '(') {
      depth--;
      if (depth === 0) return /(?:^|[^\w$.])(?:if|while|for|with)\s*$/.test(before.slice(0, k));
    }
  }
  return false;
}

// How many copies of the final character end `s` side by side (`a+++` is 3).
function signRun(s: string): number {
  let k = 0;
  while (k < s.length && s[s.length - 1 - k] === s[s.length - 1]) k++;
  return k;
}

// Shared by stripJsComments and blankStringContents: does a '/' that follows `out` start a regex literal?
function slashStartsRegex(out: string): boolean {
  // trimEnd, not .replace(/\s+$/, ''): that regex is quadratic on every long blank run (a blanked string is one), and
  // this runs once per '/', so 4000 characters of string then 500 divisions took 4 to 7 seconds. Same character set.
  const before = out.trimEnd();
  const last = before[before.length - 1];
  return before === '' || (/[(,=:\[!&|?{};*%<>~^/]/.test(last) || (/[+\-]/.test(last) && signRun(before) % 2 === 1)) || /(?:^|[^\w$.])(?:return|typeof|else|do|case|throw|void|delete|in|new|instanceof|await)$/.test(before) || closesStatementHead(before);
}

// Blank the CONTENT of string literals and template-literal text (the quote
// characters stay, `${...}` expressions stay code), preserving length and
// newlines. Runs after comment stripping. Without it a regex requirement is
// satisfied by text a student merely PRINTS: `console.log("function findMax(
// return ")` defined nothing, yet matched `function\\s+findMax\\s*\\(`.
// OPT-IN per requirement (`ignoreStrings: true`): 49 other lessons match text
// inside strings on purpose (printed output, asset paths, SQL-ish literals).
export function blankStringContents(src: string): string {
  let out = '';
  let i = 0;
  const n = src.length;
  const braces: number[] = []; // open-brace depth inside each active ${ }
  let inTemplate = false;
  while (i < n) {
    const c = src[i];
    if (inTemplate) {
      if (c === '\\') { out += src[i + 1] === '\n' ? ' \n' : '  '; i += 2; continue; }
      if (c === '`') { out += c; inTemplate = false; i++; continue; }
      if (c === '$' && src[i + 1] === '{') { out += '${'; braces.push(0); inTemplate = false; i += 2; continue; }
      out += c === '\n' ? '\n' : ' ';
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      let closed = false;
      while (j < n && src[j] !== '\n') {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === c) { closed = true; break; }
        j++;
      }
      if (!closed) { out += c; i++; continue; } // mid-syntax-error: leave it code
      out += c + ' '.repeat(j - i - 1) + c;
      i = j + 1;
      continue;
    }
    if (c === '`') { out += c; inTemplate = true; i++; continue; }
    // A regular-expression literal is text, not code: `const r = /a.push(.)/` calls nothing.
    // A '/' starts one when the last thing before it is an operator, an opening bracket, a
    // separator (a '/' after a division '/' too; a '+' or '-' only when it is not the second sign of ++ / --), or return/typeof; after an identifier, a number or ')' / ']' it is division.
    if (c === '/') {
      const startsRegex = slashStartsRegex(out);
      if (startsRegex) {
        let j = i + 1;
        let inClass = false;
        let closed = false;
        while (j < n && src[j] !== '\n') {
          const d = src[j];
          if (d === '\\') { j += 2; continue; }
          if (d === '[') inClass = true;
          else if (d === ']') inClass = false;
          else if (d === '/' && !inClass) { closed = true; break; }
          j++;
        }
        if (closed && j > i + 1 && !(src[j + 1] === '/' || src[j + 1] === '*')) {
          out += '/' + ' '.repeat(j - i - 1) + '/';
          i = j + 1;
          continue;
        }
      }
    }
    if (braces.length) {
      if (c === '{') braces[braces.length - 1]++;
      else if (c === '}') {
        if (braces[braces.length - 1] === 0) { braces.pop(); out += c; inTemplate = true; i++; continue; }
        braces[braces.length - 1]--;
      }
    }
    out += c;
    i++;
  }
  return out;
}
