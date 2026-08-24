'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { getCurrentUser } from '../lib/auth';

interface SolutionPanelProps {
  lessonId: string;
  // Receives every file of the reference answer, keyed by path. An assignment
  // that grades README.md as well as script.js needs all of them inserted, or
  // the reference cannot score full marks.
  onInsert: (files: Record<string, string>) => void;
}

export default function SolutionPanel({ lessonId, onInsert }: SolutionPanelProps) {
  const [allowed, setAllowed] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, string> | null>(null);
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
    if (files !== null) return;
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
        const data = (await res.json()) as {
          files?: Record<string, string>;
          solution?: string;
        };
        // `files` is the current shape; `solution` is the older single-string
        // one. Accept either so a stale deploy of one half still works.
        const loaded =
          data.files && Object.keys(data.files).length > 0
            ? data.files
            : typeof data.solution === 'string'
              ? { 'script.js': data.solution }
              : null;
        if (loaded) setFiles(loaded);
        else setError('The solution came back empty.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = () => {
    if (!files) return;
    onInsert(files);
    setOpen(false);
  };

  const paths = files ? Object.keys(files).sort() : [];

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
            Inserting replaces your editor contents
            {paths.length > 1 ? ` in all ${paths.length} files` : ''}. Autosave
            is paused while the solution is loaded — your progress will not be
            polluted. Click<strong> Reset</strong> in the toolbar to restore the
            starter.
          </p>
          {loading && <div className="solution-dialog-status">Loading…</div>}
          {error && <div className="solution-dialog-status error">{error}</div>}
          {paths.map((p) => (
            <div key={p}>
              {paths.length > 1 && (
                <div
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: 12,
                    opacity: 0.75,
                    margin: '10px 0 4px',
                  }}
                >
                  {p}
                </div>
              )}
              <pre
                className="solution-dialog-code"
                aria-label={`Reference solution — ${p}`}
              >
                {files![p]}
              </pre>
            </div>
          ))}
          <div className="solution-dialog-actions">
            <button className="btn-secondary" onClick={() => setOpen(false)}>
              Close
            </button>
            <button
              className="btn-primary"
              onClick={handleInsert}
              disabled={paths.length === 0}
            >
              {paths.length > 1 ? 'Insert all files' : 'Insert into editor'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
