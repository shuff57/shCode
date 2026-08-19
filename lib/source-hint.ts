// A quiz question's `source` names the lesson(s) to reread — "1.1.17", or
// "1.3.13, 1.3.14 and 1.3.15". Splitting it keeps the words and punctuation
// between the numbers intact so the hint still reads as a sentence once each
// number becomes a link.

const LESSON_NUMBER = /\d+\.\d+\.\d+/g;

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
