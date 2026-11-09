'use client';

// "From your class": textures or sounds classmates shared (#81), with a preview
// and "Copy to mine", which saves a copy into the student's own library (and so
// their account). Renders nothing when signed out or when nothing is shared.
// A teacher who opens the editor sees hidden items too, marked; hiding and
// removing happen on the class page (ClassLibraryModeration).

import { SpriteThumb, SpriteViewer, texMeta } from './SpriteThumb';
import { useCallback, useEffect, useState } from 'react';
import { freshName, LIBRARY_SHARES_CHANGED } from '../lib/library-sync';
import { addToLibrary, localLibraryItems, type LibraryKind } from '../lib/moshion-storage';
import { openEditor, prepareTab } from '../lib/remix';
import { sectionHeading, sectionNote, sectionStyle } from './library-ui';

interface SharedItem {
  id: string;
  kind: LibraryKind;
  name: string;
  owner: string;
  mine: boolean;
  className: string;
  hidden: boolean;
}

export default function ClassLibrary({ kind, onCopied, onMessage, onLoaded, title, section }: {
  kind: LibraryKind;
  onCopied?: () => void;
  onMessage?: (text: string, bad: boolean) => void;
  /** How many items loaded (null: signed out or unreachable), for a panel's empty state. */
  onLoaded?: (count: number | null) => void;
  /** Heading instead of "From your class (N)". */
  title?: string;
  /** Render as a Library tab section: a "<title> (N)" heading that stays even when
   *  the list is empty or the student is signed out, with these words instead. */
  section?: { empty: React.ReactNode; signedOut: React.ReactNode };
}) {
  const [items, setItems] = useState<SharedItem[] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [art, setArt] = useState<Record<string, { dataUri: string; meta: string | null }>>({});
  /** The picture open in the frames view, by item id. */
  const [viewing, setViewing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/library/shared?kind=${kind}`, { credentials: 'same-origin' });
      if (!res.ok) { setItems(null); setLoaded(true); onLoaded?.(null); return; }
      const list = ((await res.json()) as { items: SharedItem[] }).items;
      setItems(list);
      setLoaded(true);
      onLoaded?.(list.length);
    } catch {
      setItems(null);
      setLoaded(true);
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

  const headingId = `classlib-${kind}-h`;
  if (section && (!items || items.length === 0)) {
    return (
      <section aria-labelledby={headingId} style={sectionStyle}>
        <h3 id={headingId} style={sectionHeading}>{title ?? 'From your class'} ({loaded ? 0 : '…'})</h3>
        {loaded && <p style={sectionNote}>{items ? section.empty : section.signedOut}</p>}
      </section>
    );
  }
  if (!items || items.length === 0) return null;

  // Remix: Copy to mine, then open the copy in its editor (lib/remix.ts).
  const copy = async (it: SharedItem, remix = false) => {
    const tab = remix ? prepareTab() : null;
    const content = await fetchArt(it.id);
    if (!content) { tab?.close(); onMessage?.('That is no longer in the Library.', true); return; }
    const taken = new Set(localLibraryItems().filter((l) => l.kind === kind).map((l) => l.name));
    const name = taken.has(it.name) ? freshName(it.name, taken) : it.name;
    if (!addToLibrary({ kind, name, dataUri: content.dataUri, meta: content.meta })) {
      tab?.close();
      onMessage?.('Your library is full. Delete something you no longer need first.', true);
      return;
    }
    onCopied?.();
    if (remix) { openEditor(kind, name, tab); return; }
    onMessage?.(
      kind === 'texture'
        ? `Copied "${it.name}" from ${it.owner} as "${name}". Use it with sprite.texture = '${name}'.`
        : `Copied "${it.name}" from ${it.owner} as "${name}". Play it with loadSound('${name}').`,
      false,
    );
  };

  const Wrap = section ? 'section' : 'div';
  return (
    <Wrap aria-labelledby={section ? headingId : undefined} style={section ? sectionStyle : { marginTop: 12 }}>
      {section ? (
        <>
          <h3 id={headingId} style={sectionHeading}>{title ?? 'From your class'} ({items.length})</h3>
          <p style={sectionNote}>
            <strong style={{ color: 'var(--c-fg)' }}>Copy to mine</strong> saves a copy into your own, so{' '}
            {kind === 'texture' ? <code>sprite.texture = &apos;name&apos;</code> : <code>loadSound(&apos;name&apos;)</code>} works in your sketches.
          </p>
        </>
      ) : (
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--c-dim)', marginBottom: 6 }}>
          {title ?? 'From your class'} ({items.length})
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {items.map((it) => (
          <div key={it.id} style={{
            width: kind === 'texture' ? 92 : 'auto', padding: 6, borderRadius: 6,
            border: `1px solid ${it.hidden ? 'color-mix(in srgb, var(--c-orange) 53.3333%, transparent)' : 'var(--c-line)'}`, background: 'var(--c-deep2)',
            display: 'flex', flexDirection: kind === 'texture' ? 'column' : 'row', alignItems: 'center', gap: 6,
          }}>
            {kind === 'texture' ? (
              <button type="button" className="sprite-open" onClick={() => setViewing(it.id)} disabled={!art[it.id]}
                aria-label={`${it.name}: see it bigger and its frames`} title="See each frame"
                style={{ width: 48, height: 48, background: 'var(--x-202020)' }}>
                {art[it.id] && (
                  <SpriteThumb src={art[it.id].dataUri} {...texMeta(art[it.id].meta)} size={46} alt={it.name} />
                )}
              </button>
            ) : (
              <button type="button" aria-label={`Play ${it.name}`} onClick={async () => {
                const c = await fetchArt(it.id);
                if (c) new Audio(c.dataUri).play().catch(() => {});
              }} style={{ background: 'transparent', color: 'var(--c-fg)', border: '1px solid var(--c-line)', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}>▶</button>
            )}
            <div style={{ fontSize: 11, textAlign: kind === 'texture' ? 'center' : 'left', wordBreak: 'break-all' }}>
              <code>{it.name}</code>
              {kind === 'texture' && art[it.id] && texMeta(art[it.id].meta).frames > 1 ? (
                <div>
                  <button type="button" onClick={() => setViewing(it.id)} aria-label={`See the frames of ${it.name}`}
                    style={{ background: 'none', border: 0, padding: 0, color: 'var(--c-cyan)', fontSize: 11, cursor: 'pointer' }}>
                    {texMeta(art[it.id].meta).frames} frames
                  </button>
                </div>
              ) : null}
              <div style={{ color: 'var(--c-dim)' }}>{it.mine ? 'yours' : it.owner}{it.hidden ? ' · hidden by teacher' : ''}</div>
            </div>
            {!it.mine && (
              <div style={{ display: 'flex', flexDirection: kind === 'texture' ? 'column' : 'row', gap: 4 }}>
                <button type="button" onClick={() => void copy(it)} style={{
                  fontSize: 11, padding: '2px 6px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
                  background: 'transparent', color: 'var(--c-cyan)', border: '1px solid var(--c-line)',
                }}>Copy to mine</button>
                <button type="button" onClick={() => void copy(it, true)} aria-label={`Remix ${it.name}`}
                  title={kind === 'texture' ? 'Make your own copy and open it in the Texture editor' : 'Make your own copy and open it in the Sound mixer'}
                  style={{
                    fontSize: 11, padding: '2px 6px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
                    background: 'transparent', color: 'var(--c-cyan)', border: '1px solid var(--c-line)',
                  }}>Remix</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {(() => {
        const it = viewing ? items.find((x) => x.id === viewing) : undefined;
        const a = it ? art[it.id] : undefined;
        if (!it || !a) return null;
        return (
          <SpriteViewer name={it.name} src={a.dataUri} {...texMeta(a.meta)} onClose={() => setViewing(null)}>
            {!it.mine ? (
              <>
                <button type="button" className="btn-secondary btn-sm" onClick={() => void copy(it)}>Copy to mine</button>
                <button type="button" className="btn-secondary btn-sm" onClick={() => void copy(it, true)}
                  title="Make your own copy and open it in the Texture editor">Remix</button>
              </>
            ) : null}
          </SpriteViewer>
        );
      })()}
    </Wrap>
  );
}
