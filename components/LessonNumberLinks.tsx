'use client';
// Renders prose with its lesson numbers ("1.1.5", "(1.1.6 and 1.1.8)") turned
// into links to those lessons, so a student can go read the material a
// question or a criterion depends on without hunting through the module list.
//
// Two pieces, split on purpose:
//   useSourceHrefs  -- ONE fetch per list of texts. RequirementCard renders
//                       once per requirement (764 across the course), so a
//                       per-card fetch would mean 764 lookups. Call it from
//                       the list, not the card.
//   LessonNumberLinks -- pure render, safe to use anywhere.
//
// Links open in a new tab: the student is usually mid-answer, and losing a
// typed draft to check a definition is worse than an extra tab.
//
// A number with no matching lesson, or one that is not a citation at all
// ("Figure 2.2.3"), stays plain text. See lib/source-hint.ts.

import { useEffect, useState } from 'react';
import { getHrefsByLessonNumber } from '../lib/lesson-neighbors';
import { sourceHintNumbers, sourceHintParts } from '../lib/source-hint';

export type SourceHrefs = Record<string, string>;

/** Resolve every lesson number in `texts` to an href, in one lookup. */
export function useSourceHrefs(texts: string[]): SourceHrefs {
  const [hrefs, setHrefs] = useState<SourceHrefs>({});

  // The caller usually rebuilds this array on every render, so key the effect on
  // its contents rather than its identity.
  const key = Array.from(new Set(texts.flatMap((t) => (t ? sourceHintNumbers(t) : [])))).join(' ');

  useEffect(() => {
    const numbers = key ? key.split(' ') : [];
    if (numbers.length === 0) {
      setHrefs({});
      return;
    }
    let cancelled = false;
    getHrefsByLessonNumber(numbers).then((resolved) => {
      if (!cancelled) setHrefs(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return hrefs;
}

export default function LessonNumberLinks({
  text,
  hrefs,
}: {
  text: string;
  hrefs: SourceHrefs;
}) {
  return (
    <>
      {sourceHintParts(text).map((part, i) => {
        const href = part.isNumber ? hrefs[part.text] : undefined;
        return href ? (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title="Open this lesson in a new tab"
            style={{ color: '#8be9fd', textDecoration: 'underline' }}
          >
            {part.text}
          </a>
        ) : (
          <span key={i}>{part.text}</span>
        );
      })}
    </>
  );
}
