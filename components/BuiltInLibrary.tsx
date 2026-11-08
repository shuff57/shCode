'use client';

// "Built in" on the Library page and tab: every texture and sound that ships
// with moSHion, so a student can find them without the docs. A built-in works
// in any sketch straight away (`sprite.texture = 'sword'`,
// `loadSound('/moshion/assets/dice.wav')`); Copy to mine makes an editable copy
// in the student's own library (and so their account), where the Texture editor
// or the Sound mixer can change it and Share can hand it to the class.
//
// Textures come from public/moshion/textures/textures.json (made by
// scripts/make-moshion-textures.py from a CC0 sheet); sounds from PALETTE in
// lib/sound/presets.ts (rendered by scripts/make-moshion-sounds.mjs).

import { useEffect, useState } from 'react';
import { DESIGN_BASE, PALETTE } from '../lib/sound/presets';
import { freshName } from '../lib/library-sync';
import { listSavedSounds, listSavedTextures, saveSound, saveTexture } from '../lib/moshion-storage';

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

export default function BuiltInLibrary({ onMessage }: { onMessage?: (text: string, bad: boolean) => void }) {
  const [cat, setCat] = useState<Catalog | null>(null);

  useEffect(() => {
    fetch('/moshion/textures/textures.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => setCat(c))
      .catch(() => setCat(null));
  }, []);

  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text).then(
      () => onMessage?.(`Copied: ${text}`, false),
      () => onMessage?.(text, false),
    );
  };

  const copyTexture = async (name: string, t: TexEntry) => {
    try {
      const taken = new Set(listSavedTextures().map((x) => x.name));
      const mine = taken.has(name) ? freshName(name, taken) : name;
      const dataUrl = await asDataUri((cat?.base ?? '/moshion/textures/') + t.file);
      const err = saveTexture(mine, dataUrl, t.frames && t.frames > 1 ? { frames: t.frames, frameDelay: t.frameDelay ?? 6 } : undefined);
      onMessage?.(err ?? `Copied "${name}" into yours as "${mine}". Open it in the Texture editor to change it.`, !!err);
    } catch {
      onMessage?.('Could not copy that texture. Try again.', true);
    }
  };

  const copySound = async (p: (typeof PALETTE)[number]) => {
    try {
      const taken = new Set(listSavedSounds().map((x) => x.name));
      const mine = taken.has(p.name) ? freshName(p.name, taken) : p.name;
      const dataUri = await asDataUri(p.file);
      const def = p.def ? { ...DESIGN_BASE, ...p.def } : undefined;
      const err = saveSound(mine, dataUri, { kind: p.kind, source: p.source, ...(def ? { def } : {}) });
      onMessage?.(err ?? `Copied "${p.label}" into yours as "${mine}". Play it with loadSound('${mine}').`, !!err);
    } catch {
      onMessage?.('Could not copy that sound. Try again.', true);
    }
  };

  const groups: Record<string, [string, TexEntry][]> = {};
  if (cat) {
    for (const [name, t] of Object.entries(cat.textures)) (groups[t.group] ??= []).push([name, t]);
  }

  return (
    <section aria-labelledby="builtin-h" style={{ marginTop: 18 }}>
      <h3 id="builtin-h" style={{ fontSize: 14, margin: '0 0 4px', color: 'var(--c-fg)' }}>Built in</h3>
      <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: '0 0 10px', lineHeight: 1.5 }}>
        These work in any sketch with no saving. <strong style={{ color: 'var(--c-fg)' }}>Copy code</strong> copies the
        line that uses one; <strong style={{ color: 'var(--c-fg)' }}>Copy to mine</strong> makes your own copy you can change
        and share.
      </p>

      <details open>
        <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--c-fg)', margin: '6px 0' }}>
          Textures ({cat ? Object.keys(cat.textures).length : '…'})
        </summary>
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
                  <div style={{ width: 42, height: 42, overflow: 'hidden', borderRadius: 4, background: 'var(--x-202020)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={(cat?.base ?? '/moshion/textures/') + t.file} alt="" loading="lazy"
                      width={Math.round((42 * t.w) / t.h)} height={42}
                      style={{ height: 42, width: 'auto', maxWidth: 'none', imageRendering: 'pixelated', objectFit: 'cover', objectPosition: 'left' }} />
                  </div>
                  <code style={{ fontSize: 11 }}>{name}{t.frames && t.frames > 1 ? ' ▶' : ''}</code>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                    <button type="button" style={small} onClick={() => copyText(`sprite.texture = '${name}';`)}
                      aria-label={`Copy code for ${name}`}>Copy code</button>
                    <button type="button" style={small} onClick={() => void copyTexture(name, t)}
                      aria-label={`Copy ${name} to mine`}>Copy to mine</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </details>

      <details open>
        <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--c-fg)', margin: '10px 0 6px' }}>
          Sounds ({PALETTE.length})
        </summary>
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
              <button type="button" style={small} onClick={() => void copySound(p)}
                aria-label={`Copy ${p.label} to mine`}>Copy to mine</button>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
