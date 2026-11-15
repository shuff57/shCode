'use client';

// "Newly public" on the class page (Students tab; migration 0058): what this class's students shared with EVERYONE,
// newest first, with Take down and Put back, and the class switch. GET|POST /api/classes/[id]/public-shares; the rules
// are in functions/_shared/publicShare.ts.
//
// Public is live at once, so this list is how a teacher notices: the envelope's Activity feed also tells you when
// something goes public and links here. Taking something down is sticky (the student cannot make it public again
// until you put it back), leaves it in the student's classes, and shows the student "Your teacher took this down" with
// the short reason you type (optional, 140 characters). Putting it back only lets them choose Everyone again.
// The switch stops Everyone for every student of this class: nothing new, and what they had public goes dark.

import { useCallback, useEffect, useState } from 'react';
import { errorText } from '../lib/http-error';
import { playHref } from '../lib/games-client';
import { useFeedback } from './FeedbackProvider';

interface Row {
  kind: 'item' | 'game';
  id: string;
  what: 'picture' | 'sound' | 'font' | 'game';
  name: string;
  owner: string;
  sharedAt: number;
  pulled: { reason: string | null; at: number } | null;
}

const REASON_MAX = 140;

function when(ms: number): string {
  try {
    return new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

const btn = { fontSize: 12, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: 'var(--c-cyan)', border: '1px solid var(--c-line)', textDecoration: 'none' } as const;

export default function ClassPublicShares({ classId }: { classId: string }) {
  const { toast } = useFeedback();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [off, setOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulling, setPulling] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const base = `/api/classes/${encodeURIComponent(classId)}/public-shares`;
  const load = useCallback(async () => {
    const res = await fetch(base, { credentials: 'same-origin' });
    if (res.status === 404) { setError(null); setRows([]); return; }
    if (!res.ok) { setError(await errorText(res)); return; }
    setError(null);
    const b = (await res.json()) as { items: Row[]; publicSharingOff: boolean };
    setRows(b.items);
    setOff(b.publicSharingOff);
  }, [base]);
  useEffect(() => { void load(); }, [load]);

  const post = async (body: Record<string, unknown>, done: string): Promise<boolean> => {
    setBusy(true);
    const res = await fetch(base, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) { toast(await errorText(res), { kind: 'error' }); return false; }
    const b = (await res.json()) as { items: Row[]; publicSharingOff: boolean };
    setRows(b.items);
    setOff(b.publicSharingOff);
    toast(done);
    return true;
  };

  const key = (r: Row) => `${r.kind}:${r.id}`;
  const takeDown = async (r: Row) => {
    const ok = await post({ action: 'pull', kind: r.kind, id: r.id, reason }, `Took down "${r.name}". ${r.owner} is told in their Activity${reason.trim() ? ', with your reason' : ''}.`);
    if (ok) { setPulling(null); setReason(''); }
  };

  const classSwitch = (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 8 }}>
      <input type="checkbox" checked={!off} disabled={busy} data-testid="public-class-switch" onChange={(e) => void post(
        { action: e.target.checked ? 'class-on' : 'class-off' },
        e.target.checked
          ? 'Students in this class can share with everyone again, and what they had public is back.'
          : 'Sharing with everyone is off for this class. Nothing new can go public, and what these students had public is hidden until you turn it back on.',
      )} />
      Let students in this class share with everyone
    </label>
  );

  if (error) return <p style={{ color: 'var(--c-red)', fontSize: 13 }}>{error}</p>;
  if (!rows) return <p style={{ color: 'var(--c-dim)', fontSize: 13 }}>Loading…</p>;

  return (
    <div id="public-shares" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--c-meta)', lineHeight: 1.5 }}>
        Students can share a picture, sound, font or game with <strong>everyone in a class on shCode</strong>. It goes live at once, so
        this is where you see it. Taking it down puts it back with their classes.
      </p>
      {classSwitch}
      {!rows.length && (
        <p style={{ color: 'var(--c-dim)', fontSize: 13, margin: 0 }}>Nothing from this class is shared with everyone.</p>
      )}
      {rows.map((r) => (
        <div key={key(r)} data-testid="public-row" style={{ display: 'flex', flexDirection: 'column', gap: 4, opacity: r.pulled ? 0.85 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, minWidth: 160 }}>
              <strong>{r.name}</strong> <span style={{ color: 'var(--c-dim)' }}>{r.what} by {r.owner} · {when(r.sharedAt)}</span>
              {r.pulled && <span style={{ color: 'var(--c-orange)' }}> · taken down{r.pulled.reason ? `: ${r.pulled.reason}` : ''}</span>}
            </div>
            <span style={{ flex: 1 }} />
            {r.kind === 'game' && <a href={playHref(r.id)} target="_blank" rel="noopener noreferrer" style={btn}>Play ↗</a>}
            {r.pulled
              ? <button type="button" style={btn} disabled={busy} data-testid="public-restore"
                  onClick={() => void post({ action: 'restore', kind: r.kind, id: r.id }, `"${r.name}" can be shared with everyone again. ${r.owner} has to choose Everyone for it to go public.`)}>Put back</button>
              : <button type="button" style={{ ...btn, color: 'var(--c-red)' }} disabled={busy} data-testid="public-pull" aria-expanded={pulling === key(r)}
                  onClick={() => { setReason(''); setPulling(pulling === key(r) ? null : key(r)); }}>Take down…</button>}
          </div>
          {pulling === key(r) && !r.pulled && (
            <form onSubmit={(e) => { e.preventDefault(); void takeDown(r); }}
              style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '6px 8px', border: '1px solid var(--c-line)', borderRadius: 4 }}>
              <label htmlFor={`pull-${key(r)}`} className="sr-only">Why (optional, {r.owner} reads it)</label>
              <input id={`pull-${key(r)}`} value={reason} maxLength={REASON_MAX} autoFocus onChange={(e) => setReason(e.target.value)}
                placeholder={`Why? ${r.owner} will read this (optional)`} data-testid="public-reason"
                style={{ flex: '1 1 220px', minWidth: 0, fontSize: 13, padding: '5px 8px', borderRadius: 4, background: 'var(--c-deep)', color: 'var(--c-fg)', border: '1px solid var(--c-line)' }} />
              <span style={{ fontSize: 11, color: 'var(--c-dim)' }}>{reason.length}/{REASON_MAX}</span>
              <button type="submit" disabled={busy} data-testid="public-pull-confirm"
                style={{ ...btn, color: 'var(--c-bg)', background: 'var(--c-red)', border: '1px solid var(--c-red)', fontWeight: 600 }}>{busy ? 'Taking down…' : 'Take down'}</button>
              <button type="button" style={btn} onClick={() => setPulling(null)}>Cancel</button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}
