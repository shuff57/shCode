'use client';

import { useState } from 'react';
import { errorText } from '../lib/http-error';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// What POST /api/classes/[id]/enrollments/bulk answers (functions/api/classes/[id]/enrollments/bulk.ts).
// This form used to read { enrolled, already_enrolled, no_account, errors } at the top level, which the route
// never sent: a successful bulk enroll threw on `result.errors.length` (ux2 T7).
interface BulkEnrollResult {
  results: Array<{ email: string; status: 'enrolled' | 'already_enrolled' | 'no_account' | 'error'; message?: string }>;
  summary: { enrolled: number; already_enrolled: number; no_account: number; error: number };
}

interface Props {
  classId: string;
  onDone: () => void;
  /** The class join code, for the "they need to sign up first" next step. */
  joinCode?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseEmails(raw: string): string[] {
  const parts: string[] = [];
  // Split by both newlines and commas
  const lines = raw.split(/[\n,]+/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      parts.push(trimmed);
    }
  }
  // Deduplicate
  return [...new Set(parts)];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BulkEnrollmentForm({ classId, onDone, joinCode }: Props) {
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkEnrollResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleEnroll() {
    const emails = parseEmails(rawText);
    if (emails.length === 0) {
      setError('Enter at least one email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/classes/${encodeURIComponent(classId)}/enrollments/bulk`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });

      if (!res.ok) {
        throw new Error(`Could not enroll: ${(await errorText(res)).replace(/\.$/, '')}. Nothing changed.`);
      }

      const json = (await res.json()) as Partial<BulkEnrollResult>;
      setResult({
        results: Array.isArray(json.results) ? json.results : [],
        summary: { enrolled: 0, already_enrolled: 0, no_account: 0, error: 0, ...(json.summary ?? {}) },
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enroll: the network did not answer. Nothing changed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: 'var(--c-deep)',
        border: '1px solid var(--c-line)',
        borderRadius: 6,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <label
        htmlFor="bulk-enroll-textarea"
        style={{ color: 'var(--c-fg)', fontWeight: 600, fontSize: 14 }}
      >
        Bulk Enroll Students
      </label>

      <textarea
        id="bulk-enroll-textarea"
        rows={8}
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder="Paste emails — one per line, or comma-separated"
        disabled={loading}
        style={{
          width: '100%',
          background: 'var(--c-bg)',
          color: 'var(--c-fg)',
          border: '1px solid var(--c-line)',
          borderRadius: 4,
          padding: '12px 12px',
          fontSize: 14,
          fontFamily: 'Courier, monospace',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />

      <button
        onClick={handleEnroll}
        disabled={loading}
        style={{
          alignSelf: 'flex-start',
          background: 'var(--c-green)',
          color: 'var(--c-bg)',
          border: 'none',
          borderRadius: 4,
          padding: '8px 20px',
          fontWeight: 700,
          fontSize: 14,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Enrolling...' : 'Enroll'}
      </button>

      {error && (
        <div style={{ color: 'var(--c-red)', fontSize: 14 }}>{error}</div>
      )}

      {result && (() => {
        const noAccount = result.results.filter((r) => r.status === 'no_account').map((r) => r.email);
        const failed = result.results.filter((r) => r.status === 'error');
        return (
        <div
          role="status"
          style={{
            background: 'var(--c-bg)',
            border: '1px solid var(--c-line)',
            borderRadius: 4,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            fontFamily: 'var(--font-prose)',
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--c-fg)',
          }}
        >
          <div>
            <span style={{ color: 'var(--c-green)', fontWeight: 600 }}>{result.summary.enrolled}</span> added to the class
          </div>
          {result.summary.already_enrolled > 0 && (
            <div>
              <span style={{ fontWeight: 600 }}>{result.summary.already_enrolled}</span> already in the class
            </div>
          )}
          {noAccount.length > 0 && (
            <div>
              <span style={{ color: 'var(--c-orange)', fontWeight: 600 }}>{noAccount.length}</span> with no student account yet:{' '}
              <span style={{ overflowWrap: 'anywhere' }}>{noAccount.join(', ')}</span>.
              <div style={{ color: 'var(--c-meta)' }}>
                They need to sign up first{joinCode ? `. Share the join code ${joinCode}, or add them here after they sign up.` : ', then add them here.'}
                {' '}A teacher account cannot be added as a student.
              </div>
            </div>
          )}
          {failed.length > 0 && (
            <div style={{ color: 'var(--c-red)' }}>
              Could not add {failed.map((f) => f.email).join(', ')}. Try them again.
            </div>
          )}
        </div>
        );
      })()}
    </div>
  );
}
