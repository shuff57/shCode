'use client';

// A ```flow fence inside a reading section or slide. Two modes:
//
//   readonly  — a figure. The diagram the author wrote, pannable but not
//               editable, with an optional caption underneath.
//   (default) — a scratch canvas. Same starter, but the student can rearrange
//               it and their version persists in localStorage, exactly the way
//               a ```js live block keeps an edited snippet.
//
// Nothing here submits or grades. That is DiagramAssignmentView's job.

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { RotateCcw } from 'lucide-react';
import EditorPlaceholder from './diagram/EditorPlaceholder';
import { fromMermaid } from './../lib/diagram-mermaid';

// Lazy for the same reason as DiagramAssignmentView — a reading section with
// no ```flow fence must not pay for React Flow.
const DiagramEditor = dynamic(() => import('./diagram/DiagramEditor'), {
  ssr: false,
  loading: () => <EditorPlaceholder height={420} />,
});
import { diagramFrameHeight, type DiagramDoc } from '../lib/diagram-types';

const STORAGE_PREFIX = 'shCode:flowblock:';

interface Props {
  /** Mermaid source from the fence body. */
  source: string;
  blockId: string;
  lessonId?: string;
  readOnly?: boolean;
  caption?: string;
  height?: number;
}

export default function DiagramBlock({
  source,
  blockId,
  lessonId,
  readOnly = false,
  caption,
  height,
}: Props) {
  const starter = useMemo(() => fromMermaid(source), [source]);
  // Size the frame to the diagram unless the author pinned a height.
  const frameHeight = height ?? diagramFrameHeight(starter);
  const storageKey = `${STORAGE_PREFIX}${lessonId ?? 'global'}:${blockId}`;

  const [doc, setDoc] = useState<DiagramDoc>(starter);
  const [ready, setReady] = useState(readOnly);

  useEffect(() => {
    if (readOnly) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          setDoc({ version: 1, nodes: parsed.nodes, edges: parsed.edges });
        }
      }
    } catch {}
    setReady(true);
  }, [storageKey, readOnly]);

  const onChange = useCallback(
    (next: DiagramDoc) => {
      setDoc(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
    },
    [storageKey],
  );

  const reset = useCallback(() => {
    setDoc(fromMermaid(source));
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [source, storageKey]);

  if (!ready) return null;

  return (
    <figure style={{ margin: '20px 0' }}>
      <DiagramEditor
        value={doc}
        onChange={readOnly ? undefined : onChange}
        readOnly={readOnly}
        height={frameHeight}
        onReset={readOnly ? undefined : reset}
      />
      {caption ? (
        <figcaption
          style={{
            color: '#8b93a7',
            fontSize: 12.5,
            fontStyle: 'italic',
            textAlign: 'center',
            marginTop: 8,
            lineHeight: 1.5,
          }}
        >
          {caption}
        </figcaption>
      ) : null}
      {!readOnly && !caption ? (
        <figcaption
          style={{
            color: '#6272a4',
            fontSize: 12,
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <RotateCcw size={12} />
          Scratch canvas — rearrange it freely, nothing here is graded.
        </figcaption>
      ) : null}
    </figure>
  );
}
