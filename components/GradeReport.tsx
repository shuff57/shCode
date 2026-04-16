'use client';

import type { GradeReport as GradeReportType } from '../lib/grader';
import { CircleCheck, CircleX } from 'lucide-react';

interface GradeReportProps {
  report: GradeReportType;
  commitCount: number;
  onReopen?: () => void;
  allowReopen?: boolean;
}

export default function GradeReport({ report, commitCount, onReopen, allowReopen }: GradeReportProps) {
  return (
    <div className="grade-report">
      <h2>Grade Report</h2>
      <div className="grade-report-score">
        <span className={`grade-score ${report.passed ? 'pass' : 'fail'}`}>
          {report.totalScore}/{report.totalPossible}
        </span>
        <span className="grade-label">
          {report.passed ? 'Passed' : 'Not Passing'}
        </span>
      </div>
      <div className="grade-report-details">
        {report.results.map((r) => (
          <div key={r.id} className={`grade-result ${r.status}`}>
            {r.status === 'passed' ? (
              <CircleCheck className="text-green-500" size={16} />
            ) : (
              <CircleX className="text-red-500" size={16} />
            )}
            <span className="grade-result-pts">
              {r.pointsEarned}/{r.pointsPossible} pts
            </span>
            {r.messages.length > 0 && (
              <span className="grade-result-msg">{r.messages[0]}</span>
            )}
          </div>
        ))}
      </div>
      <div className="grade-commits">
        Commits made: {commitCount}
      </div>
      {allowReopen && onReopen && (
        <button className="btn-secondary" onClick={onReopen}>
          Reopen & Continue Working
        </button>
      )}
    </div>
  );
}
