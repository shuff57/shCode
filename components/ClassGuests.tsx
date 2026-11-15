'use client';

// "Guests" on the class page (Students tab; migration 0059): students of this class asked to bring an account holder into
// the sessions THEY start, and nothing opens until you say yes. GET|POST /api/classes/[id]/guests; rules in
// functions/_shared/guests.ts.
//
// Anyone with an account can be asked for, and signup does not verify email, so this list shows what you decide on: the
// address, whether it is a student or teacher account, how old the account is, and the student's own words for who this is.
// Approve lasts until the school year's cutoff; Decline is a no that stands (the pair cannot use another code); End stops
// an approved guest AND takes them out of any session they are in at once. The switch turns guests off for the whole class.

import { useCallback, useEffect, useState } from 'react';
import { errorText } from '../lib/http-error';
import { useFeedback } from './FeedbackProvider';

interface Row {
  id: string;
  status: 'pending' | 'approved' | 'declined' | 'revoked';
  host: string;
  guest: { name: string; email: string | null; role: string | null; accountSince: number | null };
  // The school-email proof (migration 0061). `phrase` is the one-time phrase to email, here and nowhere else.
  school: { state: 'none' | 'need-address' | 'need-phrase' | 'locked' | 'verified'; email: string | null; verifiedAt: number | null; phrase: string | null };
  relation: string;
  // What the host said about them (migration 0062): their claim, in their own words.
  details: { name: string; age: string; org: string; purpose: string };
  askedAt: number | null;
  decidedAt: number | null;
  endsAt: number | null;
  endedBy: 'teacher' | 'host' | 'guest' | null;
}

const btn = { fontSize: 12, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: 'var(--c-cyan)', border: '1px solid var(--c-line)' } as const;
/** Do the name the host gave and the account's own name share a word? null when either is missing (nothing to compare). */
function sameName(given: string, account: string): boolean | null {
  const words = (t: string) => t.toLowerCase().split(/[^\p{L}]+/u).filter((w) => w.length > 1);
  const a = words(given), b = new Set(words(account));
  if (!a.length || !b.size) return null;
  return a.some((w) => b.has(w));
}
const date = (ms: number | null) => {
  if (!ms) return '';
  try { return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return ''; }
};

export default function ClassGuests({ classId, onPendingChange }: { classId: string; onPendingChange?: (waiting: number) => void }) {
  const { toast, confirm } = useFeedback();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [off, setOff] = useState(false);
  const [unused, setUnused] = useState(0);
  const [schoolOn, setSchoolOn] = useState(false);
  const [domains, setDomains] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const base = `/api/classes/${encodeURIComponent(classId)}/guests`;
  const apply = (b: { guests: Row[]; guestsOff: boolean; unusedCodes: number; schoolRequired: boolean; schoolDomains: string[] }) => {
    onPendingChange?.(b.guests.filter((g) => g.status === 'pending').length);
    setRows(b.guests); setOff(b.guestsOff); setUnused(b.unusedCodes); setSchoolOn(b.schoolRequired); setDomains(b.schoolDomains.join(', '));
  };
  const load = useCallback(async () => {
    const res = await fetch(base, { credentials: 'same-origin' });
    if (res.status === 404) { setError(null); setRows([]); return; }
    if (!res.ok) { setError(await errorText(res)); return; }
    setError(null);
    apply(await res.json());
  }, [base]);
  useEffect(() => { void load(); }, [load]);

  const post = async (body: Record<string, unknown>, done: string) => {
    setBusy(true);
    const res = await fetch(base, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) { toast(await errorText(res), { kind: 'error' }); return; }
    apply(await res.json());
    toast(done);
  };

  const decide = async (r: Row, action: 'approve' | 'decline' | 'revoke') => {
    if (action === 'decline' && !(await confirm({
      title: `Say no to ${r.guest.name || r.guest.email}?`,
      message: `${r.host} will be told. This person cannot be invited by ${r.host} again with another code.`,
      confirmLabel: 'Say no', danger: true,
    }))) return;
    if (action === 'revoke' && !(await confirm({
      title: `End ${r.guest.name || r.guest.email}'s access?`,
      message: `They are taken out of any session they are in with ${r.host} right now, and cannot join another or send ${r.host} messages. You can still read what was said.`,
      confirmLabel: 'End access', danger: true,
    }))) return;
    await post({ action, id: r.id }, action === 'approve' ? `Approved. ${r.guest.name || 'They'} can join ${r.host}'s sessions until the end of the school year.` : action === 'decline' ? 'Said no.' : 'Ended. They are out of the sessions.');
  };

  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (id: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(id); window.setTimeout(() => setCopied(null), 1500); } catch { /* the phrase is on screen to read */ }
  };

  const schoolSettings = (
    // Folded away while it is off: a class that does not use the school-email check should not carry its settings on every visit.
    <details data-testid="guest-school-settings" open={schoolOn || undefined} style={{ border: '1px solid var(--c-line)', borderRadius: 6, padding: '8px 10px', marginBottom: 8 }}>
      <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--c-meta)' }}>
        School email check: {schoolOn ? 'on' : 'off (your approval is the only gate)'}
      </summary>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginTop: 8 }}>
        <input type="checkbox" checked={schoolOn} disabled={busy} data-testid="guest-school-switch"
          onChange={(e) => void post({ action: 'school-settings', required: e.target.checked, domains }, e.target.checked ? 'Guests now have to confirm a school email before you can approve them.' : 'Guests no longer need a school email. Your approval is the only gate.')} />
        Ask guests for a school email first
      </label>
      <p style={{ margin: '4px 0 6px', fontSize: 12, color: 'var(--c-meta)', lineHeight: 1.5 }}>
        School mail only lets school accounts write to each other, so this site sends nothing: you email the phrase shown on the request, and the guest types it back.
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <label htmlFor={`school-domains-${classId}`} style={{ fontSize: 12, color: 'var(--c-dim)' }}>School domains</label>
        <input id={`school-domains-${classId}`} value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="yourschool.org, student.yourschool.org" data-testid="guest-school-domains"
          style={{ fontSize: 13, padding: '4px 8px', borderRadius: 4, background: 'var(--c-bg)', color: 'var(--c-fg)', border: '1px solid var(--c-line)', flex: '1 1 220px', minWidth: 0 }} />
        <button type="button" style={btn} disabled={busy} data-testid="guest-school-save"
          onClick={() => void post({ action: 'school-settings', required: schoolOn, domains }, 'Saved the school domains.')}>Save</button>
      </div>
    </details>
  );

  const classSwitch = (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 8 }}>
      <input type="checkbox" checked={!off} disabled={busy} data-testid="guest-class-switch" onChange={(e) => void post(
        { action: e.target.checked ? 'class-on' : 'class-off' },
        e.target.checked ? 'Students in this class can invite guests again, and approved guests can join again.' : 'Guests are off for this class: no new invites, and every approved guest is shut out until you turn it back on.',
      )} />
      Let students in this class invite guests
    </label>
  );

  if (error) return <p style={{ color: 'var(--c-red)', fontSize: 13 }}>{error}</p>;
  if (!rows) return <p style={{ color: 'var(--c-dim)', fontSize: 13 }}>Loading…</p>;

  const pending = rows.filter((r) => r.status === 'pending');
  const approved = rows.filter((r) => r.status === 'approved');
  const ended = rows.filter((r) => r.status === 'declined' || r.status === 'revoked');

  const who = (r: Row) => (
    <div style={{ fontSize: 13, minWidth: 220, flex: '1 1 260px' }}>
      <strong>{r.guest.name || r.guest.email}</strong>{' '}
      <span style={{ color: 'var(--c-dim)' }}>
        {r.guest.name ? `${r.guest.email} · ` : ''}{r.guest.role ?? 'account'} account{r.guest.accountSince ? `, made ${date(r.guest.accountSince)}` : ''}
      </span>
      <div style={{ color: 'var(--c-meta)', fontSize: 12 }}>
        Invited by <strong>{r.host}</strong>{r.relation ? <> · &ldquo;{r.relation}&rdquo;</> : null}
      </div>
      {(r.details.name || r.details.org || r.details.purpose) && (
        <div data-testid="guest-details" style={{ fontSize: 12, color: 'var(--c-fg)', lineHeight: 1.6, marginTop: 2 }}>
          <div>Says their name is <strong>{r.details.name || 'not given'}</strong>
            {r.details.age ? <> · <strong style={{ color: r.details.age === 'adult' ? 'var(--c-orange)' : 'var(--c-fg)' }}>{r.details.age === 'adult' ? 'an adult (18 or older)' : 'age 13 to 17'}</strong></> : null}
          </div>
          {sameName(r.details.name, r.guest.name) === false && (
            <div data-testid="guest-name-mismatch" style={{ color: 'var(--c-orange)' }}>The account&apos;s name ({r.guest.name}) is different from the name given.</div>
          )}
          {r.details.org ? <div>School or work: <strong>{r.details.org}</strong></div> : null}
          {r.details.purpose ? <div>Plan: &ldquo;{r.details.purpose}&rdquo;</div> : null}
        </div>
      )}
      {r.school.email && (
        <div style={{ color: r.school.state === 'verified' ? 'var(--c-green)' : 'var(--c-meta)', fontSize: 12 }} data-testid="guest-school-line">
          School email: <strong>{r.school.email}</strong>{r.school.state === 'verified' ? ' · confirmed' : ''}
        </div>
      )}
    </div>
  );

  return (
    <div id="guests" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--c-meta)', lineHeight: 1.5 }}>
        A student can ask to bring someone with an account into the sessions they start. Nothing opens until you say yes.
      </p>
      <details style={{ fontSize: 12, color: 'var(--c-meta)', lineHeight: 1.5, maxWidth: '70ch', marginBottom: 4 }}>
        <summary style={{ cursor: 'pointer', color: 'var(--c-cyan)' }}>How this works</summary>
        <p style={{ margin: '4px 0 0' }}>
          Guests are not in your class: no roster, grades or class messages, and they cannot start sessions. They can message the student who
          invited them, and you can read it under Messages (marked guest). Signup does not check email, so go by the address and what the student wrote.
        </p>
      </details>
      {classSwitch}
      {schoolSettings}
      {!pending.length && !approved.length && !ended.length && (
        <p style={{ color: 'var(--c-dim)', fontSize: 13, margin: 0 }}>
          No guests yet.{unused ? ` ${unused} invite code${unused === 1 ? ' is' : 's are'} out and not used.` : ''}
        </p>
      )}

      {pending.length > 0 && <h3 style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--c-orange)' }}>Waiting for you ({pending.length})</h3>}
      {pending.map((r) => (
        <div key={r.id} data-testid="guest-pending" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '6px 8px', border: '1px solid color-mix(in srgb, var(--c-orange) 45%, transparent)', borderRadius: 6 }}>
          {who(r)}
          <span style={{ flex: 1 }} />
          {r.school.state === 'need-address' || r.school.state === 'need-phrase' || r.school.state === 'locked' ? (
            <span style={{ fontSize: 12, color: 'var(--c-orange)' }} data-testid="guest-school-wait">Waiting for their school email</span>
          ) : (
            <button type="button" style={{ ...btn, color: 'var(--c-bg)', background: 'var(--c-green)', border: '1px solid var(--c-green)', fontWeight: 600 }} disabled={busy} data-testid="guest-approve" onClick={() => void decide(r, 'approve')}>Approve</button>
          )}
          <button type="button" style={{ ...btn, color: 'var(--c-red)' }} disabled={busy} data-testid="guest-decline" onClick={() => void decide(r, 'decline')}>Say no…</button>
          {r.school.state === 'need-phrase' && r.school.phrase && (
            <div data-testid="guest-school-phrase" style={{ flexBasis: '100%', fontSize: 12, color: 'var(--c-fg)', lineHeight: 1.6 }}>
              From <strong>your school account</strong>, email this phrase to <strong>{r.school.email}</strong>, and wait for {r.guest.name || 'them'} to type it back:{' '}
              <code style={{ fontSize: 15, letterSpacing: '0.08em', background: 'var(--c-line)', padding: '2px 6px', borderRadius: 4 }}>{r.school.phrase}</code>{' '}
              <button type="button" style={btn} onClick={() => void copy(r.id, r.school.phrase ?? '')}>{copied === r.id ? 'Copied' : 'Copy'}</button>
              <span style={{ color: 'var(--c-dim)' }}> It works for 7 days and is deleted when they use it or you decide.</span>
            </div>
          )}
          {r.school.state === 'need-address' && (
            <div style={{ flexBasis: '100%', fontSize: 12, color: 'var(--c-dim)' }}>They have not given a school address yet. This class asks for one.</div>
          )}
          {r.school.state === 'locked' && (
            <div style={{ flexBasis: '100%', fontSize: 12, color: 'var(--c-dim)' }}>
              The phrase ran out or was typed wrong too many times.{' '}
              <button type="button" style={btn} disabled={busy} data-testid="guest-school-new" onClick={() => void post({ action: 'school-phrase', id: r.id }, 'Made a new phrase.')}>Make a new phrase</button>
            </div>
          )}
        </div>
      ))}

      {approved.length > 0 && <h3 style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--c-green)' }}>Approved ({approved.length})</h3>}
      {approved.map((r) => (
        <div key={r.id} data-testid="guest-approved" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {who(r)}
          <span style={{ fontSize: 12, color: 'var(--c-dim)' }}>until {date(r.endsAt)}</span>
          <span style={{ flex: 1 }} />
          <button type="button" style={{ ...btn, color: 'var(--c-red)' }} disabled={busy} data-testid="guest-revoke" onClick={() => void decide(r, 'revoke')}>End access…</button>
        </div>
      ))}

      {ended.length > 0 && <h3 style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--c-dim)' }}>Recently ended</h3>}
      {ended.map((r) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', opacity: 0.75 }}>
          {who(r)}
          <span style={{ fontSize: 12, color: 'var(--c-dim)' }}>
            {r.status === 'declined' ? 'you said no' : r.endedBy === 'teacher' ? 'you ended it' : `${r.endedBy === 'host' ? 'the student' : 'the guest'} ended it`} · {date(r.decidedAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
