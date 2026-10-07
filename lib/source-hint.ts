// Prose that names lessons by number — a quiz question's `source`, a written
// assignment's `aiGrader.prompt`, a coding criterion's `description` or
// `hint`. Splitting the text keeps the words and punctuation between the
// numbers intact, so the hint still reads as a sentence once each number
// becomes a link.

const LESSON_NUMBER = /\d+\.\d+\.\d+/g;

// A number with one of these words in front of it is not a lesson citation --
// "Definition 1.5.5", "Figure 2.2.3". Same rule, and the same lookback, as
// scripts/check-lesson-citations.mjs, which exists because those strings are
// real in this corpus. Linking one would send a student who clicked a figure
// number to an unrelated lesson, so leaving it as text is the safe failure.
const LABELLED = /(?:definition|figure|fig\.?|table|example|section|appendix|version|v)\s*$/i;
const LOOKBEHIND = 14;

export interface SourceHintPart {
  text: string;
  /** True when this part is a lesson number rather than the prose around it. */
  isNumber: boolean;
}

export function sourceHintParts(source: string): SourceHintPart[] {
  const parts: SourceHintPart[] = [];
  const re = new RegExp(LESSON_NUMBER.source, 'g');
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const labelled = LABELLED.test(source.slice(Math.max(0, m.index - LOOKBEHIND), m.index));
    // A labelled number is prose, not a link. Leave `last` alone so the text up
    // to and including it is emitted with the next pending segment -- advancing
    // past it here would drop "Figure 2.2.3 " from the rendered text.
    if (LABELLED.test(source.slice(Math.max(0, m.index - LOOKBEHIND), m.index))) continue;
    if (m.index > last) parts.push({ text: source.slice(last, m.index), isNumber: false });
    parts.push({ text: m[0], isNumber: true });
    last = m.index + m[0].length;
  }
  if (last < source.length) parts.push({ text: source.slice(last), isNumber: false });
  return parts;
}

/** Every distinct lesson number in a hint, in order. */
export function sourceHintNumbers(source: string): string[] {
  const seen: string[] = [];
  for (const part of sourceHintParts(source)) {
    if (part.isNumber && !seen.includes(part.text)) seen.push(part.text);
  }
  return seen;
}
