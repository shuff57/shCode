// A formatter for a student's pseudocode plan.
//
// WHY. A deterministic grader reads structure, so every structure it does not
// recognise is a wrong mark on work that is right. Students number their steps,
// draw a two-column table, close a loop with END FOR, write the body on the
// loop's own line, or skip indentation entirely -- all the same plan. Rather
// than teach the grader each of those, normalise the text once, here, into the
// one shape it reads: one step per line, no step numbers, no table pipes, and
// every block (a loop, a written-out function) indented under its head.
//
// The formatting is conservative on purpose. It only ever moves a line's
// INDENTATION or removes scaffolding around it; it never adds, drops, splits or
// reorders a step, so the grader cannot be shown a plan the student did not
// write. `raw` keeps every line as it was typed, and `notes` says what the
// formatter did, so a teacher can see exactly how the plan was read.

export type PlanRole = 'step' | 'loop' | 'definition' | 'closer';

export interface PlanLine {
  /** 1-based line number in the student's text. */
  n: number;
  /** The line as the student wrote it. */
  raw: string;
  /** The line with its scaffolding off, for matching. */
  text: string;
  /** Effective indentation in spaces, after any re-indenting. */
  indent: number;
  role: PlanRole;
}

export interface FormattedPlan {
  lines: PlanLine[];
  /** What the formatter changed, in plain words, for a teacher to check. */
  notes: string[];
  /** The plan as the grader read it. */
  canonical: string;
}

const LOOP_HEAD = /^(for\s+each|for|repeat\s+for|repeat|while|loop)\b/i;
const LOOP_CLOSE = /^(end\s*(for|loop|while|repeat|each)|next\b|wend\b|until\b)/i;
const DEF_HEAD = /^[-*•\s]*(?:function|funtion|func|def|method)\b/i;
const DEF_MARKED = /^[-*•\s]*\[\[[^\]]+\]\]\s*\(/;
const STEP_NUMBER = /^(?:step\s*)?\d{1,2}\s*[.):]\s*/i;

/** The step number or table pipes off a line; the step's own words stay. */
export function unframe(raw: string): string {
  let t = raw.trim();
  if (t.startsWith('|')) {
    const cells = t.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length) t = cells.reduce((a, b) => (b.length > a.length ? b : a));
  }
  return t.replace(STEP_NUMBER, '');
}

const indentOf = (raw: string): number => (raw.match(/^[ \t]*/) || [''])[0].replace(/\t/g, '    ').length;

export function formatPlan(text: string): FormattedPlan {
  const notes: string[] = [];
  const lines: PlanLine[] = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((raw, i) => ({ n: i + 1, raw, text: unframe(raw), indent: indentOf(raw), role: 'step' as PlanRole }));

  // 1. A loop whose body is closed by a word rather than by indentation
  //    ("FOR EACH ... / END FOR", "repeat ... / until ...") gets its body
  //    indented. Only lines that sit at or left of the head move, so a body
  //    already indented is untouched, and no step is added or dropped.
  for (let i = 0; i < lines.length; i++) {
    const head = lines[i];
    if (!head.text || !LOOP_HEAD.test(head.text)) continue;
    head.role = 'loop';
    let close = -1;
    for (let j = i + 1; j < lines.length && j <= i + 40; j++) {
      const l = lines[j];
      if (!l.text) continue;
      if (l.indent <= head.indent && LOOP_HEAD.test(l.text)) break; // a new loop: no closer
      if (LOOP_CLOSE.test(l.text) && l.indent <= head.indent) { close = j; break; }
    }
    if (close < 0) continue;
    lines[close].role = 'closer';
    const moved = lines.slice(i + 1, close).filter((l) => l.text && l.indent <= head.indent);
    if (moved.length) {
      for (const l of moved) l.indent = head.indent + 4;
      notes.push(
        `Line ${head.n} starts a loop and line ${lines[close].n} closes it, so the ${moved.length} line(s) between were read as the body of the loop.`,
      );
    }
  }

  // 2. A function the student wrote out inside the plan is a block too.
  const opens = (s: string) => (s.match(/\{/g) || []).length;
  const closes = (s: string) => (s.match(/\}/g) || []).length;
  for (let i = 0; i < lines.length; i++) {
    const head = lines[i];
    if (!DEF_HEAD.test(head.text) && !DEF_MARKED.test(head.text)) continue;
    head.role = 'definition';
    let depth = opens(head.text) - closes(head.text);
    let j = i + 1;
    if (depth <= 0 && /\)\s*;?\s*$/.test(head.text) && lines[j] && /^\s*\{/.test(lines[j].raw)) {
      lines[j].role = 'definition';
      depth += opens(lines[j].text) - closes(lines[j].text);
      j++;
    }
    if (depth > 0) {
      for (; j < lines.length && depth > 0; j++) {
        lines[j].role = 'definition';
        depth += opens(lines[j].text) - closes(lines[j].text);
      }
    } else {
      for (; j < lines.length; j++) {
        if (!lines[j].text) { lines[j].role = 'definition'; continue; }
        if (lines[j].indent <= head.indent) break;
        lines[j].role = 'definition';
      }
    }
    i = j - 1;
  }

  const canonical = lines
    .filter((l) => l.text)
    .map((l) => ' '.repeat(l.indent) + l.text)
    .join('\n');
  return { lines, notes, canonical };
}
