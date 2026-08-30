'use client';

import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { voteOnReport } from '../lib/issue-reports-api';

export interface VoteState {
  up: number;
  down: number;
  myVote: -1 | 0 | 1;
}

interface Props {
  reportId: number;
  vote: VoteState;
  /** Called with the new tally: immediately (optimistic) and again once the
   *  server confirms it, or with the previous tally on a failed request. */
  onChange: (next: VoteState) => void;
  onError?: (message: string) => void;
}

/**
 * Thumbs up / thumbs down with the score between them. Controlled — the
 * caller owns the tally (it lives in the report list, since a vote can
 * re-sort the student queue), this component only renders it and does the
 * optimistic request/reconcile/revert dance. Shared by the student queue
 * (app/issues/page.tsx) and the teacher triage page so the two can't drift.
 */
export default function IssueVoteControl({ reportId, vote, onChange, onError }: Props) {
  const [busy, setBusy] = useState(false);

  async function cast(clicked: -1 | 1) {
    if (busy) return;
    // Clicking the already-active thumb clears the vote.
    const target: -1 | 0 | 1 = vote.myVote === clicked ? 0 : clicked;
    const previous = vote;

    const optimistic: VoteState = {
      up: vote.up - (vote.myVote === 1 ? 1 : 0) + (target === 1 ? 1 : 0),
      down: vote.down - (vote.myVote === -1 ? 1 : 0) + (target === -1 ? 1 : 0),
      myVote: target,
    };
    onChange(optimistic);
    setBusy(true);
    try {
      const result = await voteOnReport(reportId, target);
      onChange({ up: result.up, down: result.down, myVote: result.myVote });
    } catch (err) {
      onChange(previous);
      onError?.(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const score = vote.up - vote.down;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        type="button"
        aria-label="Upvote this report"
        aria-pressed={vote.myVote === 1}
        disabled={busy}
        onClick={() => void cast(1)}
        style={voteButtonStyle(vote.myVote === 1, '#50fa7b', busy)}
      >
        <ThumbsUp size={14} aria-hidden="true" />
      </button>
      <span
        aria-label={`score ${score}`}
        style={{ fontSize: 13, fontWeight: 700, minWidth: 22, textAlign: 'center', color: 'var(--text)' }}
      >
        {score}
      </span>
      <button
        type="button"
        aria-label="Downvote this report"
        aria-pressed={vote.myVote === -1}
        disabled={busy}
        onClick={() => void cast(-1)}
        style={voteButtonStyle(vote.myVote === -1, '#ff5555', busy)}
      >
        <ThumbsDown size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

function voteButtonStyle(active: boolean, color: string, busy: boolean): React.CSSProperties {
  return {
    background: active ? color : 'transparent',
    color: active ? '#1a1a1a' : 'var(--text)',
    border: `1px solid ${active ? color : 'var(--border)'}`,
    borderRadius: 4,
    width: 26,
    height: 26,
    display: 'grid',
    placeItems: 'center',
    padding: 0,
    cursor: busy ? 'not-allowed' : 'pointer',
  };
}
