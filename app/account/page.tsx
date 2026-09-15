'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser, updateDisplayName, CurrentUser } from '../../lib/auth';

const S = {
  page: {
    minHeight: '100vh',
    background: '#282a36',
    color: '#f8f8f2',
    padding: '32px 24px',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  card: {
    maxWidth: 440,
    margin: '0 auto',
    background: '#1e1f29',
    border: '1px solid #44475a',
    borderRadius: 8,
    padding: 24,
  } as React.CSSProperties,

  h1: { fontSize: 22, fontWeight: 700, marginBottom: 20, color: '#f8f8f2' } as React.CSSProperties,

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

  inputReadonly: {
    width: '100%',
    padding: 8,
    marginBottom: 16,
    background: '#282a36',
    color: '#6272a4',
    border: '1px solid #44475a',
    borderRadius: 4,
    fontSize: 14,
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
};

export default function AccountPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUser(u);
      setName(u?.displayName ?? '');
      setLoaded(true);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const trimmed = name.trim();
      const updated = await updateDisplayName(trimmed.length > 0 ? trimmed : null);
      setUser(updated);
      setName(updated.displayName ?? '');
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
        <div style={{ maxWidth: 440, margin: '0 auto', color: '#6272a4' }}>Loading…</div>
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
        <h1 style={S.h1}>My account</h1>

        <label style={S.label}>Email</label>
        <input type="text" value={user.email} readOnly style={S.inputReadonly} />

        <form onSubmit={handleSave}>
          <label style={S.label}>Display name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="Optional — shown instead of your email"
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
