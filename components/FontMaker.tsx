'use client';

// The Fonts page (/fonts) and the sandbox's Fonts drawer: make a font
// (FontEditor: draw each letter), add a font from a file, try your own words in
// every font, and copy the textFont('name') line. /fonts?edit=<name> opens a
// font made here in the editor again (its drawing is kept: fontmeta:<name>).
//
// Adding a font (phase 2 of the fonts work, 2026-11-12): a TTF, OTF, WOFF or
// WOFF2 file of at most 150 KB is read in the browser, checked three ways
// before it is saved (its first bytes say it is a font, the browser's own font
// loader accepts it, and it fits), previewed, named, and saved with saveFont()
// under `font:<name>`, where a sketch's textFont('name') finds it and the
// library sync takes it to the student's account. The server checks the bytes
// and the limits again. The editor is loaded only when it is opened, so the
// font-building libraries (opentype.js, polygon-clipping) stay out of every
// other page.

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { BuiltinFonts, DEFAULT_SAMPLE, FontSample, MyFonts } from './FontLibrary';
import { FONT_LIMITS, fontTypeOf, listSavedFonts, readFontDrawing, saveFont } from '../lib/moshion-storage';
import { editParam } from '../lib/remix';
import { parseDoc, type FontDoc } from '../lib/font-doc';

const FontEditor = dynamic(() => import('./FontEditor'), {
  ssr: false,
  loading: () => <p style={{ fontSize: 13, color: 'var(--c-dim)' }}>Opening the Font maker…</p>,
});
type Mode = 'make' | 'upload';
import { fontWorks } from '../lib/font-face';
import { sectionHeading, sectionNote } from './library-ui';

/** "My Cool-Font v2.ttf" -> "MyCoolFontv2": a name that is also code. */
export function fontNameFromFile(file: string): string {
  const base = file.replace(/\.[A-Za-z0-9]+$/, '').replace(/[^A-Za-z0-9_]/g, '');
  const name = /^[A-Za-z]/.test(base) ? base : 'font' + base;
  return name.slice(0, 40) || 'myFont';
}

const input: React.CSSProperties = {
  padding: '6px 8px', borderRadius: 4, border: '1px solid var(--c-line)', background: 'var(--c-deep)',
  color: 'var(--c-fg)', fontSize: 13, minWidth: 0,
};

export default function FontMaker({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<Mode>(compact ? 'upload' : 'make');
  /** The saved font being edited (?edit=<name>), once its drawing is read; undefined while looking. */
  const [start, setStart] = useState<{ name: string; doc: FontDoc } | null | undefined>(undefined);
  const [sample, setSample] = useState('');
  const [picked, setPicked] = useState<{ dataUri: string; file: string; kb: number; type: string } | null>(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const say = (text: string, bad = false) => setNote({ text, bad });

  // /fonts?edit=<name>: open that font's drawing in the editor.
  useEffect(() => {
    const name = editParam();
    if (!name) { setStart(null); return; }
    const doc = parseDoc(readFontDrawing(name));
    if (doc) { setStart({ name, doc }); setMode('make'); }
    else { setStart(null); say(`${name} was not made in the Font maker (or is not saved here), so it can't be opened to draw on.`, true); }
  }, []);

  async function choose(file: File | undefined) {
    setNote(null);
    setPicked(null);
    if (!file) return;
    if (file.size > FONT_LIMITS.fileBytes) {
      say(`"${file.name}" is ${Math.round(file.size / 1024)} KB; a font can be ${FONT_LIMITS.fileBytes / 1024} KB at most. A WOFF2 version of the same font is usually much smaller.`, true);
      return;
    }
    setBusy(true);
    try {
      const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      const type = fontTypeOf(head);
      if (!type) { say(`"${file.name}" is not a TTF, OTF, WOFF or WOFF2 font file.`, true); return; }
      const dataUri = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      if (!(await fontWorks(dataUri))) { say(`"${file.name}" looks like a font but your browser cannot use it. Try another copy of it.`, true); return; }
      setPicked({ dataUri, file: file.name, kb: Math.max(1, Math.round(file.size / 1024)), type });
      setName(fontNameFromFile(file.name));
    } catch {
      say('That file could not be read. Try choosing it again.', true);
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!picked) return;
    if (listSavedFonts().some((f) => f.name === name)) {
      say(`You already have a font called ${name}. Pick another name, or delete that one first.`, true);
      return;
    }
    const err = saveFont(name, picked.dataUri);
    if (err) { say(err, true); return; }
    say(`Saved. Use it in a sketch with textFont('${name}');`);
    setPicked(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  const pad = compact ? 12 : '8px 16px 24px';
  return (
    <div style={{ maxWidth: compact ? undefined : 900, margin: '0 auto', padding: pad, color: 'var(--c-fg)', boxSizing: 'border-box' }}>
      {!compact && (
        <>
          <h1 style={{ fontSize: 22, margin: '6px 0 4px' }}>Fonts</h1>
          <p style={{ ...sectionNote, marginBottom: 14 }}>
            Pick a typeface for your sketch&apos;s words with <code>textFont(&apos;name&apos;)</code>. Use a built-in font, or add your own from a font file.
          </p>
        </>
      )}

      <div role="group" aria-label="Make or add a font" style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {(['make', 'upload'] as const).map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} style={{
            fontSize: 13, padding: '5px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: mode === m ? 700 : 500,
            background: mode === m ? 'var(--c-purple)' : 'transparent', color: mode === m ? 'var(--c-bg)' : 'var(--c-meta)',
            border: `1px solid ${mode === m ? 'var(--c-purple)' : 'var(--c-line)'}`,
          }}>
            {m === 'make' ? 'Make a font' : 'Add a font file'}
          </button>
        ))}
      </div>

      {mode === 'make' && (
        <section aria-label="Make a font" style={{ marginBottom: 18 }}>
          {start === undefined ? null : (
            <FontEditor start={start} />
          )}
        </section>
      )}

      {mode === 'upload' && (
      <section aria-labelledby="addfont-h" style={{ marginBottom: 16 }}>
        <h2 id="addfont-h" style={{ ...sectionHeading, fontSize: 15 }}>Add a font</h2>
        <p style={sectionNote}>
          A TTF, OTF, WOFF or WOFF2 file, {FONT_LIMITS.fileBytes / 1024} KB at most ({FONT_LIMITS.totalFileBytes / 1024} KB of fonts in all).
          Only add a font you are allowed to share: free fonts, like the ones on fonts.google.com, are fine.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
          aria-label="Choose a font file"
          disabled={busy}
          onChange={(e) => void choose(e.target.files?.[0])}
          style={{ fontSize: 13, maxWidth: '100%' }}
        />
        {picked && (
          <div style={{ marginTop: 10, padding: 10, border: '1px solid var(--c-line)', borderRadius: 6, background: 'var(--c-deep2)', display: 'grid', gap: 8 }}>
            <FontSample fontKey={`picked:${picked.file}:${picked.dataUri.length}`} src={{ dataUri: picked.dataUri }} text={sample} size={26} />
            <div style={{ fontSize: 12, color: 'var(--c-dim)' }}>{picked.file} · {picked.type} · {picked.kb} KB</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <label htmlFor="font-name" style={{ fontSize: 13 }}>Name</label>
              <input id="font-name" value={name} onChange={(e) => setName(e.target.value)} style={{ ...input, width: 200 }}
                aria-describedby="font-name-help" maxLength={40} spellCheck={false} />
              <button type="button" className="btn-run" onClick={save} disabled={!/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(name)}>Save font</button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => { setPicked(null); if (fileRef.current) fileRef.current.value = ''; }}>Cancel</button>
            </div>
            <div id="font-name-help" style={{ fontSize: 12, color: 'var(--c-dim)' }}>
              Letters, digits and _, starting with a letter. You will write <code>textFont(&apos;{name || 'name'}&apos;)</code>.
            </div>
          </div>
        )}
      </section>
      )}
      {note && <div role="status" style={{ fontSize: 13, margin: '0 0 8px', color: note.bad ? 'var(--c-red)' : 'var(--c-green)' }}>{note.text}</div>}

      <label htmlFor="font-sample" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Try your own words</label>
      <input id="font-sample" value={sample} onChange={(e) => setSample(e.target.value)} placeholder={DEFAULT_SAMPLE}
        style={{ ...input, width: '100%', boxSizing: 'border-box', marginBottom: 6 }} maxLength={80} />

      <MyFonts sample={sample} onMessage={(t, bad) => say(t, bad)}
        emptyHint={<>No fonts saved yet. Add one above: it shows up here, and in your Library.</>} />
      <BuiltinFonts sample={sample} />
    </div>
  );
}
