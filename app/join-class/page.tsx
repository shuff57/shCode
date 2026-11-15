'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, CurrentUser } from '../../lib/auth';

interface MyClass { class_id: string; class_name: string }

export default function JoinClassPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A student can be in several classes at once (a period 1 and a period 3 teacher, a club): the ones they are in now.
  const [mine, setMine] = useState<MyClass[]>([]);
  // Leaving a class (functions/api/leave-class.ts): the one being confirmed, and what happened.
  const [confirmLeave, setConfirmLeave] = useState<MyClass | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [leaveNote, setLeaveNote] = useState<{ text: string; bad: boolean } | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        setUser(u);
        if (u?.role !== 'student') return null;
        return fetch('/api/my-enrollments', { credentials: 'same-origin' })
          .then((res) => (res.ok ? (res.json() as Promise<{ enrollments?: MyClass[] }>) : null))
          .then((d) => { if (d && Array.isArray(d.enrollments)) setMine(d.enrollments); })
          .catch(() => undefined);
      })
      .finally(() => setLoaded(true));
  }, []);

  async function handleLeave(c: MyClass) {
    setLeaving(true);
    setLeaveNote(null);
    try {
      const res = await fetch('/api/leave-class', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: c.class_id }),
      });
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setLeaveNote({ text: b.error ?? `Could not leave the class (${res.status}).`, bad: true });
        return;
      }
      setMine((m) => m.filter((x) => x.class_id !== c.class_id));
      setConfirmLeave(null);
      setLeaveNote({ text: `You left ${c.class_name}. To get back in, enter its code below.`, bad: false });
    } catch {
      setLeaveNote({ text: 'Offline: try again when you are connected.', bad: true });
    } finally {
      setLeaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (normalized.length !== 6) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/join-class', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalized }),
      });
      // The answer is { ok, enrollment: { class_name, ... } } (functions/api/join-class.ts); this read
      // `className` before, so the message always said "the class".
      let data: { enrollment?: { class_name?: string }; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // empty body
      }
      if (res.status === 201 || res.status === 200) {
        setSuccess(`You've joined ${data.enrollment?.class_name ?? 'the class'}`);
        setTimeout(() => router.push('/'), 1200);
        return;
      }
      if (res.status === 401) {
        setError('not-signed-in');
        return;
      }
      if (res.status === 403) {
        setError('not-student');
        return;
      }
      setError(data.error ?? `Unexpected error (${res.status})`);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!loaded) {
    return (
      <div style={styles.outer}>
        <span style={{ opacity: 0.5, fontSize: 14 }}>…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.outer}>
        <div style={styles.card}>
          <h1 style={styles.heading}>Join a Class</h1>
          <p style={{ color: 'var(--c-fg)', opacity: 0.75, marginBottom: 16 }}>
            You need to be signed in to join a class.
          </p>
          <p style={{ color: 'var(--c-comment)', fontSize: 13 }}>
            Use the <strong style={{ color: 'var(--c-cyan)' }}>Sign in</strong> button in the header to
            continue.
          </p>
        </div>
      </div>
    );
  }

  if (user.role === 'teacher' || user.role === 'admin') {
    return (
      <div style={styles.outer}>
        <div style={styles.card}>
          <h1 style={styles.heading}>Join a Class</h1>
          <p style={{ color: 'var(--c-fg)', opacity: 0.75, marginBottom: 16 }}>
            Teachers don&apos;t join classes — go to{' '}
            <a href="/teacher" style={styles.link}>
              /teacher
            </a>{' '}
            to manage yours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.outer}>
      <div style={styles.card}>
        <h1 style={styles.heading}>{mine.length ? 'Join another class' : 'Join a Class'}</h1>
        {mine.length > 0 && (
          <div data-testid="my-classes" style={{ marginBottom: 20 }}>
            <p style={{ color: 'var(--c-comment)', fontSize: 13, margin: '0 0 6px' }}>
              You are in {mine.length === 1 ? '1 class' : `${mine.length} classes`} now.
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {mine.map((c) => (
                <li key={c.class_id} style={{ fontSize: 13, color: 'var(--c-fg)', padding: '3px 6px 3px 10px', borderRadius: 12, border: '1px solid var(--c-line)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {c.class_name}
                  <button type="button" onClick={() => { setLeaveNote(null); setConfirmLeave(confirmLeave?.class_id === c.class_id ? null : c); }}
                    aria-expanded={confirmLeave?.class_id === c.class_id} data-testid="leave-class"
                    aria-label={`Leave ${c.class_name}`}
                    style={{ fontSize: 11, padding: '1px 7px', borderRadius: 8, cursor: 'pointer', background: 'transparent', color: 'var(--c-meta)', border: '1px solid var(--c-line)' }}>
                    Leave
                  </button>
                </li>
              ))}
            </ul>
            {confirmLeave && (
              <div role="group" aria-label={`Leave ${confirmLeave.class_name}?`} data-testid="leave-confirm"
                style={{ marginTop: 10, padding: '10px 12px', borderRadius: 6, border: '1px solid var(--c-orange)', fontSize: 13, lineHeight: 1.5, color: 'var(--c-fg)' }}>
                <strong>Leave {confirmLeave.class_name}?</strong>
                <ul style={{ margin: '6px 0 8px', paddingLeft: 18, color: 'var(--c-meta)', listStyle: 'disc' }}>
                  <li>That class&apos;s grades and due dates stop showing for you, and its teacher no longer sees you in the class.</li>
                  <li>Pictures, sounds, fonts and games you shared only with this class are taken out of its Library.</li>
                  <li>Your lesson work is kept. You can come back any time with the class code.</li>
                </ul>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" disabled={leaving} onClick={() => void handleLeave(confirmLeave)} data-testid="leave-confirm-yes"
                    style={{ fontSize: 13, padding: '5px 12px', borderRadius: 4, cursor: 'pointer', border: 'none', fontWeight: 600, background: 'var(--c-orange)', color: 'var(--c-bg)' }}>
                    {leaving ? 'Leaving…' : 'Leave class'}
                  </button>
                  <button type="button" disabled={leaving} onClick={() => setConfirmLeave(null)}
                    style={{ fontSize: 13, padding: '5px 12px', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: 'var(--c-fg)', border: '1px solid var(--c-line)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {leaveNote && (
          <p role={leaveNote.bad ? 'alert' : 'status'} data-testid="leave-note"
            style={{ margin: '0 0 16px', fontSize: 13, lineHeight: 1.5, color: leaveNote.bad ? 'var(--c-red)' : 'var(--c-green)' }}>
            {leaveNote.text}
          </p>
        )}
        <p style={{ color: 'var(--c-comment)', fontSize: 13, marginBottom: 24 }}>
          Enter the 6-character code {mine.length ? 'for the new class' : 'your teacher gave you'}.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            minLength={6}
            placeholder="ABC123"
            disabled={loading || !!success}
            style={{
              fontFamily: 'monospace',
              fontSize: 28,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              textAlign: 'center',
              padding: '14px 16px',
              background: 'var(--c-line)',
              border: '1px solid var(--c-comment)',
              borderRadius: 6,
              color: 'var(--c-fg)',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
            }}
            autoComplete="off"
            autoFocus
          />

          <button
            type="submit"
            disabled={code.length !== 6 || loading || !!success}
            style={{
              background: code.length === 6 && !loading && !success ? 'var(--c-purple)' : 'var(--c-line)',
              color: code.length === 6 && !loading && !success ? 'var(--c-bg)' : 'var(--c-comment)',
              border: 'none',
              padding: '12px 0',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 15,
              cursor: code.length === 6 && !loading && !success ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {loading ? 'Joining…' : 'Join Class'}
          </button>
        </form>

        {success && (
          <p
            style={{
              marginTop: 20,
              color: 'var(--c-green)',
              fontWeight: 600,
              fontSize: 15,
              textAlign: 'center',
            }}
          >
            {success}
          </p>
        )}

        {error === 'not-signed-in' && (
          <p style={{ ...styles.errorBox }}>
            You&apos;re not signed in. Use the{' '}
            <strong style={{ color: 'var(--c-cyan)' }}>Sign in</strong> button in the header.
          </p>
        )}

        {error === 'not-student' && (
          <p style={{ ...styles.errorBox }}>
            Only students can join classes.{' '}
            <a href="/teacher" style={styles.link}>
              Go to /teacher
            </a>{' '}
            to manage your classes.
          </p>
        )}

        {error && error !== 'not-signed-in' && error !== 'not-student' && (
          <p style={{ ...styles.errorBox }}>{error}</p>
        )}

        {/* A student gave you a code to join THEIR sessions (migration 0059): a different thing from joining a class. */}
        <p style={{ marginTop: 28, fontSize: 13, color: 'var(--c-comment)', lineHeight: 1.5 }}>
          Did a student give you a <strong style={{ color: 'var(--c-fg)' }}>guest code</strong> (8 letters and numbers) instead?{' '}
          <a href="/guest/" style={styles.link}>Use it here</a>.
        </p>
      </div>
    </div>
  );
}

const styles = {
  outer: {
    minHeight: '100vh',
    background: 'var(--c-bg)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 80,
    paddingBottom: 60,
    paddingLeft: 16,
    paddingRight: 16,
  } as React.CSSProperties,
  card: {
    width: '100%',
    maxWidth: 440,
  } as React.CSSProperties,
  heading: {
    color: 'var(--c-fg)',
    fontSize: 26,
    fontWeight: 700,
    marginBottom: 8,
    marginTop: 0,
  } as React.CSSProperties,
  link: {
    color: 'var(--c-cyan)',
    textDecoration: 'underline',
  } as React.CSSProperties,
  errorBox: {
    marginTop: 16,
    color: 'var(--c-red)',
    fontSize: 14,
    lineHeight: 1.5,
    background: 'color-mix(in srgb, var(--c-red) 10.0%, transparent)',
    border: '1px solid color-mix(in srgb, var(--c-red) 30.0%, transparent)',
    borderRadius: 6,
    padding: '10px 14px',
  } as React.CSSProperties,
};
