'use client';

import { useRef, useEffect } from 'react';
import type { GradeReport } from '../lib/grader';

interface SubmitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  report: GradeReport | null;
}

export default function SubmitDialog({ isOpen, onClose, onConfirm, report }: SubmitDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) dialog.showModal();
    else dialog.close();
  }, [isOpen]);

  if (!report) return null;

  const belowPassing = report.totalScore < report.passingScore;

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
        {belowPassing && (
          <p className="submit-warning">
            Your score ({report.totalScore}/{report.totalPossible}) is below the passing
            threshold ({report.passingScore}). You can still submit, but it will not count as passing.
          </p>
        )}
        <div className="submit-breakdown">
          <div className="submit-score">
            Score: {report.totalScore}/{report.totalPossible}
          </div>
          <ul className="submit-results">
            {report.results.map((r) => (
              <li key={r.id} className={r.status === 'passed' ? 'pass' : 'fail'}>
                {r.status === 'passed' ? '\u2713' : '\u2717'}{' '}
                {r.pointsEarned}/{r.pointsPossible} pts
              </li>
            ))}
          </ul>
        </div>
        <div className="commit-dialog-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={onConfirm}>
            Confirm Submission
          </button>
        </div>
      </div>
    </dialog>
  );
}
