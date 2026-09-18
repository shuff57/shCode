'use client';

import { useEffect, useState } from 'react';

// The teacher reference for a module page. Ships nothing statically: the
// rendered doc arrives through GET /api/module-doc/[id], which refuses
// non-teacher roles server-side. Signed-out students get an empty panel —
// there is nothing in this component's props, or in the page's RSC payload,
// for a student to read.
export default function ModuleTeacherPanel({ moduleId }: { moduleId: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<Array<{ filename: string; label: string; html: string }>>([]);
  const [state, setState] = useState<'loading' | 'denied' | 'ready' | 'none'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/module-doc/${encodeURIComponent(moduleId)}`);
        if (cancelled) return;
        if (res.status === 403) { setState('denied'); return; }
        if (res.status === 404) { setState('none'); return; }
        if (!res.ok) { setState('denied'); return; }
        const doc = await res.json();
        setHtml(doc.html ?? null);
        setArtifacts(doc.artifacts ?? []);
        setState(doc.html ? 'ready' : 'none');
      } catch {
        if (!cancelled) setState('denied');
      }
    })();
    return () => { cancelled = true; };
  }, [moduleId]);

  if (state === 'loading' || state === 'denied' || state === 'none' || !html) return null;

  return (
    <details>
      <summary style={{ cursor: 'pointer', opacity: 0.55, fontSize: 14, padding: '8px 0' }}>
        Module overview (teacher reference)
      </summary>
      <article
        className="prose"
        style={{ marginTop: 12 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {artifacts.length > 0 && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ cursor: 'pointer', opacity: 0.55, fontSize: 14, padding: '8px 0' }}>
            Legacy module-level markdown files ({artifacts.length})
          </summary>
          {artifacts.map((a) => (
            <div key={a.filename} style={{ marginTop: 12 }}>
              <h3 style={{ margin: '16px 0 4px' }}>{a.label}</h3>
              <code style={{ opacity: 0.55, fontSize: 12 }}>{a.filename}</code>
              <article className="prose" dangerouslySetInnerHTML={{ __html: a.html }} />
            </div>
          ))}
        </details>
      )}
    </details>
  );
}