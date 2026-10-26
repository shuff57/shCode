'use client';

import { useEffect, useRef, useState } from 'react';
import { login, signup, acceptTerms, AuthError, CurrentUser } from '../lib/auth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (user: CurrentUser) => void;
}

export default function AuthModal({ isOpen, onClose, onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'signup' | 'terms'>('login');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmedAge13, setConfirmedAge13] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  // Set after a login that reported needsTerms, until the student accepts.
  const [pendingUser, setPendingUser] = useState<CurrentUser | null>(null);
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
      setFirstName('');
      setLastName('');
      setPassword('');
      setConfirmedAge13(false);
      setAcceptedTerms(false);
      setPendingUser(null);
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
      if (mode === 'terms') {
        if (!confirmedAge13 || !acceptedTerms) {
          setError('Please tick both boxes to continue.');
          return;
        }
        await acceptTerms();
        if (pendingUser) onAuthenticated({ ...pendingUser, needsTerms: false });
        onClose();
        return;
      }
      if (mode === 'signup' && (!confirmedAge13 || !acceptedTerms)) {
        setError('Please tick both boxes to create your account.');
        return;
      }
      const user = mode === 'login'
        ? await login(email.trim(), password)
        : await signup(email.trim(), password, firstName.trim(), lastName.trim(), { confirmedAge13, acceptedTerms });
      if (mode === 'login' && user.needsTerms) {
        // Older account with no acceptance record: ask once before continuing.
        setPendingUser(user);
        setConfirmedAge13(false);
        setAcceptedTerms(false);
        setMode('terms');
        return;
      }
      onAuthenticated(user);
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
        <h3 style={{ marginTop: 0 }}>{mode === 'login' ? 'Sign in' : mode === 'terms' ? 'One more step' : 'Create account'}</h3>
        <p style={{ color: '#888', fontSize: 13, marginTop: 0 }}>
          {mode === 'login'
            ? 'Sign in to save your work and pick up on any device.'
            : mode === 'terms'
              ? 'We now have Terms of Service and a Privacy Policy. Please confirm both once to keep using your account.'
              : 'Pick any email + password. This is just to identify your commits.'}
        </p>

        {mode !== 'terms' && (
          <>
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
          </>
        )}

        {mode === 'signup' && (
          <>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              First name <span style={{ color: '#6272a4' }}>(optional)</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={100}
              autoComplete="given-name"
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
              Last name <span style={{ color: '#6272a4' }}>(optional)</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={100}
              autoComplete="family-name"
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
          </>
        )}

        {mode !== 'terms' && (
          <>
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
          </>
        )}

        {(mode === 'signup' || mode === 'terms') && (
          <div style={{ display: 'grid', gap: 8, marginBottom: 12, fontSize: 13 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <input
                type="checkbox"
                checked={confirmedAge13}
                onChange={(e) => setConfirmedAge13(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span>I am at least 13 years old.</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span>
                I have read and agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#8be9fd' }}>Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#8be9fd' }}>Privacy Policy</a>.
              </span>
            </label>
          </div>
        )}

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
            disabled={loading || (mode === 'terms' ? !confirmedAge13 || !acceptedTerms : !email.trim() || password.length < 1)}
          >
            {loading ? '...' : mode === 'login' ? 'Sign in' : mode === 'terms' ? 'Continue' : 'Create account'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {mode !== 'terms' && (
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
          )}
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
