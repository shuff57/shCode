'use client';

import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import LiveCodeBlock from './LiveCodeBlock';

const LIVE_FENCE = /```js live\n([\s\S]*?)```/g;

interface Chunk {
  kind: 'html' | 'live';
  body: string;
}

function parseChunks(src: string): Chunk[] {
  const chunks: Chunk[] = [];
  let lastIndex = 0;
  for (const match of src.matchAll(LIVE_FENCE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      chunks.push({ kind: 'html', body: src.slice(lastIndex, start) });
    }
    chunks.push({ kind: 'live', body: match[1].trim() });
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
}

export default function MarkdownWithLiveBlocks({ src }: Props) {
  const chunks = useMemo(() => parseChunks(src), [src]);
  return (
    <>
      {chunks.map((chunk, i) =>
        chunk.kind === 'html' ? (
          <HtmlChunk key={i} html={renderMarkdown(chunk.body)} />
        ) : (
          <LiveCodeBlock key={i} code={chunk.body} />
        )
      )}
    </>
  );
}
