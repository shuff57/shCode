import type { Lesson } from '../lib/types';
import MarkdownWithLiveBlocks from './MarkdownWithLiveBlocks';
import { withInlineCode } from './InlineCode';

// Step instructions are authored as markdown — bold terms, inline code, and
// fenced snippets showing what to type. Rendering them as plain text turned
// `**strings**` and ```js fences into literal punctuation on screen, so they
// go through the same renderer the reading lessons use.
export default function LessonSteps({ lesson }: { lesson: Lesson }) {
  return (
    <ol className="lesson-steps">
      {lesson.steps.map((s) => (
        <li key={s.id} className="lesson-step">
          <strong>{withInlineCode(s.title)}</strong>
          {s.instructions && (
            <div className="step-instructions">
              <MarkdownWithLiveBlocks src={s.instructions} lessonId={`${lesson.id}:${s.id}`} />
            </div>
          )}
          {s.hints && s.hints.length > 0 && (
            <details className="step-hints">
              <summary>Hints</summary>
              <ul>
                {s.hints.map((h, i) => (
                  <li key={i}>{withInlineCode(h)}</li>
                ))}
              </ul>
            </details>
          )}
          {s.requiredCommit && (
            <span className="step-commit-badge">Commit required</span>
          )}
        </li>
      ))}
    </ol>
  );
}
