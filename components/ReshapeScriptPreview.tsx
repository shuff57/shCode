'use client';

import { useEffect, useRef, useState } from 'react';
import ReshapePreview from './ReshapePreview';
import BrepViewport from './model/BrepViewportThree';
import type { ModelDoc } from '../lib/model-types';

interface Props {
  code: string;
  runKey: number;
}

// "Code in, kernel picture out" for pages that have no Build side (the docs
// live sandbox, the docs-drawer snippet). Mounts a hidden 'script' engine
// ReshapePreview (public/reshape/script-runner.html -- see its file header
// for the message protocol) purely to eval `code` into a ModelDoc, then
// renders that doc through the SAME B-rep viewport Build mode uses
// (components/model/BrepViewportThree.tsx) instead of drawing anything
// itself. Unlike components/reshape/ReshapeStudio.tsx this has no ribbon,
// no timeline, no params panel -- just a script and a shape.
//
// OWNS ITS OWN runKey-0 PLACEHOLDER, rather than mounting ReshapePreview and
// letting ITS placeholder show through. ReshapePreview's own text ends
// "...then switch to Build to see it" -- correct advice for
// ReshapeStudio.tsx, which has a Build side, but nonsense on a docs page
// that has none. So the hidden iframe is not mounted at all until there is
// something to run; before that this component renders its own
// `reshape-empty` block (same class, same ambient styling in both the docs
// sandbox and the docs-drawer snippet) with wording that never mentions
// Build.
export default function ReshapeScriptPreview({ code, runKey }: Props) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [doc, setDoc] = useState<ModelDoc | null>(null);
  const [error, setError] = useState<{ message: string; line: number | null } | null>(null);
  const hasRun = runKey > 0;

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      const d = e.data as {
        source?: string;
        doc?: ModelDoc;
        error?: { message?: string; line?: number | null };
      };
      if (d?.source === 'reshape-doc') {
        // A throw part-way through still posts a partial doc (see
        // script-runner.html's file header) -- adopt it and clear any prior
        // error so the picture reflects whatever last built successfully.
        setDoc(d.doc ?? null);
        setError(null);
      } else if (d?.source === 'preview-error') {
        // The LAST GOOD doc stays on screen; only the error line changes.
        const line = typeof d.error?.line === 'number' ? d.error.line : null;
        setError({ message: d.error?.message ?? 'The script stopped before it finished.', line });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!hasRun) {
    return (
      <div className="reshape-empty">
        <p>Click <strong>Run</strong> to build the model.</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ReshapePreview ref={frameRef} engine="script" code={code} runKey={runKey} />
      {doc && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <BrepViewport doc={doc} />
        </div>
      )}
      {error && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '8px 12px',
            background: '#282a36',
            color: '#ff5555',
            fontFamily: "'Fira Code', Consolas, monospace",
            fontSize: '0.75rem',
            whiteSpace: 'pre-wrap',
            borderTop: '1px solid #44475a',
          }}
        >
          {error.line ? `Line ${error.line}: ${error.message}` : error.message}
        </div>
      )}
    </div>
  );
}
