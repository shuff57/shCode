/**
 * A writeup's content.md ends with its rubric: a `---` rule, then `## Rubric` (or
 * `## How each answer is checked`) and a criterion table. Rendered in file order that table
 * sat ABOVE the "What to answer" box, so a student met the marking before the questions.
 * ContentLessonView splits the file here and draws the rubric after the questions instead
 * (owner decision, 2026-11-03).
 *
 * Returns null when the file has no such heading: the page then renders exactly as before.
 * `before` drops the trailing `---` (the grader section brings its own rule); `rubric` starts
 * at the heading and runs to the end of the file.
 */
const RUBRIC_HEADING = /^## (?:Rubric|How each answer is checked)[ \t]*$/m;

export function splitRubric(md: string): { before: string; rubric: string } | null {
  const m = RUBRIC_HEADING.exec(md);
  if (!m) return null;
  const before = md
    .slice(0, m.index)
    .replace(/\s+$/, '')
    .replace(/(?:^|\n)-{3,}$/, '')
    .replace(/\s+$/, '');
  return { before, rubric: md.slice(m.index) };
}
