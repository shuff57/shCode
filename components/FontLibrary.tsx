'use client';

// Fonts in the Library (Library -> Fonts, the Font maker at /fonts, the
// sandbox's Fonts drawer): the student's own saved fonts (MyFonts: sample,
// Copy textFont, Share with class, Delete) and the built-in ones (BuiltinFonts:
// sample, its weights, Copy textFont). The class's shared fonts are
// ClassLibrary with kind 'font'.
//
// A sample is drawn in the font itself (lib/font-face.ts loads it into this
// page), so a student sees what textFont('name') will look like before they
// write it. Delete is deleteSavedFont, which marks the delete for the sync, so
// it leaves the student's account and their other computers too.

import { useEffect, useState } from 'react';
import ShareToggle from './ShareToggle';
import RemixCredit from './RemixCredit';
import { FeedbackProvider, useFeedback } from './FeedbackProvider';
import { sectionHeading, sectionNote, sectionStyle } from './library-ui';
import { LIBRARY_LOCAL_CHANGE, LIBRARY_UPDATED, deleteSavedFont, listSavedFonts, type SavedFont } from '../lib/moshion-storage';
import { LIBRARY_SYNC_STATUS, signedInForSync } from '../lib/library-sync';
import { builtinFontCatalog, useFontFamily, weightRange, type FontCatalog, type FontSource } from '../lib/font-face';

export const DEFAULT_SAMPLE = 'Level 1: find the golden key! 0123456789';

const card: React.CSSProperties = {
  padding: '8px 10px', borderRadius: 6, border: '1px solid var(--c-line)', background: 'var(--c-deep2)',
  display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0,
};
const smallBtn: React.CSSProperties = {
  fontSize: 11, padding: '2px 8px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
  background: 'transparent', color: 'var(--c-cyan)', border: '1px solid var(--c-line)',
};
const delBtn: React.CSSProperties = { background: 'none', border: 0, padding: 0, color: 'var(--c-red)', fontSize: 11, cursor: 'pointer' };

/** One line of `text` drawn in the font, or a plain note while it loads or if it cannot. */
export function FontSample({ fontKey, src, text, size = 22 }: { fontKey: string; src: FontSource | null; text: string; size?: number }) {
  const st = useFontFamily(fontKey, src);
  if (st === 'failed') {
    return <div style={{ fontSize: 12, color: 'var(--c-orange)' }}>This font could not be shown. The file may not be a working font.</div>;
  }
  return (
    <div
      aria-hidden="true"
      style={{
        fontFamily: st === 'loading' ? 'monospace' : `"${st.family}", monospace`,
        fontSize: size, lineHeight: 1.25, color: 'var(--c-fg)', overflowWrap: 'anywhere',
        opacity: st === 'loading' ? 0.35 : 1, minHeight: size * 1.25,
      }}
    >
      {text || DEFAULT_SAMPLE}
    </div>
  );
}

/** "textFont('name');" with a Copy button that says when it worked. */
export function CopyCode({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);
  const line = `textFont('${name}');`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <code style={{ fontSize: 12 }}>{line}</code>
      <button
        type="button"
        style={smallBtn}
        aria-label={`Copy ${line}`}
        onClick={() => {
          navigator.clipboard?.writeText(line).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }, () => {});
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function useSavedFonts(): SavedFont[] | null {
  const [fonts, setFonts] = useState<SavedFont[] | null>(null);
  const [, bump] = useState(0);
  useEffect(() => {
    const refresh = () => setFonts(listSavedFonts());
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
  return fonts;
}

type ListProps = { sample?: string; onMessage?: (text: string, bad: boolean) => void; emptyHint?: React.ReactNode };

// Its own FeedbackProvider for the delete confirm, as MyLibrary has.
export function MyFonts(props: ListProps) {
  return <FeedbackProvider><MyFontsInner {...props} /></FeedbackProvider>;
}

function MyFontsInner({ sample = '', onMessage, emptyHint }: ListProps) {
  const { confirm } = useFeedback();
  const fonts = useSavedFonts();
  if (fonts === null) return null;

  const remove = async (f: SavedFont) => {
    const where = signedInForSync() ? 'It leaves your Library on every computer you use.' : 'It leaves the Library on this computer.';
    if (!(await confirm({ title: `Delete ${f.name}?`, message: `${where} Sketches that use it will show their text in the default font instead.`, confirmLabel: 'Delete', danger: true }))) return;
    deleteSavedFont(f.name);
    onMessage?.(`Deleted ${f.name}.`, false);
  };

  return (
    <section aria-labelledby="myfonts-h" style={{ marginTop: 8 }}>
      <h3 id="myfonts-h" style={sectionHeading}>Mine ({fonts.length})</h3>
      <p style={sectionNote}>
        {signedInForSync()
          ? <>Press <strong style={{ color: 'var(--c-fg)' }}>Share with class</strong> on a font you want your class to use. Press it again to take it back.</>
          : <>Sign in to keep your fonts on every computer and share them with your class.</>}
      </p>
      {fonts.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--c-dim)', lineHeight: 1.5 }}>
          {emptyHint ?? <>No fonts saved yet. Add one on the <a href="/fonts/" style={{ color: 'var(--c-cyan)' }}>Fonts</a> page: it shows up here.</>}
        </p>
      )}
      <div style={{ display: 'grid', gap: 8 }}>
        {fonts.map((f) => (
          <div key={f.name} style={card}>
            <FontSample fontKey={`saved:${f.name}:${f.dataUri.length}`} src={{ dataUri: f.dataUri }} text={sample} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11, color: 'var(--c-dim)' }}>
              <CopyCode name={f.name} />
              <span>{f.type ?? 'font'} · {Math.max(1, Math.round(f.fileBytes / 1024))} KB</span>
              <RemixCredit item={{ kind: 'font', name: f.name }} style={{ fontSize: 11 }} />
              <ShareToggle kind="font" name={f.name} onMessage={onMessage} />
              <button type="button" onClick={() => void remove(f)} aria-label={`Delete ${f.name}`} style={delBtn}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BuiltinFonts({ sample = '' }: { sample?: string }) {
  const [cat, setCat] = useState<FontCatalog | null>(null);
  useEffect(() => { void builtinFontCatalog().then(setCat); }, []);
  const names = cat ? Object.keys(cat.fonts) : [];
  return (
    <section aria-labelledby="builtinfonts-h" style={sectionStyle}>
      <h3 id="builtinfonts-h" style={sectionHeading}>Built in ({cat ? names.length : '…'})</h3>
      <p style={sectionNote}>
        Free fonts that come with shCode. <code>textWeight(n)</code> picks a thickness inside each one&apos;s range.
      </p>
      {cat && (
        <div style={{ display: 'grid', gap: 8 }}>
          {names.map((n) => {
            const f = cat.fonts[n];
            return (
              <div key={n} style={card}>
                <FontSample fontKey={`builtin:${n}`} src={{ builtin: n }} text={sample} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11, color: 'var(--c-dim)' }}>
                  <CopyCode name={n} />
                  <span>{f.look} · {f.family} · weights {weightRange(f)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
