'use client';

import type { Lesson } from '../lib/types';
import { Send } from 'lucide-react';

interface AssignmentHeaderProps {
  lesson: Lesson;
  score: number;
  totalPossible: number;
  onSubmit: () => void;
  submitted: boolean;
}

export default function AssignmentHeader({
  lesson,
  score,
  totalPossible,
  onSubmit,
  submitted,
}: AssignmentHeaderProps) {
  const passingScore = lesson.grading?.passingScore || 0;
  const pct = totalPossible > 0 ? Math.round((score / totalPossible) * 100) : 0;

  return (
    <div className="assignment-header">
      <div className="assignment-header-left">
        <h1>{lesson.title}</h1>
        {lesson.week && lesson.category && (
          <span className="assignment-meta">
            Week {lesson.week} - {lesson.category}
          </span>
        )}
      </div>
      <div className="assignment-header-center">
        <div className="assignment-score">
          <div className="score-bar">
            <div
              className="score-bar-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="score-text">
            {score}/{totalPossible} pts
          </span>
        </div>
        <span className={`assignment-status ${submitted ? 'submitted' : 'in-progress'}`}>
          {submitted ? 'Submitted' : 'In Progress'}
        </span>
      </div>
      <div className="assignment-header-right">
        <button
          className="btn-primary btn-sm"
          onClick={onSubmit}
          disabled={submitted || score < passingScore}
        >
          <Send size={14} />
          Submit
        </button>
      </div>
    </div>
  );
}
