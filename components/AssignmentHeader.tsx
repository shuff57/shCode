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
  /** Id for an empty slot at the end of the status row: the desktop tool buttons
   *  (TabbedRightDrawer's inlineHostId) render into it. */
  toolsHostId?: string;
  /** The lab was handed in (this visit or an earlier one): said in place of "still needed" (ux1 B2). */
  doneNote?: string;
  /** Hide the "0/1 done" count: on a return visit nothing has been checked yet, and a zero read as lost work. */
  hideScore?: boolean;
  /** A lab's next step as the check stands now (ux2 S4): "Next: fix the red one ...", "Next: Submit". */
  nextHint?: string;
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
  toolsHostId,
  doneNote,
  hideScore = false,
  nextHint,
}: AssignmentHeaderProps) {
  const pct = totalPossible > 0 ? Math.round((score / totalPossible) * 100) : 0;

  const scoreBlock = hideScore ? null : (
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

  const statusBadge = showStatus && !doneNote && !(compactLab && !submitted) ? (
    <span className={`assignment-status ${submitted ? 'submitted' : 'in-progress'}`}>
      {submitted ? 'Submitted' : 'In Progress'}
    </span>
  ) : null;

  const unmetHint = doneNote ? (
    <div className="assignment-done-note"><span aria-hidden="true">✓ </span>{doneNote}</div>
  ) : compactLab && nextHint ? (
    // A lab says its next step as the check stands NOW: never "press Check" right after a Check.
    <div className="assignment-unmet-hint" role="status" aria-live="polite">
      <span className="assignment-unmet-desktop">{nextHint}</span>
      <span className="assignment-unmet-mobile">{unmetTitles && unmetTitles.length > 0 ? `${unmetTitles.length} still needed` : nextHint.replace(/^Next: /, '')}</span>
    </div>
  ) :
    !submitted && !canSubmit && unmetTitles && unmetTitles.length > 0 ? (
      compactLab ? (
        // One status on a lab (climb4 r9 S6): the count sits in the score text, so the hint is the next action.
        <div className="assignment-unmet-hint">
          <span className="assignment-unmet-desktop">Next: press Check to test your code</span><span className="assignment-unmet-mobile">{unmetTitles.length} still needed</span>
        </div>
      ) : <div className="assignment-unmet-hint">
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
        {lesson.description && <p style={{ margin: '8px 0 0', color: 'var(--c-fg)', fontSize: 15, lineHeight: 1.5, maxWidth: 680 }}>{lesson.description}</p>}
      </div>
      <div className="assignment-header-center" style={{ flexWrap: 'wrap', justifyContent: 'flex-start' }}>
        <div className="assignment-quota">{attemptNote}</div>
        {scoreAlign === 'center' && scoreBlock}
        {statusBadge}
        {unmetHint}
        {scoreAlign === 'right' && scoreBlock}
        {submitButton}
        {toolsHostId ? <div id={toolsHostId} className="shd-inline-host" /> : null}
      </div>
    </div>
  );
}
