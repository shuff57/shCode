'use client';

// "Yours" on the Library page and tab: every texture and sound the student has
// saved, each with a Share button (ShareToggle) that puts it in the Library of
// their classes. Before this the only Share was a 10px link under each texture
// in the Texture editor (after pressing Load) and a button in the Sound mixer,
// and a teacher could not find it at all.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ShareToggle from './ShareToggle';
import { SpriteThumb, SpriteViewer } from './SpriteThumb';
import { LIBRARY_LOCAL_CHANGE, LIBRARY_UPDATED, listSavedSounds, listSavedTextures } from '../lib/moshion-storage';
import { LIBRARY_SYNC_STATUS, signedInForSync } from '../lib/library-sync';
import { editorUrl } from '../lib/remix';
import { sectionHeading, sectionNote } from './library-ui';

type Row = { kind: 'texture' | 'sound'; name: string; dataUri: string; frames?: number; frameDelay?: number };

function readRows(): Row[] {
  const tex = listSavedTextures().map((t) => ({ kind: 'texture' as const, name: t.name, dataUri: t.dataUrl, frames: t.frames, frameDelay: t.frameDelay }));
  const snd = listSavedSounds().map((s) => ({ kind: 'sound' as const, name: s.name, dataUri: s.dataUri }));
  return [...tex, ...snd];
}

const tile: React.CSSProperties = {
  padding: 8, borderRadius: 6, border: '1px solid var(--c-line)', background: 'var(--c-deep2)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 170,
};

export default function MyLibrary({ onMessage, kind }: {
  onMessage?: (text: string, bad: boolean) => void;
  /** Only this kind, under a "Mine (N)" heading (the Library's Pictures and Sounds tabs). Both when left out. */
  kind?: 'texture' | 'sound';
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  /** The picture open in the frames view, by name. */
  const [viewing, setViewing] = useState<string | null>(null);
  // Edit leaves the page. From a lesson's Library tab it opens a new tab, so
  // the lesson stays where it was; on the Library page it stays in this tab.
  const away = !(usePathname() ?? '').startsWith('/library') ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  const [, bump] = useState(0);

  useEffect(() => {
    const refresh = () => setRows(readRows());
    const again = () => bump((n) => n + 1);
    refresh();
    window.addEventListener(LIBRARY_LOCAL_CHANGE, refresh);
    window.addEventListener(LIBRARY_UPDATED, refresh);
    window.addEventListener(LIBRARY_SYNC_STATUS, again);
    return () => {
      window.removeEventListener(LIBRARY_LOCAL_CHANGE, refresh);
      window.removeEventListener(LIBRARY_UPDATED, refresh);
      window.removeEventListener(LIBRARY_SYNC_STATUS, again);
    };
  }, []);

  if (rows === null) return null;
  const textures = kind === 'sound' ? [] : rows.filter((r) => r.kind === 'texture');
  const sounds = kind === 'texture' ? [] : rows.filter((r) => r.kind === 'sound');
  const count = textures.length + sounds.length;
  const viewed = viewing ? textures.find((t) => t.name === viewing) : undefined;
  const viewer = viewed ? (
    <SpriteViewer name={viewed.name} src={viewed.dataUri} frames={viewed.frames} frameDelay={viewed.frameDelay} onClose={() => setViewing(null)}>
      <Link href={editorUrl('texture', viewed.name)} {...away} className="btn-secondary btn-sm">Edit</Link>
    </SpriteViewer>
  ) : null;
  const headingId = kind ? `mylib-${kind}-h` : 'mylib-h';

  return (
    <section aria-labelledby={headingId} style={{ marginTop: 8 }}>
      <h3 id={headingId} style={sectionHeading}>{kind ? 'Mine' : 'Yours'} ({count})</h3>
      <p style={sectionNote}>
        {signedInForSync()
          ? <>Press <strong style={{ color: 'var(--c-fg)' }}>Share with class</strong> on anything you want your class to use. Press it again to take it back.</>
          : <>Sign in to share these with your class.</>}
      </p>
      {count === 0 && (
        <p style={{ fontSize: 13, color: 'var(--c-dim)', lineHeight: 1.5 }}>
          {kind === 'texture' ? (
            <>No pictures saved yet. Make one in the <Link href="/textures" style={{ color: 'var(--c-cyan)' }}>Texture editor</Link> and
              save it: it shows up here.</>
          ) : kind === 'sound' ? (
            <>No sounds saved yet. Make one in the <Link href="/sound" style={{ color: 'var(--c-cyan)' }}>Sound mixer</Link> and
              save it: it shows up here.</>
          ) : (
            <>Nothing saved yet. Make one in the <Link href="/textures" style={{ color: 'var(--c-cyan)' }}>Texture editor</Link> or
              the <Link href="/sound" style={{ color: 'var(--c-cyan)' }}>Sound mixer</Link> and save it: it shows up here.</>
          )}
        </p>
      )}
      {textures.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {textures.map((t) => (
            <div key={'t:' + t.name} style={tile}>
              <button type="button" className="sprite-open" onClick={() => setViewing(t.name)} style={{ background: 'var(--x-202020)' }}
                aria-label={(t.frames ?? 1) > 1 ? `${t.name}: see its ${t.frames} frames` : `${t.name}: see it bigger`}
                title={(t.frames ?? 1) > 1 ? 'See each frame' : 'See it bigger'}>
                <SpriteThumb src={t.dataUri} frames={t.frames} frameDelay={t.frameDelay} size={48} />
              </button>
              <code style={{ fontSize: 11, wordBreak: 'break-all', textAlign: 'center' }}>{t.name}</code>
              {(t.frames ?? 1) > 1 ? (
                <button type="button" onClick={() => setViewing(t.name)} aria-label={`See the ${t.frames} frames of ${t.name}`}
                  style={{ background: 'none', border: 0, padding: 0, color: 'var(--c-cyan)', fontSize: 11, cursor: 'pointer' }}>
                  {t.frames} frames
                </button>
              ) : null}
              <ShareToggle kind="texture" name={t.name} onMessage={onMessage} />
              <Link href={editorUrl('texture', t.name)} {...away} style={{ fontSize: 11, color: 'var(--c-cyan)' }}>Edit</Link>
            </div>
          ))}
        </div>
      )}
      {sounds.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {sounds.map((s) => (
            <div key={'s:' + s.name} style={{ ...tile, width: 'auto', flexDirection: 'row' }}>
              <button type="button" aria-label={`Play ${s.name}`}
                onClick={() => { new Audio(s.dataUri).play().catch(() => {}); }}
                style={{ background: 'transparent', color: 'var(--c-fg)', border: '1px solid var(--c-line)', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}>▶</button>
              <code style={{ fontSize: 11 }}>{s.name}</code>
              <ShareToggle kind="sound" name={s.name} onMessage={onMessage} />
              <Link href={editorUrl('sound', s.name)} {...away} style={{ fontSize: 11, color: 'var(--c-cyan)' }}>Edit</Link>
            </div>
          ))}
        </div>
      )}
      {viewer}
    </section>
  );
}
