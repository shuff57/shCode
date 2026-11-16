'use client';

import { useId, useState, type ReactNode } from 'react';

export function searchLibraryItems<T>(items: readonly T[], query: string, text: (item: T) => string): T[] {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return items.filter((item) => words.every((word) => text(item).toLocaleLowerCase().includes(word)));
}

/** Search and bounded rendering, shared by every Library collection. */
export default function LibraryItems<T>({ items, text, children }: {
  items: readonly T[];
  text: (item: T) => string;
  children: (item: T) => ReactNode;
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(24);
  const matches = searchLibraryItems(items, query, text);
  const fullRow = { flexBasis: '100%', gridColumn: '1 / -1', width: '100%' };
  if (!items.length) return null;
  return <>
    <div style={{ ...fullRow, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
      <label htmlFor={id} style={{ fontSize: 12, color: 'var(--c-dim)' }}>Search this collection</label>
      <input id={id} type="search" value={query} placeholder="Name or keyword…"
        onChange={(e) => { setQuery(e.target.value); setLimit(24); }}
        style={{ flex: '1 1 160px', minWidth: 0, maxWidth: 340, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--c-line)', background: 'var(--c-bg)', color: 'var(--c-fg)', fontSize: 13 }} />
      <span role="status" style={{ fontSize: 12, color: 'var(--c-dim)' }}>
        {Math.min(limit, matches.length)} of {matches.length}{query.trim() ? ' matches' : ' items'}
      </span>
    </div>
    {!matches.length && <p style={{ ...fullRow, fontSize: 13, color: 'var(--c-dim)' }}>No matches. Try another name or keyword.</p>}
    {matches.slice(0, limit).map(children)}
    {matches.length > limit && <div style={{ ...fullRow, paddingTop: 8 }}>
      <button type="button" className="btn-secondary btn-sm" onClick={() => setLimit((n) => n + 24)}>Show more ({matches.length - limit} remaining)</button>
    </div>}
  </>;
}
