'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';
import { getCurrentUser, updateName, CurrentUser } from '../../lib/auth';

const S = {
  page: {
    minHeight: '100vh',
    background: '#282a36',
    color: '#f8f8f2',
    padding: '32px 24px',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  card: {
    maxWidth: 560,
    margin: '0 auto',
    background: '#1e1f29',
    border: '1px solid #44475a',
    borderRadius: 8,
    padding: 24,
  } as React.CSSProperties,

  h1: { fontSize: 28, fontWeight: 700, marginBottom: 20, color: '#f8f8f2' } as React.CSSProperties,

  label: { display: 'block', fontSize: 13, marginBottom: 4, color: '#f8f8f2' } as React.CSSProperties,

  input: {
    width: '100%',
    padding: 8,
    marginBottom: 16,
    background: '#282a36',
    color: '#f8f8f2',
    border: '1px solid #44475a',
    borderRadius: 4,
    fontSize: 14,
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
};

export default function AccountPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUser(u);
      setFirstName(u?.firstName ?? '');
      setLastName(u?.lastName ?? '');
      setLoaded(true);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      const updated = await updateName(
        trimmedFirst.length > 0 ? trimmedFirst : null,
        trimmedLast.length > 0 ? trimmedLast : null,
      );
      setUser(updated);
      setFirstName(updated.firstName ?? '');
      setLastName(updated.lastName ?? '');
      setMessage({ kind: 'ok', text: 'Saved.' });
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div style={S.page}>
        <div style={{ maxWidth: 440, margin: '0 auto', color: '#b1bada' }}>Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={S.page}>
        <div style={{ maxWidth: 440, margin: '0 auto' }}>
          <p>
            You need to sign in first. <Link href="/" style={{ color: '#8be9fd' }}>Go home</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <Link href="/" style={{ color: '#8be9fd', fontSize: 13, textDecoration: 'none' }}>← Back to course</Link>
        <h1 style={S.h1}>My account</h1>
        <p style={{ color: '#b1bada', marginTop: -14, marginBottom: 22 }}>Manage the name shown to your class.</p>

        <h2 style={{ color: '#f8f8f2', fontSize: 18, margin: '0 0 12px' }}>Profile</h2>
        <div style={{ marginBottom: 22 }}>
          <div style={S.label}>Email</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b1bada', fontSize: 14, overflowWrap: 'anywhere' }}>
            <LockKeyhole size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span>{user.email}</span>
          </div>
          <p style={{ margin: '6px 0 0', color: '#b1bada', fontSize: 13, lineHeight: 1.5 }}>
            Your sign-in email can't be changed here.
          </p>
        </div>

        <form onSubmit={handleSave}>
          <label style={S.label}>First name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            maxLength={100}
            placeholder="Optional — shown instead of your email"
            style={S.input}
          />

          <label style={S.label}>Last name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            maxLength={100}
            placeholder="Optional"
            style={S.input}
          />

          {message && (
            <div
              style={{
                padding: 8,
                marginBottom: 16,
                borderRadius: 4,
                fontSize: 13,
                background: message.kind === 'ok' ? '#1f3a2a' : '#4a2a2a',
                color: message.kind === 'ok' ? '#c6f7d6' : '#ffd6d6',
              }}
            >
              {message.text}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}
