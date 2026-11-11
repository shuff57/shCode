'use client';

import { useEffect, useMemo, useRef } from 'react';
import { getHrefsByLessonNumber } from '../lib/lesson-neighbors';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import LiveCodeBlock from './LiveCodeBlock';
import DiagramBlock from './DiagramBlock';
import DemoGameBlock from './DemoGameBlock';

// Fence accepts an optional id for persistent storage, an optional `console`
// flag that adds a DevTools-style REPL panel under the (moshion canvas)
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
// `plain` swaps the moshion-iframe preview pane for a captured Output pane
// side-by-side with the editor (same execution model as the in-app console
// lesson workspace) — use it for Unit 1-4 console.log-only blocks. `console`
// is unrelated and only applies to moshion/canvas blocks that want a REPL
// attached to the running sketch (e.g. 5-3-6-example-devtools-reveal).
//
// When id is omitted, we derive one by hashing the initial code so
// edits persist across reloads without the author having to name it.
//
// `demo` turns a canvas block into a finished game the student can only PLAY: no editor, no
// Reset, just the canvas with a Play button and a Restart (components/DemoGameBlock.tsx). Add
// `size=WxH` for the play area (a tall pinball table would be squeezed into the editor's 360px
// square otherwise):
//
//     ```js live demo size=420x680 id=pinball-finished-game
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
  /** A play-only game: the code is not shown. */
  demo: boolean;
  demoSize?: { w: number; h: number };
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
    let demo = false;
    let demoSize: { w: number; h: number } | undefined;
    let height: number | undefined;
    for (const tok of tokens) {
      if (tok === 'console') showConsole = true;
      else if (tok === 'plain') plain = true;
      else if (tok === 'readonly' || tok === 'read-only') readOnly = true;
      else if (tok === 'demo') demo = true;
      else if (tok.startsWith('size=')) {
        const m = /^size=(\d{2,4})x(\d{2,4})$/.exec(tok);
        if (m) demoSize = { w: Number(m[1]), h: Number(m[2]) };
      }
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
      chunks.push({ kind: 'live', body, id, showConsole, plain, demo: demo && !plain, demoSize });
    }
    lastIndex = start + match[0].length;
    liveIndex++;
  }
  if (lastIndex < src.length) {
    chunks.push({ kind: 'html', body: src.slice(lastIndex) });
  }
  return chunks;
}

// A long inline code sample (a whole statement such as `player = new Sprite(200, 200, 40, 40)`) is
// marked `code-long` so a narrow column (the lab task card, globals.css r8 S1) can set it on its own
// line instead of breaking it mid-call. An assignment may break only after its `=`. Block code
// (`<pre><code class=...>`) is never touched: marked writes inline code as a bare `<code>`.
const LONG_INLINE_CODE = 24;
function markLongInlineCode(html: string): string {
  return html.replace(/<code>([^<]*)<\/code>/g, (whole, body: string) => {
    if (body.replace(/&[^;\s]+;/g, 'x').length < LONG_INLINE_CODE) return whole;
    const parts = body.split(/(?<= =) (?=\S)/);
    const inner = parts.length === 2
      ? parts.map((p) => `<span class="code-nowrap">${p}</span>`).join(' ')
      : body;
    return `<code class="code-long">${inner}</code>`;
  });
}

// A nested list that is really one sentence written as a list ("The six listed are" then "risk
// management," ... "and security management.") is marked `list-as-sentence` so a reading can run it on
// as that sentence (globals.css r8 S4). Only a list nested right after its lead-in text, of three or more
// short plain items where every item but the last ends with a comma (", and" / ", or" included).
function markSentenceLists(html: string): string {
  return html.replace(/(<li>[^<]+)<ul>((?:\n?<li>[^<]*<\/li>)+)\n?<\/ul>/g, (whole, lead: string, items: string) => {
    const texts = Array.from(items.matchAll(/<li>([^<]*)<\/li>/g), (m) => m[1].trim());
    if (texts.length < 3 || texts.some((t) => t.length === 0 || t.length > 40)) return whole;
    if (!texts.slice(0, -1).every((t) => /,(?:\s+(?:and|or))?$/.test(t))) return whole;
    return `${lead}<ul class="list-as-sentence">${items}</ul>`;
  });
}

function renderMarkdown(src: string): string {
  const html = markSentenceLists(markLongInlineCode(String(marked.parse(src))));
  return DOMPurify.sanitize(html);
}

// HTML is already run through DOMPurify in renderMarkdown; safe to inject.
// A lesson named in inline code ("`1.1.11 Name That Umbrella`") becomes a real link to that lesson
// once the catalog resolves its number, styled as a link rather than as code (globals.css
// .lesson-ref-link). Only code that is a lesson number followed by a capitalised title qualifies.
const LESSON_REF = /^(\d+\.\d+\.\d+)\s+[A-Z]/;

function HtmlChunk({ html }: { html: string }) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const codes = Array.from(root.querySelectorAll('code')).filter(
      (c) => !c.closest('pre, a') && LESSON_REF.test(c.textContent ?? ''),
    );
    if (codes.length === 0) return;
    let cancelled = false;
    const numbers = codes.map((c) => (c.textContent ?? '').match(LESSON_REF)![1]);
    getHrefsByLessonNumber(Array.from(new Set(numbers))).then((hrefs) => {
      if (cancelled) return;
      codes.forEach((c, i) => {
        const href = hrefs[numbers[i]];
        if (!href || !c.isConnected || c.closest('a')) return;
        const a = document.createElement('a');
        a.href = href;
        a.className = 'lesson-ref-link';
        c.replaceWith(a);
        a.appendChild(c);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [html]);
  return <article ref={ref} className="content-prose" dangerouslySetInnerHTML={{ __html: html }} />;
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
        if (chunk.demo) {
          return (
            <DemoGameBlock
              key={`${chunk.id}-${i}`}
              code={chunk.body}
              blockId={chunk.id}
              size={chunk.demoSize}
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
