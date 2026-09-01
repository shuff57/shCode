'use client';

// Shared renderer for a streamed AI tutor answer — used by the code-help panel
// and the flowchart hint panel.
//
// marked is forgiving of partial input: an unclosed code fence just renders as
// an open block, and the parse re-runs on each chunk so the final shape settles
// in. Every rendered string passes through DOMPurify before innerHTML so a
// model that emits raw HTML (deliberately, or via injection through the
// student's own text) cannot script the page.

import { useEffect, useMemo, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

marked.setOptions({ breaks: true, gfm: true });

export function renderMarkdown(text: string): string {
  const html = marked.parse(text, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input', 'object', 'embed'],
    FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload'],
  });
}

interface Props {
  text: string;
  streaming: boolean;
  /** Shown while there is nothing to render yet. */
  placeholder?: string;
  style?: React.CSSProperties;
}

export default function AiAnswer({ text, streaming, placeholder, style }: Props) {
  const html = useMemo(() => (text ? renderMarkdown(text) : ''), [text]);
  const ref = useRef<HTMLDivElement>(null);

  // Keep scroll pinned to the bottom while the answer streams in.
  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [text]);

  return (
    <>
      <div
        ref={ref}
        className="ai-help-response"
        style={{
          overflowY: 'auto',
          background: '#282a36',
          border: '1px solid #44475a',
          borderRadius: 4,
          padding: '8px 12px',
          fontSize: 13,
          lineHeight: 1.55,
          ...style,
        }}
      >
        {text ? (
          <>
            <div dangerouslySetInnerHTML={{ __html: html }} />
            {streaming ? <span style={{ color: '#bd93f9' }}>▍</span> : null}
          </>
        ) : (
          <span style={{ color: '#6272a4', fontStyle: 'italic' }}>
            {streaming ? 'Thinking…' : (placeholder ?? 'Answer will appear here.')}
          </span>
        )}
      </div>

      <style>{`
        .ai-help-response p { margin: 0 0 8px; }
        .ai-help-response p:last-child { margin-bottom: 0; }
        .ai-help-response h1,
        .ai-help-response h2,
        .ai-help-response h3,
        .ai-help-response h4 {
          color: #bd93f9;
          font-weight: 600;
          margin: 10px 0 4px;
          line-height: 1.3;
        }
        .ai-help-response h1 { font-size: 1.05em; }
        .ai-help-response h2 { font-size: 1em; }
        .ai-help-response h3,
        .ai-help-response h4 { font-size: 0.95em; }
        .ai-help-response strong { color: #f8f8f2; font-weight: 600; }
        .ai-help-response em { color: #f1fa8c; font-style: italic; }
        .ai-help-response ul,
        .ai-help-response ol { margin: 0 0 8px; padding-left: 22px; }
        .ai-help-response li { margin: 2px 0; }
        .ai-help-response code {
          background: #1e1f29;
          color: #50fa7b;
          padding: 1px 4px;
          border-radius: 3px;
          font-family: 'Fira Code', Consolas, monospace;
          font-size: 0.9em;
        }
        .ai-help-response pre {
          background: #1e1f29;
          border: 1px solid #44475a;
          border-radius: 4px;
          padding: 8px 10px;
          margin: 6px 0 10px;
          overflow-x: auto;
        }
        .ai-help-response pre code {
          background: transparent;
          color: #f8f8f2;
          padding: 0;
          font-size: 0.85em;
          line-height: 1.45;
        }
        .ai-help-response blockquote {
          border-left: 3px solid #44475a;
          margin: 6px 0;
          padding: 2px 10px;
          color: #6272a4;
        }
        .ai-help-response a { color: #8be9fd; text-decoration: underline; }
      `}</style>
    </>
  );
}
