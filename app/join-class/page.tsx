'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, CurrentUser } from '../../lib/auth';

export default function JoinClassPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((u) => setUser(u))
      .finally(() => setLoaded(true));
  }, []);

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
      let data: { className?: string; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // empty body
      }
      if (res.status === 201 || res.status === 200) {
        setSuccess(`You've joined ${data.className ?? 'the class'}`);
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
          <p style={{ color: '#f8f8f2', opacity: 0.75, marginBottom: 16 }}>
            You need to be signed in to join a class.
          </p>
          <p style={{ color: '#6272a4', fontSize: 13 }}>
            Use the <strong style={{ color: '#8be9fd' }}>Sign in</strong> button in the header to
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
          <p style={{ color: '#f8f8f2', opacity: 0.75, marginBottom: 16 }}>
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
        <h1 style={styles.heading}>Join a Class</h1>
        <p style={{ color: '#6272a4', fontSize: 13, marginBottom: 24 }}>
          Enter the 6-character code your teacher gave you.
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
              background: '#44475a',
              border: '1px solid #6272a4',
              borderRadius: 6,
              color: '#f8f8f2',
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
              background: code.length === 6 && !loading && !success ? '#bd93f9' : '#44475a',
              color: code.length === 6 && !loading && !success ? '#282a36' : '#6272a4',
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
              color: '#50fa7b',
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
            <strong style={{ color: '#8be9fd' }}>Sign in</strong> button in the header.
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
      </div>
    </div>
  );
}

const styles = {
  outer: {
    minHeight: '100vh',
    background: '#282a36',
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
    color: '#f8f8f2',
    fontSize: 26,
    fontWeight: 700,
    marginBottom: 8,
    marginTop: 0,
  } as React.CSSProperties,
  link: {
    color: '#8be9fd',
    textDecoration: 'underline',
  } as React.CSSProperties,
  errorBox: {
    marginTop: 16,
    color: '#ff5555',
    fontSize: 14,
    lineHeight: 1.5,
    background: 'rgba(255,85,85,0.1)',
    border: '1px solid rgba(255,85,85,0.3)',
    borderRadius: 6,
    padding: '10px 14px',
  } as React.CSSProperties,
};
