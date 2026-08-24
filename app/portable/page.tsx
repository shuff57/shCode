'use client';

// /portable — the shCAD program on the left, the form that runs on jscad.app on
// the right.
//
// The conversion itself is lib/jscad-portable.mjs, which is plain text in and
// text out with no library loaded, so this page is a text box and a <pre>. It
// deliberately renders NOTHING: the JSCAD preview belongs to the workspace, and
// a second renderer here would be a second thing to keep true.
//
// A student arrives one of three ways: from the docs link in reference.md, from
// the nav, or with `?code=` — the same base64url encoding every workspace
// already uses to hand code to /jscad/runner.html, so any page that can build
// that link can build this one with a one-line change in a file it owns.

import { useEffect, useMemo, useState } from 'react';
import { convert } from '../../lib/jscad-portable.mjs';

const SAMPLE = `function main() {
  const arm = translate([50, 0, 0], box(40, 20, 20))
  const cap = sit(ring(14, 4))

  return [turn(90, arm), cap]
}
`;

function decodeCode(encoded: string): string {
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(escape(window.atob(b64)));
  } catch {
    return '';
  }
}

type Refusal = { line: number; name: string; why: string };
type Converted = { code: string; notes: string[]; refusals: Refusal[]; modules: string[] };

const panel: React.CSSProperties = {
  background: 'var(--dracula-current-line, #44475a)',
  border: '1px solid var(--dracula-comment, #6272a4)',
  borderRadius: 8,
  padding: 12,
};

const mono: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 13,
  lineHeight: 1.5,
};

export default function PortablePage() {
  const [source, setSource] = useState(SAMPLE);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const encoded = new URLSearchParams(window.location.search).get('code');
    if (encoded) {
      const decoded = decodeCode(encoded);
      if (decoded) setSource(decoded);
    }
  }, []);

  const result = useMemo<Converted | { error: string }>(() => {
    try {
      return convert(source) as Converted;
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, [source]);

  const failed = 'error' in result;

  async function copy() {
    if (failed) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '24px 16px 64px',
        color: 'var(--dracula-foreground, #f8f8f2)',
      }}
    >
      <h1 style={{ fontSize: 24, margin: '0 0 6px' }}>The portable form</h1>
      <p style={{ margin: '0 0 4px', color: 'var(--dracula-comment, #6272a4)' }}>
        Paste an shCAD program. This rewrites it into plain{' '}
        <code style={mono}>@jscad/modeling</code> so the same model runs on{' '}
        <a
          href="https://jscad.app/"
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--dracula-cyan, #8be9fd)' }}
        >
          jscad.app
        </a>
        , which needs no install.
      </p>
      <p style={{ margin: '0 0 20px', color: 'var(--dracula-comment, #6272a4)' }}>
        Two things change, not one: the twelve shCAD names, and the bare names
        shCode&apos;s runner puts in scope for you — <code style={mono}>translate</code>,{' '}
        <code style={mono}>subtract</code>, <code style={mono}>measureVolume</code> — which
        do not exist there. There is no way back: once you are reading the right-hand
        side, you have graduated.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 16,
        }}
      >
        <section style={panel}>
          <h2 style={{ fontSize: 14, margin: '0 0 8px' }}>Your shCAD program</h2>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            style={{
              ...mono,
              width: '100%',
              minHeight: 380,
              resize: 'vertical',
              background: 'var(--dracula-background, #282a36)',
              color: 'var(--dracula-foreground, #f8f8f2)',
              border: '1px solid var(--dracula-comment, #6272a4)',
              borderRadius: 6,
              padding: 10,
            }}
          />
        </section>

        <section style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <h2 style={{ fontSize: 14, margin: 0, flex: 1 }}>Runs on jscad.app</h2>
            <button
              type="button"
              onClick={copy}
              disabled={failed}
              style={{
                background: 'var(--dracula-purple, #bd93f9)',
                color: 'var(--dracula-background, #282a36)',
                border: 'none',
                borderRadius: 6,
                padding: '5px 12px',
                fontWeight: 600,
                cursor: failed ? 'default' : 'pointer',
                opacity: failed ? 0.5 : 1,
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre
            style={{
              ...mono,
              margin: 0,
              minHeight: 380,
              maxHeight: 620,
              overflow: 'auto',
              background: 'var(--dracula-background, #282a36)',
              border: '1px solid var(--dracula-comment, #6272a4)',
              borderRadius: 6,
              padding: 10,
              whiteSpace: 'pre',
            }}
          >
            {failed ? `Could not read that program: ${result.error}` : result.code}
          </pre>
        </section>
      </div>

      {!failed && result.refusals.length > 0 && (
        <section style={{ ...panel, marginTop: 16, borderColor: 'var(--dracula-orange, #ffb86c)' }}>
          <h2 style={{ fontSize: 14, margin: '0 0 8px', color: 'var(--dracula-orange, #ffb86c)' }}>
            Left exactly as you wrote it
          </h2>
          <p style={{ margin: '0 0 8px', color: 'var(--dracula-comment, #6272a4)' }}>
            These are the places the converter would have had to guess, so it did not.
            Nothing below was rewritten.
          </p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {result.refusals.map((r, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <code style={mono}>line {r.line}</code> — {r.why}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!failed && result.notes.length > 0 && (
        <section style={{ ...panel, marginTop: 16 }}>
          <h2 style={{ fontSize: 14, margin: '0 0 8px' }}>What it decided for you</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {result.notes.map((n, i) => (
              <li key={i} style={{ marginBottom: 6, color: 'var(--dracula-comment, #6272a4)' }}>
                {n}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p style={{ marginTop: 20, color: 'var(--dracula-comment, #6272a4)' }}>
        The full story, with the graduation table beside it, is in{' '}
        <a href="/docs/jscad/" style={{ color: 'var(--dracula-cyan, #8be9fd)' }}>
          the JSCAD reference
        </a>
        .
      </p>
    </main>
  );
}
