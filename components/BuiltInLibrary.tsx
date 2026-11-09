'use client';

// "Built in" on the Library page and tab: every texture and sound that ships
// with moSHion, so a student can find them without the docs. A built-in works
// in any sketch straight away (`sprite.texture = 'sword'`,
// `loadSound('/moshion/assets/dice.wav')`); Remix makes an editable copy in the
// student's own library (and so their account) and opens it in the Texture
// editor or the Sound mixer (lib/remix.ts); Share can then hand it to the class.
//
// Textures come from public/moshion/textures/textures.json (made by
// scripts/make-moshion-textures.py from a CC0 sheet); sounds from PALETTE in
// lib/sound/presets.ts (rendered by scripts/make-moshion-sounds.mjs).

import { SpriteThumb, SpriteViewer } from './SpriteThumb';
import { useEffect, useState } from 'react';
import { DESIGN_BASE, PALETTE } from '../lib/sound/presets';
import { freshName } from '../lib/library-sync';
import { listSavedSounds, listSavedTextures, saveSound, saveTexture } from '../lib/moshion-storage';
import { openEditor, prepareTab } from '../lib/remix';
import { sectionHeading, sectionNote, sectionStyle } from './library-ui';

interface TexEntry { file: string; w: number; h: number; group: string; frames?: number; frameDelay?: number }
interface Catalog { base: string; textures: Record<string, TexEntry> }

const GROUP_LABELS: Record<string, string> = {
  characters: 'Characters', pickups: 'Pickups', blocks: 'Blocks', creatures: 'Creatures', terrain: 'Ground and plants',
  things: 'Things', battle: 'Battle', numbers: 'Numbers', candy: 'Candy',
};

const small: React.CSSProperties = {
  fontSize: 11, padding: '2px 6px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
  background: 'transparent', color: 'var(--c-cyan)', border: '1px solid var(--c-line)',
};

async function asDataUri(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export default function BuiltInLibrary({ onMessage, kind }: {
  onMessage?: (text: string, bad: boolean) => void;
  /** Only this kind, under a "Built in (N)" heading (the Library's Pictures and Sounds tabs). Both when left out. */
  kind?: 'texture' | 'sound';
}) {
  const [cat, setCat] = useState<Catalog | null>(null);
  /** The picture open in the frames view, by name. */
  const [viewing, setViewing] = useState<string | null>(null);

  useEffect(() => {
    if (kind === 'sound') return; // the sounds list is built into the bundle
    fetch('/moshion/textures/textures.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => setCat(c))
      .catch(() => setCat(null));
  }, [kind]);

  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text).then(
      () => onMessage?.(`Copied: ${text}`, false),
      () => onMessage?.(text, false),
    );
  };

  // Remix: a copy in your own library, opened in the Texture editor to change.
  const remixTexture = async (name: string, t: TexEntry) => {
    const tab = prepareTab();
    try {
      const taken = new Set(listSavedTextures().map((x) => x.name));
      const mine = taken.has(name) ? freshName(name, taken) : name;
      const dataUrl = await asDataUri((cat?.base ?? '/moshion/textures/') + t.file);
      const err = saveTexture(mine, dataUrl, t.frames && t.frames > 1 ? { frames: t.frames, frameDelay: t.frameDelay ?? 6 } : undefined);
      if (err) { tab?.close(); onMessage?.(err, true); return; }
      openEditor('texture', mine, tab);
    } catch {
      tab?.close();
      onMessage?.('Could not copy that texture. Try again.', true);
    }
  };

  // Remix: a copy in your own library, opened in the Sound mixer to change.
  const remixSound = async (p: (typeof PALETTE)[number]) => {
    const tab = prepareTab();
    try {
      const taken = new Set(listSavedSounds().map((x) => x.name));
      const mine = taken.has(p.name) ? freshName(p.name, taken) : p.name;
      const dataUri = await asDataUri(p.file);
      const def = p.def ? { ...DESIGN_BASE, ...p.def } : undefined;
      const err = saveSound(mine, dataUri, { kind: p.kind, source: p.source, ...(def ? { def } : {}) });
      if (err) { tab?.close(); onMessage?.(err, true); return; }
      openEditor('sound', mine, tab);
    } catch {
      tab?.close();
      onMessage?.('Could not copy that sound. Try again.', true);
    }
  };

  const groups: Record<string, [string, TexEntry][]> = {};
  if (cat) {
    for (const [name, t] of Object.entries(cat.textures)) (groups[t.group] ??= []).push([name, t]);
  }

  const texCount = cat ? Object.keys(cat.textures).length : null;
  const viewed = viewing && cat ? cat.textures[viewing] : null;
  const viewer = viewing && viewed ? (
    <SpriteViewer name={viewing} src={(cat?.base ?? '/moshion/textures/') + viewed.file} frames={viewed.frames ?? 1}
      frameDelay={viewed.frameDelay ?? 6} onClose={() => setViewing(null)}>
      <button type="button" style={small} onClick={() => copyText(`sprite.texture = '${viewing}';`)}>Copy code</button>
      <button type="button" style={small} onClick={() => void remixTexture(viewing, viewed)}
        title="Make your own copy and open it in the Texture editor">Remix</button>
    </SpriteViewer>
  ) : null;
  const textureList = (
    <>
        {Object.entries(groups).map(([group, list]) => (
          <div key={group} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--c-dim)', margin: '6px 0' }}>
              {GROUP_LABELS[group] ?? group} ({list.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {list.map(([name, t]) => (
                <div key={name} style={{
                  width: 120, padding: 6, borderRadius: 6, border: '1px solid var(--c-line)', background: 'var(--c-deep2)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                  <button type="button" className="sprite-open" onClick={() => setViewing(name)}
                    aria-label={t.frames && t.frames > 1 ? `${name}: see its ${t.frames} frames` : `${name}: see it bigger`}
                    title={t.frames && t.frames > 1 ? 'See each frame' : 'See it bigger'}
                    style={{ background: 'var(--x-202020)' }}>
                    <SpriteThumb src={(cat?.base ?? '/moshion/textures/') + t.file} frames={t.frames ?? 1} frameDelay={t.frameDelay ?? 6} size={42} />
                  </button>
                  <code style={{ fontSize: 11 }}>{name}</code>
                  {t.frames && t.frames > 1 ? (
                    <button type="button" onClick={() => setViewing(name)} aria-label={`See the ${t.frames} frames of ${name}`}
                      style={{ background: 'none', border: 0, padding: 0, color: 'var(--c-cyan)', fontSize: 11, cursor: 'pointer' }}>
                      {t.frames} frames
                    </button>
                  ) : null}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                    <button type="button" style={small} onClick={() => copyText(`sprite.texture = '${name}';`)}
                      aria-label={`Copy code for ${name}`}>Copy code</button>
                    <button type="button" style={small} onClick={() => void remixTexture(name, t)}
                      aria-label={`Remix ${name}`} title="Make your own copy and open it in the Texture editor">Remix</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </>
  );
  const soundList = (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PALETTE.map((p) => (
            <div key={p.name} style={{
              padding: 6, borderRadius: 6, border: '1px solid var(--c-line)', background: 'var(--c-deep2)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <button type="button" aria-label={`Play ${p.label}`}
                onClick={() => { new Audio(p.file).play().catch(() => {}); }}
                style={{ background: 'transparent', color: 'var(--c-fg)', border: '1px solid var(--c-line)', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}>▶</button>
              <span style={{ fontSize: 12 }}>{p.label}</span>
              <button type="button" style={small} onClick={() => copyText(`let ${p.name} = loadSound('${p.file}');`)}
                aria-label={`Copy code for ${p.label}`}>Copy code</button>
              <button type="button" style={small} onClick={() => void remixSound(p)}
                aria-label={`Remix ${p.label}`} title="Make your own copy and open it in the Sound mixer">Remix</button>
            </div>
          ))}
        </div>
  );

  if (kind) {
    return (
      <section aria-labelledby="builtin-h" style={sectionStyle}>
        <h3 id="builtin-h" style={sectionHeading}>
          Built in ({kind === 'texture' ? (texCount ?? '…') : PALETTE.length})
        </h3>
        <p style={sectionNote}>
          These work in any sketch with no saving. <strong style={{ color: 'var(--c-fg)' }}>Copy code</strong> copies the
          line that uses one; <strong style={{ color: 'var(--c-fg)' }}>Remix</strong> makes your own copy and opens it in
          the {kind === 'texture' ? 'Texture editor' : 'Sound mixer'}, so you can change it, save it and share it.
        </p>
        {kind === 'texture' ? textureList : soundList}
        {viewer}
      </section>
    );
  }

  return (
    <section aria-labelledby="builtin-h" style={{ marginTop: 18 }}>
      <h3 id="builtin-h" style={{ fontSize: 14, margin: '0 0 4px', color: 'var(--c-fg)' }}>Built in</h3>
      <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: '0 0 10px', lineHeight: 1.5 }}>
        These work in any sketch with no saving. <strong style={{ color: 'var(--c-fg)' }}>Copy code</strong> copies the
        line that uses one; <strong style={{ color: 'var(--c-fg)' }}>Remix</strong> makes your own copy and opens it in the
        Texture editor or Sound mixer, so you can change it, save it and share it.
      </p>

      <details open>
        <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--c-fg)', margin: '6px 0' }}>
          Textures ({texCount ?? '…'})
        </summary>
        {textureList}
        {viewer}
      </details>

      <details open>
        <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--c-fg)', margin: '10px 0 6px' }}>
          Sounds ({PALETTE.length})
        </summary>
        {soundList}
      </details>
    </section>
  );
}
