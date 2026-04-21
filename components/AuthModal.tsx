'use client';

import { useEffect, useRef, useState } from 'react';
import { login, signup, AuthError } from '../lib/auth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (email: string) => void;
}

export default function AuthModal({ isOpen, onClose, onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      dialog.showModal();
      setTimeout(() => emailRef.current?.focus(), 0);
    } else {
      dialog.close();
      setEmail('');
      setPassword('');
      setError(null);
      setMode('login');
    }
  }, [isOpen]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const fn = mode === 'login' ? login : signup;
      const user = await fn(email.trim(), password);
      onAuthenticated(user.email);
      onClose();
    } catch (err) {
      if (err instanceof AuthError) setError(err.serverMessage);
      else setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="auth-dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <form onSubmit={submit} className="auth-form">
        <h3 style={{ marginTop: 0 }}>{mode === 'login' ? 'Sign in' : 'Create account'}</h3>
        <p style={{ color: '#888', fontSize: 13, marginTop: 0 }}>
          {mode === 'login'
            ? 'Sign in to save your work and pick up on any device.'
            : 'Pick any email + password. This is just to identify your commits.'}
        </p>

        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Email</label>
        <input
          ref={emailRef}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={{
            width: '100%',
            padding: 8,
            marginBottom: 12,
            background: '#282a36',
            color: '#f8f8f2',
            border: '1px solid #44475a',
            borderRadius: 4,
            fontSize: 14,
          }}
        />

        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
          Password {mode === 'signup' && <span style={{ color: '#6272a4' }}>(≥ 8 chars)</span>}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode === 'signup' ? 8 : undefined}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          style={{
            width: '100%',
            padding: 8,
            marginBottom: 12,
            background: '#282a36',
            color: '#f8f8f2',
            border: '1px solid #44475a',
            borderRadius: 4,
            fontSize: 14,
          }}
        />

        {error && (
          <div style={{
            padding: 8,
            marginBottom: 12,
            background: '#4a2a2a',
            color: '#ffd6d6',
            borderRadius: 4,
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !email.trim() || password.length < 1}
          >
            {loading ? '...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              color: '#8be9fd',
              cursor: 'pointer',
              fontSize: 13,
              textDecoration: 'underline',
            }}
          >
            {mode === 'login' ? 'Need an account? Sign up' : 'Already have one? Sign in'}
          </button>
        </div>
      </form>
      <style>{`
        .auth-dialog {
          padding: 0;
          border: 1px solid #44475a;
          border-radius: 8px;
          background: #1e1f29;
          color: #f8f8f2;
          width: min(420px, 92vw);
        }
        .auth-dialog::backdrop { background: rgba(0,0,0,0.5); }
        .auth-form { padding: 20px; }
      `}</style>
    </dialog>
  );
}
