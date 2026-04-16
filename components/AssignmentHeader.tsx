'use client';

import type { Lesson } from '../lib/types';
import { GitCommitHorizontal, History, Send } from 'lucide-react';

interface AssignmentHeaderProps {
  lesson: Lesson;
  dirtyCount: number;
  score: number;
  totalPossible: number;
  onOpenCommit: () => void;
  onOpenHistory: () => void;
  onSubmit: () => void;
  submitted: boolean;
}

export default function AssignmentHeader({
  lesson,
  dirtyCount,
  score,
  totalPossible,
  onOpenCommit,
  onOpenHistory,
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
        <button className="btn-secondary btn-sm" onClick={onOpenCommit}>
          <GitCommitHorizontal size={14} />
          Commit{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
        </button>
        <button className="btn-secondary btn-sm" onClick={onOpenHistory}>
          <History size={14} />
          History
        </button>
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
