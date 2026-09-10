'use client';

import { useRef, useEffect } from 'react';
import type { GradeReport } from '../lib/grader';

interface SubmitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  report: GradeReport | null;
  /** One part of a sat test — see Grading.summative. */
  summative?: boolean;
}

export default function SubmitDialog({ isOpen, onClose, onConfirm, report, summative = false }: SubmitDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) dialog.showModal();
    else dialog.close();
  }, [isOpen]);

  if (!report) return null;

  const isNoPoints = report.totalPossible === 0;
  const allPassed = report.results.every((r) => r.status === 'passed');
  const belowPassing = !isNoPoints && report.totalScore < report.passingScore;
  // On a test the red crosses below are not a reason to cancel, and a dialog
  // that only shows them reads like one. Say so before the list, or a student
  // backs out of handing in the work they did have.
  const partialOnTest = summative && !allPassed;

  return (
    <dialog
      ref={dialogRef}
      className="commit-dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="commit-dialog-content">
        <h3>Submit Assignment</h3>
        {partialOnTest && (
          <p className="submit-warning">
            Not everything below is green, and that is fine — this is a test.
            Hand in what you have: it unlocks the next part, and your teacher
            marks it. You can come back to this one if you have time.
          </p>
        )}
        {belowPassing && !summative && (
          <p className="submit-warning">
            Your score ({report.totalScore}/{report.totalPossible}) is below the passing
            threshold ({report.passingScore}). You can still submit, but it will not count as passing.
          </p>
        )}
        <div className="submit-breakdown">
          <div className="submit-score">
            {isNoPoints
              ? (allPassed ? 'Complete' : 'Incomplete')
              : `Score: ${report.totalScore}/${report.totalPossible}`}
          </div>
          <ul className="submit-results">
            {report.results.map((r) => (
              <li key={r.id} className={r.status === 'passed' ? 'pass' : 'fail'}>
                {r.status === 'passed' ? '\u2713' : '\u2717'}{' '}
                {isNoPoints
                  ? `${r.title} \u2014 ${r.status === 'passed' ? 'Complete' : 'Incomplete'}`
                  : `${r.pointsEarned}/${r.pointsPossible} pts`}
              </li>
            ))}
          </ul>
        </div>
        <div className="commit-dialog-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={onConfirm}>
            {partialOnTest ? 'Hand in what I have' : 'Confirm Submission'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
