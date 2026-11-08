'use client';

import type { Lesson } from '../lib/types';
import type { ReactNode } from 'react';
import { Send } from 'lucide-react';

interface AssignmentHeaderProps {
  lesson: Lesson;
  compactLab?: boolean;
  attemptNote?: ReactNode;
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
  /** Titles of requirements not yet passing. When Submit is disabled because
   *  of unmet requirements (not a runtime error), shown as a small list so a
   *  student isn't stuck guessing what's missing (issue #26) -- the Submit
   *  gate itself is unchanged, this only makes the reason visible. */
  unmetTitles?: string[];
  /** On an AI Check lab: Run does not mark the cards, Check does. Shown beside the count. */
  unmetNote?: string;
  /** Why Submit is shut when no card is: on a moSHion lab, the code in the editor has not run
   *  clean yet (lib/ai-check.ts moshionSubmitWords). Shown in place of the "Still needed" list. */
  blockedNote?: string;
}

export default function AssignmentHeader({
  lesson,
  compactLab = false,
  attemptNote,
  score,
  totalPossible,
  onSubmit,
  submitted,
  canSubmit,
  unitLabel,
  showStatus = true,
  showSubmit = true,
  scoreAlign = 'center',
  unmetTitles,
  unmetNote,
  blockedNote,
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
        {score}/{totalPossible}{unitLabel ? ` ${unitLabel}` : ' done'}
      </span>
    </div>
  );

  const statusBadge = showStatus ? (
    <span className={`assignment-status ${submitted ? 'submitted' : 'in-progress'}`}>
      {submitted ? 'Submitted' : 'In Progress'}
    </span>
  ) : null;

  const unmetHint =
    !submitted && !canSubmit && unmetTitles && unmetTitles.length > 0 ? (
      <div className="assignment-unmet-hint">
        <span className="assignment-unmet-desktop">Still needed: </span>{unmetTitles.length}<span className="assignment-unmet-mobile"> still needed</span><span className="assignment-unmet-desktop"> {unmetTitles.length === 1 ? 'requirement' : 'requirements'} · press Check</span>
      </div>
    ) : !submitted && !canSubmit && blockedNote ? (
      <div className="assignment-unmet-hint">{blockedNote}</div>
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
    <div className={`assignment-header ${compactLab ? 'lab-assignment-header' : ''}`}>
      <div className="assignment-header-left">
        <h1>{lesson.title}</h1>
        {lesson.description && <p style={{ margin: '8px 0 0', color: '#f8f8f2', fontSize: 15, lineHeight: 1.5, maxWidth: 680 }}>{lesson.description}</p>}
      </div>
      <div className="assignment-header-center" style={{ flexWrap: 'wrap', justifyContent: 'flex-start' }}>
        <div className="assignment-quota">{attemptNote}</div>
        {scoreAlign === 'center' && scoreBlock}
        {statusBadge}
        {unmetHint}
        {scoreAlign === 'right' && scoreBlock}
        {submitButton}
      </div>
    </div>
  );
}
