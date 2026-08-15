'use client';

import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import LiveCodeBlock from './LiveCodeBlock';
import DiagramBlock from './DiagramBlock';

// Fence accepts an optional id for persistent storage, an optional `console`
// flag that adds a DevTools-style REPL panel under the (shplay canvas)
// preview, and an optional `plain` flag for console-track code that has no
// canvas at all:
//
//     ```js live id=sprite-demo
//     ```js live console
//     ```js live console id=inspect-sprite
//     ```js live plain
//     ```js live plain id=hello-world
//     ```
//
// `plain` swaps the shplay-iframe preview pane for a captured Output pane
// side-by-side with the editor (same execution model as the in-app console
// lesson workspace) — use it for Unit 1-4 console.log-only blocks. `console`
// is unrelated and only applies to shplay/canvas blocks that want a REPL
// attached to the running sketch (e.g. 5-3-6-example-devtools-reveal).
//
// When id is omitted, we derive one by hashing the initial code so
// edits persist across reloads without the author having to name it.
//
// A second fence renders a flowchart. The body is Mermaid (the subset in
// lib/diagram-mermaid.ts), parsed and auto-laid-out into the same drag-and-drop
// canvas the diagram assignments use:
//
//     ```flow readonly caption="Figure 1.5.8 — the voting flowchart"
//     flowchart TD
//       A([Start]) --> B[get the age]
//       B --> C{age >= 18}
//       C -- yes --> D[print "You may vote"]
//       C -- no  --> E[print "Too young"]
//     ```
//
// `readonly` makes it a figure; without it the student gets a scratch canvas
// whose rearrangement persists per block, like an edited ```js live snippet.
// `height=520` overrides the canvas height.
const FENCE = /```(js live|flow)([^\n]*)\n([\s\S]*?)```/g;

interface LiveChunk {
  kind: 'live';
  body: string;
  id: string;
  showConsole: boolean;
  plain: boolean;
}

interface FlowChunk {
  kind: 'flow';
  body: string;
  id: string;
  readOnly: boolean;
  caption?: string;
  height?: number;
}

interface HtmlChunkData {
  kind: 'html';
  body: string;
}

type Chunk = LiveChunk | FlowChunk | HtmlChunkData;

// Short stable id derived from the code body. FNV-1a 32-bit. Only used
// when the author didn't write an explicit `id=`.
function hashCode(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return (h >>> 0).toString(16);
}

// caption="..." is pulled out before whitespace tokenizing, since it is the
// one attribute whose value legitimately contains spaces.
const CAPTION = /caption\s*=\s*"([^"]*)"/;

function parseChunks(src: string): Chunk[] {
  const chunks: Chunk[] = [];
  let lastIndex = 0;
  // Position among interactive blocks. Included in the auto-id so two fences
  // with identical bodies don't collide on the same localStorage entry —
  // which caused the "edit one block, both blocks change" bug.
  let liveIndex = 0;
  for (const match of src.matchAll(FENCE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      chunks.push({ kind: 'html', body: src.slice(lastIndex, start) });
    }
    const kind = match[1];
    const body = match[3].trim();
    const rawAttrs = match[2];
    const captionMatch = kind === 'flow' ? CAPTION.exec(rawAttrs) : null;
    const tokens = (captionMatch ? rawAttrs.replace(CAPTION, '') : rawAttrs)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    let authorId: string | null = null;
    let showConsole = false;
    let plain = false;
    let readOnly = false;
    let height: number | undefined;
    for (const tok of tokens) {
      if (tok === 'console') showConsole = true;
      else if (tok === 'plain') plain = true;
      else if (tok === 'readonly' || tok === 'read-only') readOnly = true;
      else if (tok.startsWith('id=')) authorId = tok.slice(3);
      else if (tok.startsWith('height=')) {
        const n = Number(tok.slice(7));
        if (Number.isFinite(n) && n > 120) height = n;
      }
    }
    const id = authorId ?? `auto-${liveIndex}-${hashCode(body)}`;

    if (kind === 'flow') {
      chunks.push({
        kind: 'flow',
        body,
        id,
        readOnly,
        caption: captionMatch?.[1],
        height,
      });
    } else {
      chunks.push({ kind: 'live', body, id, showConsole, plain });
    }
    lastIndex = start + match[0].length;
    liveIndex++;
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
      {chunks.map((chunk, i) => {
        if (chunk.kind === 'html') {
          return <HtmlChunk key={i} html={renderMarkdown(chunk.body)} />;
        }
        if (chunk.kind === 'flow') {
          return (
            <DiagramBlock
              key={`${chunk.id}-${i}`}
              source={chunk.body}
              blockId={chunk.id}
              lessonId={lessonId}
              readOnly={chunk.readOnly}
              caption={chunk.caption}
              height={chunk.height}
            />
          );
        }
        return (
          <LiveCodeBlock
            key={`${chunk.id}-${i}`}
            code={chunk.body}
            blockId={chunk.id}
            lessonId={lessonId}
            showConsole={chunk.showConsole}
            plain={chunk.plain}
          />
        );
      })}
    </>
  );
}
