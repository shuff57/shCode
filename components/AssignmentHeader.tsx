'use client';

import type { Lesson } from '../lib/types';
import { Send } from 'lucide-react';

interface AssignmentHeaderProps {
  lesson: Lesson;
  score: number;
  totalPossible: number;
  onSubmit: () => void;
  submitted: boolean;
  canSubmit: boolean;
  /** Suffix shown after `score/totalPossible` (e.g. "pts"). Omit/empty to show just the ratio. */
  unitLabel?: string;
  /** Whether to render the "In Progress" / "Submitted" badge next to the score bar. Defaults to true. */
  showStatus?: boolean;
  /** Whether to render the right-side Submit button. Defaults to true. */
  showSubmit?: boolean;
  /** Where the score block sits. `'right'` pushes it to the right slot (used when there is no Submit button). Defaults to `'center'`. */
  scoreAlign?: 'center' | 'right';
}

export default function AssignmentHeader({
  lesson,
  score,
  totalPossible,
  onSubmit,
  submitted,
  canSubmit,
  unitLabel,
  showStatus = true,
  showSubmit = true,
  scoreAlign = 'center',
}: AssignmentHeaderProps) {
  const pct = totalPossible > 0 ? Math.round((score / totalPossible) * 100) : 0;

  const scoreBlock = (
    <div className="assignment-score">
      <div className="score-bar">
        <div
          className="score-bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="score-text">
        {score}/{totalPossible}{unitLabel ? ` ${unitLabel}` : ''}
      </span>
    </div>
  );

  const statusBadge = showStatus ? (
    <span className={`assignment-status ${submitted ? 'submitted' : 'in-progress'}`}>
      {submitted ? 'Submitted' : 'In Progress'}
    </span>
  ) : null;

  const submitButton = showSubmit ? (
    <button
      className="btn-primary btn-sm"
      onClick={onSubmit}
      disabled={submitted || !canSubmit}
    >
      <Send size={14} />
      Submit
    </button>
  ) : null;

  return (
    <div className="assignment-header">
      <div className="assignment-header-left">
        <h1>{lesson.title}</h1>
      </div>
      <div className="assignment-header-center">
        {scoreAlign === 'center' && scoreBlock}
        {statusBadge}
      </div>
      <div className="assignment-header-right">
        {scoreAlign === 'right' && scoreBlock}
        {submitButton}
      </div>
    </div>
  );
}
