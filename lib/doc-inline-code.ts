// Presentation only: the JS docs prose (lib/js-docs.ts) names code in plain
// text ("names[0] is the first name", "length - 1"), with no backticks to
// mark it. This finds those spans so the page can set them as code. The prose
// itself is not changed; search still reads the plain text.
//
// A span is code when it
//   - carries code punctuation: names[0], console.log, push(), x.length
//   - is camelCase or snake_case (playerScore, getItem)
//   - is a JavaScript literal or built-in name (null, NaN, length, push)
//   - or is an all-caps name the page's own example uses (JSON)
// and an operator plus operand after a code span joins it (length - 1).
// Ordinary words that an example happens to use (player, level, saved) stay
// prose: they read as English and were wrongly set as code in a first pass.

export type DocSpan = { text: string; code: boolean };

const BUILTIN = new Set([
  'true', 'false', 'null', 'undefined', 'NaN', 'Infinity', 'typeof', 'const', 'var',
  'length', 'push', 'pop', 'shift', 'unshift', 'slice', 'splice', 'map', 'filter', 'reduce',
  'forEach', 'indexOf', 'includes', 'stringify', 'parse', 'getItem', 'setItem', 'removeItem',
  'localStorage', 'toFixed', 'parseInt', 'parseFloat', 'toUpperCase', 'toLowerCase',
  // Not here on purpose: split, join, sort, reverse, find, trim -- English verbs in this prose.
]);

function codeIdentifiers(code: string): Set<string> {
  const stripped = code
    .replace(/\/\/.*$/gm, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(["'`])(?:\\.|(?!\1)[^\\\n])*\1/g, ' ');
  const ids = new Set<string>();
  for (const m of stripped.matchAll(/[A-Za-z_$][\w$]*/g)) ids.add(m[0]);
  return ids;
}

const PUNCT_TOKEN = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[[^\]\s]*\]|\([^)\s]*\))+$/;
const CAMEL = /^[a-z][a-z0-9]*(?:[A-Z][a-z0-9]+)+$|^[a-z]+_[a-z0-9_]+$/;
const CAPS = /^[A-Z][A-Z0-9_]+$/;

export function splitDocCode(text: string, code = ''): DocSpan[] {
  const ids = codeIdentifiers(code);
  const isCode = (tok: string) =>
    PUNCT_TOKEN.test(tok) || CAMEL.test(tok) || BUILTIN.has(tok) || (CAPS.test(tok) && ids.has(tok));

  // Words with their trailing sentence punctuation split off.
  const parts = text.split(/(\s+)/);
  const out: DocSpan[] = [];
  const push = (s: string, c: boolean) => {
    const last = out[out.length - 1];
    if (last && last.code === c) last.text += s;
    else out.push({ text: s, code: c });
  };
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/^\s*$/.test(part)) { push(part, false); continue; }
    const m = part.match(/^([("']?)(.*?)([.,;:!?)"']*)$/);
    const [, lead, core, trail] = m ?? ['', '', part, ''];
    if (!core || !isCode(core)) { push(part, false); continue; }
    push(lead, false);
    let span = core;
    let tail = trail;
    // Join "length - 1": operator, then a number or code token, while this word has no trailing punctuation.
    while (!tail && parts[i + 1] === ' ' && /^[-+*/%<>]=?$|^[=!]==?$/.test(parts[i + 2] ?? '') && parts[i + 3] === ' ') {
      const nm = (parts[i + 4] ?? '').match(/^(.*?)([.,;:!?)"']*)$/);
      const operand = nm ? nm[1] : '';
      if (!operand || !(/^\d+$/.test(operand) || isCode(operand))) break;
      span += ` ${parts[i + 2]} ${operand}`;
      tail = nm ? nm[2] : '';
      i += 4;
    }
    out.push({ text: span, code: true });
    push(tail, false);
  }
  return out.filter((s) => s.text.length > 0);
}
