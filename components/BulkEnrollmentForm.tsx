'use client';

import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BulkEnrollResult {
  enrolled: number;
  already_enrolled: number;
  no_account: number;
  errors: string[];
}

interface Props {
  classId: string;
  onDone: () => void;
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

export function BulkEnrollmentForm({ classId, onDone }: Props) {
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
        const msg = await res.text().catch(() => 'Unknown error');
        throw new Error(msg || `${res.status}`);
      }

      const json = (await res.json()) as BulkEnrollResult;
      setResult(json);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: '#1e1f29',
        border: '1px solid #44475a',
        borderRadius: 6,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <label
        htmlFor="bulk-enroll-textarea"
        style={{ color: '#f8f8f2', fontWeight: 600, fontSize: '0.9rem' }}
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
          background: '#282a36',
          color: '#f8f8f2',
          border: '1px solid #44475a',
          borderRadius: 4,
          padding: '10px 12px',
          fontSize: '0.85rem',
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
          background: '#50fa7b',
          color: '#282a36',
          border: 'none',
          borderRadius: 4,
          padding: '8px 20px',
          fontWeight: 700,
          fontSize: '0.88rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Enrolling...' : 'Enroll'}
      </button>

      {error && (
        <div style={{ color: '#ff5555', fontSize: '0.85rem' }}>{error}</div>
      )}

      {result && (
        <div
          style={{
            background: '#282a36',
            border: '1px solid #44475a',
            borderRadius: 4,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            fontSize: '0.85rem',
            color: '#f8f8f2',
          }}
        >
          <div>
            <span style={{ color: '#50fa7b', fontWeight: 600 }}>{result.enrolled}</span> enrolled
          </div>
          <div>
            <span style={{ color: '#f1fa8c', fontWeight: 600 }}>{result.already_enrolled}</span> already enrolled
          </div>
          <div>
            <span style={{ color: '#ffb86c', fontWeight: 600 }}>{result.no_account}</span> no account found
          </div>
          {result.errors.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <span style={{ color: '#ff5555', fontWeight: 600 }}>Errors:</span>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                {result.errors.map((e, i) => (
                  <li key={i} style={{ color: '#ff5555' }}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
