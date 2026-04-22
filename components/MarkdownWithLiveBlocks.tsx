'use client';

import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import LiveCodeBlock from './LiveCodeBlock';

// Fence accepts an optional id for persistent storage and an optional
// `console` flag that adds a DevTools-style REPL panel under the preview:
//
//     ```js live id=sprite-demo
//     ```js live console
//     ```js live console id=inspect-sprite
//     ```
//
// When id is omitted, we derive one by hashing the initial code so
// edits persist across reloads without the author having to name it.
const LIVE_FENCE = /```js live([^\n]*)\n([\s\S]*?)```/g;

interface LiveChunk {
  kind: 'live';
  body: string;
  id: string;
  showConsole: boolean;
}

interface HtmlChunkData {
  kind: 'html';
  body: string;
}

type Chunk = LiveChunk | HtmlChunkData;

// Short stable id derived from the code body. FNV-1a 32-bit. Only used
// when the author didn't write an explicit `id=`.
function hashCode(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return (h >>> 0).toString(16);
}

function parseChunks(src: string): Chunk[] {
  const chunks: Chunk[] = [];
  let lastIndex = 0;
  for (const match of src.matchAll(LIVE_FENCE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      chunks.push({ kind: 'html', body: src.slice(lastIndex, start) });
    }
    const body = match[2].trim();
    const tokens = match[1].trim().split(/\s+/).filter(Boolean);
    let authorId: string | null = null;
    let showConsole = false;
    for (const tok of tokens) {
      if (tok === 'console') showConsole = true;
      else if (tok.startsWith('id=')) authorId = tok.slice(3);
    }
    const id = authorId ?? `auto-${hashCode(body)}`;
    chunks.push({ kind: 'live', body, id, showConsole });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < src.length) {
    chunks.push({ kind: 'html', body: src.slice(lastIndex) });
  }
  return chunks;
}

function renderMarkdown(src: string): string {
  const html = String(marked.parse(src));
  return DOMPurify.sanitize(html);
}

// HTML is already run through DOMPurify in renderMarkdown; safe to inject.
function HtmlChunk({ html }: { html: string }) {
  return <article className="content-prose" dangerouslySetInnerHTML={{ __html: html }} />;
}

interface Props {
  src: string;
  /** Lesson id used to namespace localStorage keys for live blocks. */
  lessonId?: string;
}

export default function MarkdownWithLiveBlocks({ src, lessonId }: Props) {
  const chunks = useMemo(() => parseChunks(src), [src]);
  return (
    <>
      {chunks.map((chunk, i) =>
        chunk.kind === 'html' ? (
          <HtmlChunk key={i} html={renderMarkdown(chunk.body)} />
        ) : (
          <LiveCodeBlock
            key={`${chunk.id}-${i}`}
            code={chunk.body}
            blockId={chunk.id}
            lessonId={lessonId}
            showConsole={chunk.showConsole}
          />
        )
      )}
    </>
  );
}
