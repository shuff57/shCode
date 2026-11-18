'use client';

// "From p5play" in the moSHion sandbox toolbar: paste a p5play program, an AI rebuilds it as moSHion
// (POST /api/p5play-convert, DeepSeek V4.1 Flash through OpenRouter), and the result opens as a NEW
// moSHion project. Nothing the student already has is written over: the open project is untouched,
// and the converted code is a project of its own with the AI's notes on what it changed.
//
// The paste is sent to an AI service outside shCode, so the dialog says so, and the server refuses a
// paste carrying a phone number, email or street address (lib/pii-check.ts).

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Wand2, X } from 'lucide-react';
import { createProject } from '../lib/sandbox-projects';
import { MAX_CONVERT_INPUT, looksLikeMoshionAlready } from '../lib/p5play-convert-core';
import { errorText } from '../lib/http-error';

interface Props {
  chipStyle: React.CSSProperties;
  /** The code in the editor now, offered as "Use the code in the editor". */
  getCode?: () => string;
}

interface Result { code: string; notes: string[]; warnings: string[]; remaining: number | null }

const mono: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 12,
  lineHeight: 1.45, background: 'var(--c-deep)', color: 'var(--c-fg)', border: '1px solid var(--c-line)',
  borderRadius: 4, padding: 8, resize: 'vertical',
};
const primary: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
  background: 'var(--c-green)', color: 'var(--c-deep)',
};
const quiet: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13,
  background: 'transparent', color: 'var(--c-fg)', border: '1px solid var(--c-line)',
};

/** The AI writes names in `backticks`: show those as code, everything else as plain text (never HTML). */
function withCode(note: string): React.ReactNode[] {
  return note.split(/`([^`\n]+)`/).map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part));
}

export default function P5playConvertButton({ chipStyle, getCode }: Props) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState('');
  const [name, setName] = useState('From p5play');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const reqRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    boxRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy]);

  async function convert() {
    const code = source;
    if (!code.trim()) { setError('Paste a p5play program first.'); return; }
    const req = ++reqRef.current;
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/p5play-convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (req !== reqRef.current) return;
      if (!res.ok) { setError(await errorText(res)); return; }
      const out = await res.json() as { code?: string; notes?: string[]; warnings?: string[]; remaining?: number | null };
      if (typeof out.code !== 'string' || !out.code.trim()) { setError('The AI did not send back a program. Try again.'); return; }
      setResult({
        code: out.code,
        notes: Array.isArray(out.notes) ? out.notes : [],
        warnings: Array.isArray(out.warnings) ? out.warnings : [],
        remaining: out.remaining ?? null,
      });
    } catch {
      if (req === reqRef.current) setError(navigator.onLine ? 'Could not reach shCode. Try again.' : 'You\'re offline. Try again when you\'re back online.');
    } finally {
      if (req === reqRef.current) setBusy(false);
    }
  }

  async function openAsProject() {
    if (!result) return;
    setBusy(true); setError(null);
    const made = await createProject('moshion', name.trim() || 'From p5play', { 'script.js': result.code });
    setBusy(false);
    if (!made.ok) { setError(made.error); return; }
    setOpen(false); setResult(null); setSource('');
  }

  const already = source.trim() && looksLikeMoshionAlready(source);

  return (
    <>
      <button
        type="button"
        style={chipStyle}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => { setOpen(true); setError(null); }}
        title="Paste a p5play program and an AI rebuilds it in moSHion, as a new project"
        data-testid="p5play-convert-button"
      >
        <Wand2 size={12} aria-hidden="true" />
        From p5play
      </button>
      {/* Into <body>, as Code together's dialog is: inside the toolbar the editor's pane divider drew over it. */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '6vh 16px', overflowY: 'auto',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="p5play-convert-title"
            style={{
              width: 'min(760px, 100%)', background: 'var(--c-deep2)', border: '1px solid var(--c-line)', borderRadius: 6,
              padding: 16, color: 'var(--c-fg)', fontSize: 13, lineHeight: 1.5, boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <h2 id="p5play-convert-title" style={{ fontSize: 15, margin: 0, flex: 1 }}>Bring in a p5play program</h2>
              <button type="button" aria-label="Close" style={{ ...quiet, padding: 4, border: 'none' }} disabled={busy} onClick={() => setOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <p style={{ margin: '0 0 10px', color: 'var(--c-dim)' }}>
              Paste a program written for p5play (version 3, or an older one). An AI rebuilds it in moSHion, and it opens as a new project, so
              nothing you have now is changed. The AI can get things wrong: run it and check. Your program is sent
              to an AI service outside shCode, so leave out names and anything personal.
            </p>

            {!result && (
              <>
                <label htmlFor="p5play-source" style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>p5play program</label>
                <textarea
                  id="p5play-source"
                  ref={boxRef}
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  rows={14}
                  spellCheck={false}
                  maxLength={MAX_CONVERT_INPUT}
                  placeholder={'function setup() {\n  new Canvas(400, 400);\n  player = new Sprite();\n  ...'}
                  style={mono}
                  disabled={busy}
                />
                {already && (
                  <p style={{ margin: '4px 0 0', color: 'var(--c-orange)' }}>
                    This already looks like moSHion (it has update() or drawTop() and nothing p5-only). Converting it may change little.
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button type="button" style={primary} disabled={busy || !source.trim()} onClick={() => void convert()}>
                    {busy ? 'Converting… (this can take a minute)' : 'Convert to moSHion'}
                  </button>
                  {getCode && (
                    <button type="button" style={quiet} disabled={busy} onClick={() => setSource(getCode())}>
                      Use the code in the editor
                    </button>
                  )}
                  <span style={{ color: 'var(--c-dim)', fontSize: 12 }}>
                    {source.length.toLocaleString('en-US')} / {MAX_CONVERT_INPUT.toLocaleString('en-US')} characters
                  </span>
                </div>
              </>
            )}

            {result && (
              <>
                <label htmlFor="p5play-result" style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>moSHion program</label>
                <textarea id="p5play-result" readOnly value={result.code} rows={16} spellCheck={false} style={mono} />
                {result.warnings.map((w, i) => (
                  <p key={i} role="status" style={{ margin: '6px 0 0', color: 'var(--c-orange)' }}>{w}</p>
                ))}
                {result.notes.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <strong>What the AI changed</strong>
                    <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                      {result.notes.map((n, i) => <li key={i}>{withCode(n)}</li>)}
                    </ul>
                  </div>
                )}
                <p style={{ margin: '8px 0 0', color: 'var(--c-dim)', fontSize: 12 }}>
                  Lines the AI could not match exactly have a <code>// CONVERTED:</code> comment.
                  {result.remaining !== null && ` ${result.remaining} conversion${result.remaining === 1 ? '' : 's'} left today.`}
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    Project name
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={60}
                      style={{ ...mono, width: 200, resize: 'none', padding: '4px 6px', fontFamily: 'inherit', fontSize: 13 }}
                    />
                  </label>
                  <button type="button" style={primary} disabled={busy} onClick={() => void openAsProject()}>
                    Open as a new project
                  </button>
                  <button type="button" style={quiet} disabled={busy} onClick={() => setResult(null)}>
                    Back
                  </button>
                </div>
              </>
            )}

            {error && <p role="alert" style={{ margin: '10px 0 0', color: 'var(--c-red)' }}>{error}</p>}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
