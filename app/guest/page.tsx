'use client';

// Join as a guest (migration 0059; functions/api/guests/*, spec codehs-review/GUEST-COLLAB-SPEC.md). A student gave you
// an 8-character code (or a link to this page with it filled in). Using it ASKS: a teacher of that student's class says yes
// or no, and nothing opens until they do. Once approved you can join the Code together sessions and game rooms that student
// starts, message that student, and see Everyone. You are not in their class: no grades, no class messages, no class library. Query-string routing
// (/guest/?code=...) because the site is a static export.
// A class can also ask for a SCHOOL EMAIL first (migration 0061): the page asks for the address, the teacher emails a phrase to it from
// their school account, and the guest types it back (SchoolProof). The site sends no mail: school mail only lets school accounts
// write to each other.

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCurrentUser, type CurrentUser } from '../../lib/auth';

// `school` (migration 0061) is only on a waiting request: where the school-email proof stands. The phrase itself is never here: the
// teacher emails it from their school account to the address, and you type it back.
interface School { state: 'none' | 'need-address' | 'need-phrase' | 'locked' | 'verified'; email: string | null; domains: string[] }
interface AsGuest { id: string; status: 'pending' | 'approved' | 'declined' | 'revoked'; host: string; className: string; teacher: string; endsAt: number | null; school?: School }

const inputStyle = { fontSize: 14, padding: '7px 9px', borderRadius: 4, background: 'var(--c-bg)', color: 'var(--c-fg)', border: '1px solid var(--c-line)', minWidth: 0, flex: '1 1 180px' } as const;
const smallBtn = { fontSize: 12, padding: '5px 10px', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: 'var(--c-cyan)', border: '1px solid var(--c-line)' } as const;

/** One waiting request's school-email step: give an address, type back the phrase, or wait for a new one. */
function SchoolProof({ g, onChanged }: { g: AsGuest; onChanged: () => void }) {
  const s = g.school;
  const [addr, setAddr] = useState('');
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  if (!s || s.state === 'none') return null;
  const teacher = teacherWord(g.teacher);

  async function send(url: string, body: Record<string, unknown>, done: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) { setAddr(''); setPhrase(''); setMsg({ text: done, bad: false }); onChanged(); }
      else setMsg({ text: b.error ?? `That did not work (${res.status}).`, bad: true });
    } catch { setMsg({ text: 'Offline: try again when you are connected.', bad: true }); }
    finally { setBusy(false); }
  }

  const note = (c: string, t: string) => <div style={{ fontSize: 12, color: c, marginTop: 4, lineHeight: 1.5 }}>{t}</div>;
  return (
    <div data-testid="guest-school" data-state={s.state} style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--c-line)' }}>
      {s.state === 'verified' && note('var(--c-green)', `Your school email (${s.email}) is confirmed. Now it is up to ${teacher} to say yes.`)}
      {s.state === 'need-address' && (
        <form onSubmit={(e) => { e.preventDefault(); void send('/api/guests/school', { id: g.id, schoolEmail: addr }, 'Thanks. Now wait for the phrase.'); }}>
          {note('var(--c-fg)', `${g.className} asks for your school email, to make sure you are who you say. Type it here (it must end in ${s.domains.map((d) => `@${d}`).join(' or ')}).`)}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder={`you@${s.domains[0] ?? 'school.org'}`} aria-label="Your school email" data-testid="school-address" style={inputStyle} disabled={busy} />
            <button type="submit" style={smallBtn} disabled={busy || !addr.trim()} data-testid="school-address-save">Save</button>
          </div>
        </form>
      )}
      {(s.state === 'need-phrase' || s.state === 'locked') && (
        <>
          {s.state === 'need-phrase'
            ? note('var(--c-fg)', `${cap(teacher)} will email a phrase to ${s.email}, from their school account. When it arrives in that inbox, type it here. (School mail only lets school accounts email each other, so it comes from ${teacher}, not from this site.)`)
            : note('var(--c-orange)', `The phrase for ${s.email} ran out or was typed wrong too many times. Ask ${teacher} for a new one.`)}
          {s.state === 'need-phrase' && (
            <form onSubmit={(e) => { e.preventDefault(); void send('/api/guests/verify', { phrase }, 'Confirmed.'); }} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              <input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="shcode-ABC123" aria-label="The phrase from your school email" autoComplete="off" spellCheck={false}
                data-testid="school-phrase" style={{ ...inputStyle, fontFamily: 'monospace' }} disabled={busy} />
              <button type="submit" style={smallBtn} disabled={busy || !phrase.trim()} data-testid="school-phrase-send">Confirm</button>
            </form>
          )}
          <details style={{ marginTop: 6, fontSize: 12, color: 'var(--c-meta)' }}>
            <summary style={{ cursor: 'pointer' }}>Typed the wrong address?</summary>
            <form onSubmit={(e) => { e.preventDefault(); void send('/api/guests/school', { id: g.id, schoolEmail: addr }, 'Changed. Wait for a new phrase.'); }} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder={`you@${s.domains[0] ?? 'school.org'}`} aria-label="Your school email" style={inputStyle} disabled={busy} />
              <button type="submit" style={smallBtn} disabled={busy || !addr.trim()}>Use this address</button>
            </form>
          </details>
        </>
      )}
      {msg && <div role={msg.bad ? 'alert' : 'status'} data-testid="school-msg" style={{ fontSize: 12, marginTop: 6, color: msg.bad ? 'var(--c-red)' : 'var(--c-green)' }}>{msg.text}</div>}
    </div>
  );
}

const when = (ms: number | null) => {
  if (!ms) return '';
  try { return new Date(ms).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }); } catch { return ''; }
};

// A teacher with no name on file comes back as "Teacher": say "a teacher" then.
const teacherWord = (t: string) => (t === 'Teacher' ? 'a teacher' : t);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function statusText(g: AsGuest): { text: string; color: string } {
  if (g.status === 'pending') {
    const st = g.school?.state;
    if (st === 'need-address' || st === 'need-phrase' || st === 'locked') return { text: `Waiting for you to confirm your school email, then for ${teacherWord(g.teacher)} to say yes.`, color: 'var(--c-orange)' };
    return { text: `Waiting for ${teacherWord(g.teacher)} to say yes.`, color: 'var(--c-orange)' };
  }
  if (g.status === 'approved') return { text: `Approved${g.endsAt ? ` until ${when(g.endsAt)}` : ''}. You can join ${g.host}'s sessions.`, color: 'var(--c-green)' };
  if (g.status === 'declined') return { text: 'A teacher said no.', color: 'var(--c-red)' };
  return { text: 'This access ended.', color: 'var(--c-dim)' };
}

function GuestForm() {
  const params = useSearchParams();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [code, setCode] = useState((params.get('code') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  // Set when the class asks for a school email (migration 0061): the box appears after the code is used, naming the allowed domains.
  const [schoolAsk, setSchoolAsk] = useState<string[] | null>(null);
  const [schoolEmail, setSchoolEmail] = useState('');
  const [mine, setMine] = useState<AsGuest[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/guests', { credentials: 'same-origin', cache: 'no-store' });
      if (res.ok) setMine(((await res.json()) as { asGuest?: AsGuest[] }).asGuest ?? []);
    } catch { /* offline: keep what is shown */ }
  }, []);

  useEffect(() => {
    getCurrentUser().then((u) => { setUser(u); if (u) void load(); }).finally(() => setLoaded(true));
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 8) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch('/api/guests/redeem', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, ...(schoolAsk ? { schoolEmail } : {}) }) });
      const b = (await res.json().catch(() => ({}))) as { error?: string; host?: string; teacher?: string; needsSchoolEmail?: boolean; domains?: string[]; schoolProof?: string; schoolEmail?: string };
      if (res.ok) {
        setNote({
          text: b.schoolProof
            ? `Asked. First, ${teacherWord(b.teacher ?? 'Teacher')} emails a phrase to ${b.schoolEmail} from their school account. Type it in below when it arrives, and then they say yes or no.`
            : `Asked. ${cap(teacherWord(b.teacher ?? 'Teacher'))} will say yes or no to bringing you into ${b.host ?? 'their'} sessions. You will see it here.`,
          bad: false,
        });
        setCode('');
        setSchoolAsk(null);
        setSchoolEmail('');
        void load();
      } else if (b.needsSchoolEmail && !schoolAsk) {
        // The class asks for a school email: show the box, keep the code, and say which domains count.
        setSchoolAsk(b.domains ?? []);
        setNote({ text: `This class asks for your school email, to make sure you are who you say. Type it in and press the button again. It has to end in ${(b.domains ?? []).map((d) => `@${d}`).join(' or ')}.`, bad: false });
      } else {
        setNote({ text: b.error ?? `Could not use that code (${res.status}).`, bad: true });
      }
    } catch {
      setNote({ text: 'Offline: try again when you are connected.', bad: true });
    } finally {
      setBusy(false);
    }
  }

  async function stop(g: AsGuest) {
    const ok = g.status === 'pending' || window.confirm(`Stop being ${g.host}'s guest? You will leave any session you are in with them.`);
    if (!ok) return;
    const res = await fetch(`/api/guests/${g.id}`, { method: 'DELETE', credentials: 'same-origin' });
    if (!res.ok) { setNote({ text: 'Could not do that. Try again.', bad: true }); return; }
    setNote({ text: g.status === 'pending' ? 'Request cancelled.' : `You are not ${g.host}'s guest any more.`, bad: false });
    void load();
  }

  if (!loaded) return <div style={S.outer}><span style={{ opacity: 0.5, fontSize: 14 }}>…</span></div>;

  return (
    <div style={S.outer}>
      <div style={S.card}>
        <h1 style={S.heading}>Join as a guest</h1>
        {!user ? (
          <p style={{ color: 'var(--c-fg)', opacity: 0.8, lineHeight: 1.5 }}>
            Sign in (or make an account) with the <strong style={{ color: 'var(--c-cyan)' }}>Sign in</strong> button at the top, then come back to this page and enter your code.
          </p>
        ) : (
          <>
            <p style={{ color: 'var(--c-comment)', fontSize: 13, lineHeight: 1.5, marginTop: 0, marginBottom: 14 }}>
              A student gave you a code to join their coding sessions. A teacher at their school says yes first. You are not joining their class: no
              grades and no class messages. You can join the sessions they start and message them, and a teacher at their school can read those messages.
            </p>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label htmlFor="guest-code" className="sr-only">Guest code</label>
              <input id="guest-code" data-testid="guest-code" value={code} autoFocus autoComplete="off" spellCheck={false} maxLength={8}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="ABCD2345" disabled={busy}
                style={{ fontFamily: 'monospace', fontSize: 26, letterSpacing: '0.2em', textAlign: 'center', padding: '12px 14px', background: 'var(--c-line)', border: '1px solid var(--c-comment)', borderRadius: 6, color: 'var(--c-fg)', outline: 'none', width: '100%', boxSizing: 'border-box', textTransform: 'uppercase' }} />
              {schoolAsk && (
                <>
                  <label htmlFor="guest-school" className="sr-only">Your school email</label>
                  <input id="guest-school" data-testid="guest-school-email" type="email" value={schoolEmail} autoComplete="off" disabled={busy}
                    onChange={(e) => setSchoolEmail(e.target.value)} placeholder={`you@${schoolAsk[0] ?? 'school.org'}`}
                    style={{ fontSize: 15, padding: '10px 12px', background: 'var(--c-line)', border: '1px solid var(--c-comment)', borderRadius: 6, color: 'var(--c-fg)', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                </>
              )}
              <button type="submit" disabled={code.length !== 8 || busy} data-testid="guest-submit"
                style={{ background: code.length === 8 && !busy ? 'var(--c-purple)' : 'var(--c-line)', color: code.length === 8 && !busy ? 'var(--c-bg)' : 'var(--c-comment)', border: 'none', padding: '11px 0', borderRadius: 6, fontWeight: 700, fontSize: 15, cursor: code.length === 8 && !busy ? 'pointer' : 'not-allowed' }}>
                {busy ? 'Asking…' : 'Ask to join'}
              </button>
            </form>
          </>
        )}

        {note && (
          <p role={note.bad ? 'alert' : 'status'} data-testid="guest-note"
            style={{ marginTop: 14, fontSize: 13, lineHeight: 1.5, color: note.bad ? 'var(--c-red)' : 'var(--c-green)' }}>{note.text}</p>
        )}

        {mine.length > 0 && (
          <section aria-labelledby="my-guest-h" style={{ marginTop: 26 }}>
            <h2 id="my-guest-h" style={{ fontSize: 15, margin: '0 0 8px', color: 'var(--c-fg)' }}>Where you are a guest</h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mine.map((g) => {
                const st = statusText(g);
                return (
                  <li key={g.id} data-testid="guest-row" style={{ border: '1px solid var(--c-line)', borderRadius: 6, padding: '8px 12px' }}>
                    <div style={{ fontSize: 13, color: 'var(--c-fg)' }}><strong>{g.host}</strong> <span style={{ color: 'var(--c-dim)' }}>· {g.className}</span></div>
                    <div style={{ fontSize: 12, color: st.color, marginTop: 2 }}>{st.text}</div>
                    {g.status === 'pending' && <SchoolProof g={g} onChanged={() => void load()} />}
                    {(g.status === 'pending' || g.status === 'approved') && (
                      <button type="button" onClick={() => void stop(g)}
                        style={{ marginTop: 6, fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'transparent', color: 'var(--c-meta)', border: '1px solid var(--c-line)', cursor: 'pointer' }}>
                        {g.status === 'pending' ? 'Cancel request' : 'Stop being a guest'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {mine.some((g) => g.status === 'approved') && (
              <p style={{ fontSize: 12, color: 'var(--c-meta)', lineHeight: 1.5, marginTop: 10 }}>
                To join a session, open the <a href="/sandbox/" style={{ color: 'var(--c-cyan)' }}>sandbox</a> and press <strong>Code together</strong>.
                To write to the student, use <a href="/messages/" style={{ color: 'var(--c-cyan)' }}>Messages</a>.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default function GuestPage() {
  // useSearchParams needs a Suspense boundary in a static export.
  return <Suspense fallback={null}><GuestForm /></Suspense>;
}

const S = {
  outer: { minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '80px 16px 60px' } as React.CSSProperties,
  card: { width: '100%', maxWidth: 440 } as React.CSSProperties,
  heading: { color: 'var(--c-fg)', fontSize: 26, fontWeight: 700, marginBottom: 8, marginTop: 0 } as React.CSSProperties,
};
