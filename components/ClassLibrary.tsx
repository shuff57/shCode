'use client';

// "From your class": textures or sounds classmates shared (#81), with a preview
// and "Copy to mine", which saves a copy into the student's own library (and so
// their account). Renders nothing when signed out or when nothing is shared.
// A teacher who opens the editor sees hidden items too, marked; hiding and
// removing happen on the class page (ClassLibraryModeration).

import { useCallback, useEffect, useState } from 'react';
import { freshName, LIBRARY_SHARES_CHANGED } from '../lib/library-sync';
import { addToLibrary, localLibraryItems, type LibraryKind } from '../lib/moshion-storage';

interface SharedItem {
  id: string;
  kind: LibraryKind;
  name: string;
  owner: string;
  mine: boolean;
  className: string;
  hidden: boolean;
}

export default function ClassLibrary({ kind, onCopied, onMessage, onLoaded, title }: {
  kind: LibraryKind;
  onCopied?: () => void;
  onMessage?: (text: string, bad: boolean) => void;
  /** How many items loaded (null: signed out or unreachable), for a panel's empty state. */
  onLoaded?: (count: number | null) => void;
  /** Heading instead of "From your class (N)". */
  title?: string;
}) {
  const [items, setItems] = useState<SharedItem[] | null>(null);
  const [art, setArt] = useState<Record<string, { dataUri: string; meta: string | null }>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/library/shared?kind=${kind}`, { credentials: 'same-origin' });
      if (!res.ok) { setItems(null); onLoaded?.(null); return; }
      const list = ((await res.json()) as { items: SharedItem[] }).items;
      setItems(list);
      onLoaded?.(list.length);
    } catch {
      setItems(null);
      onLoaded?.(null);
    }
    // onLoaded is a callback from the parent; reloading on its identity would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);
  useEffect(() => {
    void load();
    window.addEventListener(LIBRARY_SHARES_CHANGED, load);
    return () => window.removeEventListener(LIBRARY_SHARES_CHANGED, load);
  }, [load]);

  const fetchArt = useCallback(async (id: string) => {
    if (art[id]) return art[id];
    const res = await fetch(`/api/library/shared/${id}`, { credentials: 'same-origin' });
    if (!res.ok) return null;
    const body = (await res.json()) as { dataUri: string; meta: string | null };
    setArt((a) => ({ ...a, [id]: body }));
    return body;
  }, [art]);

  // Textures are small: fetch every preview once the list is in.
  useEffect(() => {
    if (kind !== 'texture' || !items) return;
    for (const it of items) if (!art[it.id]) void fetchArt(it.id);
  }, [items, kind, art, fetchArt]);

  if (!items || items.length === 0) return null;

  const copy = async (it: SharedItem) => {
    const content = await fetchArt(it.id);
    if (!content) { onMessage?.('That is no longer in the Library.', true); return; }
    const taken = new Set(localLibraryItems().filter((l) => l.kind === kind).map((l) => l.name));
    const name = taken.has(it.name) ? freshName(it.name, taken) : it.name;
    if (!addToLibrary({ kind, name, dataUri: content.dataUri, meta: content.meta })) {
      onMessage?.('Your library is full. Delete something you no longer need first.', true);
      return;
    }
    onCopied?.();
    onMessage?.(
      kind === 'texture'
        ? `Copied "${it.name}" from ${it.owner} as "${name}". Use it with sprite.texture = '${name}'.`
        : `Copied "${it.name}" from ${it.owner} as "${name}". Play it with loadSound('${name}').`,
      false,
    );
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--c-dim)', marginBottom: 6 }}>
        {title ?? 'From your class'} ({items.length})
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {items.map((it) => (
          <div key={it.id} style={{
            width: kind === 'texture' ? 92 : 'auto', padding: 6, borderRadius: 6,
            border: `1px solid ${it.hidden ? 'color-mix(in srgb, var(--c-orange) 53.3333%, transparent)' : 'var(--c-line)'}`, background: 'var(--c-deep2)',
            display: 'flex', flexDirection: kind === 'texture' ? 'column' : 'row', alignItems: 'center', gap: 6,
          }}>
            {kind === 'texture' ? (
              <div style={{ width: 48, height: 48, overflow: 'hidden', background: 'var(--x-202020)', borderRadius: 4 }}>
                {art[it.id] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={art[it.id].dataUri} alt={it.name}
                    style={{ height: 48, imageRendering: 'pixelated', objectFit: 'cover', objectPosition: 'left', maxWidth: 'none' }} />
                )}
              </div>
            ) : (
              <button type="button" aria-label={`Play ${it.name}`} onClick={async () => {
                const c = await fetchArt(it.id);
                if (c) new Audio(c.dataUri).play().catch(() => {});
              }} style={{ background: 'transparent', color: 'var(--c-fg)', border: '1px solid var(--c-line)', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}>▶</button>
            )}
            <div style={{ fontSize: 11, textAlign: kind === 'texture' ? 'center' : 'left', wordBreak: 'break-all' }}>
              <code>{it.name}</code>
              <div style={{ color: 'var(--c-dim)' }}>{it.mine ? 'yours' : it.owner}{it.hidden ? ' · hidden by teacher' : ''}</div>
            </div>
            {!it.mine && (
              <button type="button" onClick={() => void copy(it)} style={{
                fontSize: 11, padding: '2px 6px', borderRadius: 4, cursor: 'pointer',
                background: 'transparent', color: 'var(--c-cyan)', border: '1px solid var(--c-line)',
              }}>Copy to mine</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
