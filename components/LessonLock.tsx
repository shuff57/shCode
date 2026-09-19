'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export default function LessonLock({
  lessonId,
  title,
  description,
  hasCode,
}: {
  lessonId: string;
  title: string;
  description: string;
  hasCode: boolean;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !code.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, code }),
      });
      const data = await res.json();
      if (data.ok) {
        router.refresh();
        return;
      }
      setError(data.message || 'That code is not right.');
    } catch {
      setError('Could not reach the server. Try again.');
    }
    setBusy(false);
  }

  return (
    <div className="p-4 flex justify-center">
      <div
        className="bg-card border-border border rounded p-8 mt-12 w-full max-w-lg border-l-4 shadow-lg"
        style={{ borderLeftColor: 'var(--brand)' }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Lock size={22} aria-hidden="true" />
          <h1 className="text-2xl font-bold text-text">{title}</h1>
        </div>
        <p className="text-med text-text/70 mb-6">{description}</p>

        {hasCode ? (
          <form onSubmit={submit}>
            <label htmlFor="unlockCode" className="block mb-2 text-text">
              This assessment is locked. Enter the code your teacher gives you.
            </label>
            <div className="flex gap-2">
              <input
                id="unlockCode"
                name="unlockCode"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
                autoFocus
                placeholder="Unlock code"
                aria-describedby={error ? 'unlockError' : undefined}
                className="border border-border bg-muted text-text p-2 rounded flex-1"
              />
              <button type="submit" disabled={busy} className="border border-border p-2 rounded">
                {busy ? 'Checking…' : 'Unlock'}
              </button>
            </div>
            {error ? (
              <p id="unlockError" role="alert" className="mt-3 text-text">
                {error}
              </p>
            ) : null}
          </form>
        ) : (
          <p className="text-text">
            This assessment is closed. It opens on the day it is scheduled.
          </p>
        )}

        <p className="mt-6">
          <Link href="/" className="text-brand">
            Back to lessons
          </Link>
        </p>
      </div>
    </div>
  );
}
