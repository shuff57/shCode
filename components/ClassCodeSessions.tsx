'use client';

// The class page's "Code together sessions" (Students tab): every shared
// sandbox program whose host or anyone who joined it is in this class, newest
// first, from GET /api/classes/[id]/code-sessions. A Code together program is
// free text, so the session's own copy is kept for the class's teachers (30
// days); View opens it read-only. Students are told so on the bar.

import { useCallback, useEffect, useState } from 'react';
import { errorText } from '../lib/http-error';

interface Row {
  id: string;
  code: string;
  kind: 'js' | 'moshion';
  host: string;
  people: string[];
  startedAt: number;
  updatedAt: number;
  closedAt: number | null;
  chars: number;
}

function when(ms: number): string {
  try {
    return new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ClassCodeSessions({ classId }: { classId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [text, setText] = useState<Record<string, string>>({});
  const [textError, setTextError] = useState<string | null>(null);

  const base = `/api/classes/${encodeURIComponent(classId)}/code-sessions`;
  const load = useCallback(async () => {
    const res = await fetch(base, { credentials: 'same-origin' });
    // The class page above has already found this class, so a 404 here means this list has nothing for it (a
    // class this route's data does not know yet): show the empty state, never "Class not found" (ux3).
    if (res.status === 404) { setError(null); setRows([]); return; }
    if (!res.ok) { setError(await errorText(res)); return; }
    setError(null);
    setRows(((await res.json()) as { sessions: Row[] }).sessions);
  }, [base]);
  useEffect(() => { void load(); }, [load]);

  const view = async (r: Row) => {
    if (open === r.id) { setOpen(null); return; }
    setOpen(r.id);
    setTextError(null);
    const res = await fetch(`${base}?id=${encodeURIComponent(r.id)}`, { credentials: 'same-origin' });
    if (!res.ok) { setTextError(await errorText(res)); return; }
    const s = ((await res.json()) as { session: { text?: string } }).session;
    setText((t) => ({ ...t, [r.id]: s.text ?? '' }));
  };

  if (error) return <p style={{ color: 'var(--c-red)', fontSize: 13 }}>{error}</p>;
  if (!rows) return <p style={{ color: 'var(--c-dim)', fontSize: 13 }}>Loading…</p>;
  if (!rows.length) {
    return <p style={{ color: 'var(--c-dim)', fontSize: 13, margin: 0 }}>No sessions yet. When students press &ldquo;Code together&rdquo; in the sandbox and write a program together, it shows up here for 30 days.</p>;
  }
  const btn = { fontSize: 12, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: 'var(--c-cyan)', border: '1px solid var(--c-line)' } as const;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="code-sessions">
      {rows.map((r) => (
        <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, minWidth: 160 }}>
              <strong>{r.people.join(', ')}</strong>{' '}
              <span style={{ color: 'var(--c-dim)' }}>
                · {r.kind === 'moshion' ? 'moSHion' : 'JavaScript'} · started by {r.host} · {when(r.startedAt)}
                {r.closedAt ? ` · ended ${when(r.closedAt)}` : ' · still open'} · {r.chars.toLocaleString()} characters
              </span>
            </div>
            <span style={{ flex: 1 }} />
            <button type="button" style={btn} aria-expanded={open === r.id} onClick={() => void view(r)}>
              {open === r.id ? 'Hide program' : 'View program'}
            </button>
          </div>
          {open === r.id && (
            textError
              ? <p style={{ color: 'var(--c-red)', fontSize: 13, margin: 0 }}>{textError}</p>
              : (
                <pre
                  aria-label={`Program written by ${r.people.join(', ')}`}
                  style={{
                    margin: 0, padding: '8px 10px', maxHeight: 320, overflow: 'auto', fontSize: 12, lineHeight: 1.5,
                    background: 'var(--c-bg)', color: 'var(--c-fg)', border: '1px solid var(--c-line)', borderRadius: 4,
                    fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace", whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
                  }}
                >
                  {text[r.id] ?? 'Loading…'}
                </pre>
              )
          )}
        </div>
      ))}
    </div>
  );
}
