'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { getCurrentUser } from '../lib/auth';

interface SolutionPanelProps {
  lessonId: string;
  onInsert: (code: string) => void;
}

export default function SolutionPanel({ lessonId, onInsert }: SolutionPanelProps) {
  const [allowed, setAllowed] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solution, setSolution] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    getCurrentUser().then((u) => {
      setAllowed(u?.role === 'admin' || u?.role === 'teacher');
    });
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [open]);

  const reveal = async () => {
    setOpen(true);
    if (solution !== null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lesson-solution/${encodeURIComponent(lessonId)}`);
      if (res.status === 404) {
        setError('No solution has been recorded for this lesson yet.');
      } else if (res.status === 403) {
        setError('You don’t have permission to view solutions.');
      } else if (!res.ok) {
        setError(`Failed to load solution (HTTP ${res.status}).`);
      } else {
        const data = (await res.json()) as { solution: string };
        setSolution(data.solution);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = () => {
    if (!solution) return;
    onInsert(solution);
    setOpen(false);
  };

  if (!allowed) return null;

  return (
    <>
      <button
        type="button"
        className="btn-secondary btn-sm"
        onClick={reveal}
        title="Admin/teacher only — review the reference solution and optionally insert it into the editor"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
      >
        <Eye size={14} />
        Solution
      </button>
      <dialog
        ref={dialogRef}
        className="solution-dialog"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setOpen(false);
        }}
      >
        <div className="solution-dialog-content">
          <div className="solution-dialog-header">
            <h3>Reference solution</h3>
            <span className="solution-dialog-badge">admin / teacher only</span>
          </div>
          <p className="solution-dialog-desc">
            Inserting replaces your editor contents. Autosave is paused while
            the solution is loaded — your progress will not be polluted. Click
            <strong> Reset</strong> in the toolbar to restore the starter.
          </p>
          {loading && <div className="solution-dialog-status">Loading…</div>}
          {error && <div className="solution-dialog-status error">{error}</div>}
          {solution && (
            <pre className="solution-dialog-code" aria-label="Reference solution code">
              {solution}
            </pre>
          )}
          <div className="solution-dialog-actions">
            <button className="btn-secondary" onClick={() => setOpen(false)}>
              Close
            </button>
            <button
              className="btn-primary"
              onClick={handleInsert}
              disabled={!solution}
            >
              Insert into editor
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
