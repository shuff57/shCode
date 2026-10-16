// Pure text helpers shared by the regex grader and the name lookup (lib/student-names.ts).
// Kept apart from lib/grader.ts so the test runner, which student-names reaches through
// lib/test-harness-source.ts, does not drag the whole grader in with it.

// Strip JS // and /* */ comments so a commented-out answer can't pass a
// regex requirement. Respects strings so tokens inside "// not a comment"
// survive. Naive: no template-literal or regex-literal handling, which
// is fine for student moSHion code.
export function stripJsComments(src: string): string {
  let out = '';
  let i = 0;
  const n = src.length;
  let inStr: string | null = null;
  while (i < n) {
    const c = src[i];
    const nx = src[i + 1];
    if (inStr) {
      out += c;
      if (c === '\\' && i + 1 < n) { out += src[i + 1]; i += 2; continue; }
      // A " or ' string cannot span a raw newline, so an unterminated one
      // ends at the end of its line instead of swallowing the rest of the
      // file. Without this the scan desynchronizes on the first missing
      // quote and never recovers: every comment below it survives as
      // "string content", so a fix written in a comment satisfies the regex.
      // Measured on 2.7.3, whose starter opens with an unterminated string.
      if (c === inStr || ((inStr === '"' || inStr === "'") && c === '\n')) inStr = null;
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
        if (!closed) { out += c; i++; continue; }
      }
      inStr = c; out += c; i++; continue;
    }
    if (c === '/' && nx === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && nx === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
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
    // separator, or return/typeof; after an identifier, a number or ')' / ']' it is division.
    if (c === '/') {
      const before = out.replace(/\s+$/, '');
      const last = before[before.length - 1];
      const startsRegex = before === '' || /[(,=:\[!&|?{};+\-*%<>~^]/.test(last) || /(?:^|[^\w$])(?:return|typeof)$/.test(before);
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
        if (closed && j > i + 1) {
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
