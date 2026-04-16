import type { Lesson } from '../lib/types';

export default function LessonSteps({ lesson }: { lesson: Lesson }) {
  return (
    <ol className="lesson-steps">
      {lesson.steps.map((s) => (
        <li key={s.id} className="lesson-step">
          <strong>{s.title}</strong>
          {s.instructions && (
            <p className="step-instructions">{s.instructions}</p>
          )}
          {s.hints && s.hints.length > 0 && (
            <details className="step-hints">
              <summary>Hints</summary>
              <ul>
                {s.hints.map((h, i) => (
                  <li key={i}>{h}</li>
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
