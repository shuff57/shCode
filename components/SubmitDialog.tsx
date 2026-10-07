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
  // A part of a sat test is marked by the teacher afterwards, and the browser
  // cannot mark it: lib/quiz-redact.ts strips each requirement's `pattern`
  // (the pattern IS the answer key), so every result here reads `failed`
  // whatever the student wrote. Showing those as red crosses told a student
  // with a fully fixed program "Incomplete" and "not everything is green"
  // (measured on 3.10.3, 2026-10-03). So a test part lists what will be
  // marked, with no verdict, and says plainly who does the marking.

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
        {summative && (
          <p className="submit-warning">
            This is a test part, so the browser does not mark it. Hand in what
            you have: it unlocks the next part, and your teacher marks it. You
            can come back to this one if you have time.
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
            {summative
              ? 'Your teacher marks these'
              : isNoPoints
                ? (allPassed ? 'Complete' : 'Incomplete')
                : `Score: ${report.totalScore}/${report.totalPossible}`}
          </div>
          <ul className="submit-results">
            {report.results.map((r) => (
              <li key={r.id} className={summative ? '' : r.status === 'passed' ? 'pass' : 'fail'}>
                {summative ? '\u2022' : r.status === 'passed' ? '\u2713' : '\u2717'}{' '}
                {summative
                  ? r.title
                  : isNoPoints
                  ? `${r.title} \u2014 ${r.status === 'passed' ? 'Complete' : 'Incomplete'}`
                  : `${r.pointsEarned}/${r.pointsPossible} pts`}
              </li>
            ))}
          </ul>
        </div>
        <div className="commit-dialog-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={onConfirm}>
            {summative ? 'Hand in' : 'Confirm Submission'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
