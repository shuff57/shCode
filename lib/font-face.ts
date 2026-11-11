'use client';

// Showing a font on a shCode page (Library -> Fonts, the Font maker, teacher
// moderation): the same font a sketch gets from textFont('name'), loaded into
// THIS page with the FontFace API under a family name of its own, so a card can
// draw its sample in that font.
//
// Two sources: a built-in font (public/moshion/fonts/fonts.json, the catalog
// runner.html also loads) or a saved font's data URI. Each is loaded once per
// page and remembered by key; a font that fails to load (a broken upload)
// answers 'failed' and the card says so instead of showing the fallback as if
// it were the font.

import { useEffect, useState } from 'react';

export interface BuiltinFontFace { file: string; weight: string; style: string }
export interface BuiltinFont { family: string; look: string; faces: BuiltinFontFace[]; licence: string; licenceFile: string }
export interface FontCatalog { base: string; fonts: Record<string, BuiltinFont> }

let catalogPromise: Promise<FontCatalog> | null = null;

/** The built-in font catalog, fetched once. Empty on failure. */
export function builtinFontCatalog(): Promise<FontCatalog> {
  if (!catalogPromise) {
    catalogPromise = fetch('/moshion/fonts/fonts.json')
      .then((r) => (r.ok ? (r.json() as Promise<FontCatalog>) : null))
      .then((d) => (d && d.fonts ? d : { base: '/moshion/fonts/', fonts: {} }))
      .catch(() => ({ base: '/moshion/fonts/', fonts: {} }));
  }
  return catalogPromise;
}

/** The weights a built-in font has, as words: "100 to 900", "300, 400 and 700", "400". */
export function weightRange(font: BuiltinFont): string {
  const upright = font.faces.filter((f) => f.style === 'normal');
  const faces = upright.length ? upright : font.faces;
  const nums = new Set<number>();
  for (const f of faces) for (const n of f.weight.split(' ')) nums.add(Number(n));
  const list = [...nums].sort((a, b) => a - b);
  if (faces.some((f) => f.weight.includes(' '))) return `${list[0]} to ${list[list.length - 1]}`;
  return list.length === 1 ? String(list[0]) : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

export type FontSource = { builtin: string } | { dataUri: string };
type State = { family: string } | 'loading' | 'failed';

const loads = new Map<string, Promise<string | null>>();

function bytesOf(dataUri: string): ArrayBuffer {
  const bin = atob(dataUri.slice(dataUri.indexOf(',') + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

let seq = 0;
function load(key: string, src: FontSource): Promise<string | null> {
  const known = loads.get(key);
  if (known) return known;
  const family = `shcode-font-${++seq}`;
  const p = (async () => {
    if (typeof FontFace !== 'function' || typeof document === 'undefined') return null;
    try {
      let faces: FontFace[];
      if ('builtin' in src) {
        const cat = await builtinFontCatalog();
        const f = cat.fonts[src.builtin];
        if (!f) return null;
        faces = f.faces.map((x) => new FontFace(family, `url(${cat.base}${x.file})`, { weight: x.weight, style: x.style }));
      } else {
        faces = [new FontFace(family, bytesOf(src.dataUri))];
      }
      const loaded = await Promise.all(faces.map((f) => f.load()));
      for (const f of loaded) document.fonts.add(f);
      return family;
    } catch {
      return null;
    }
  })();
  loads.set(key, p);
  return p;
}

/**
 * The CSS family to draw a font's sample in, once it has loaded. `key` names
 * the font for this page (a saved font's key should change when its bytes
 * do, e.g. include its length); the same key never loads twice.
 */
export function useFontFamily(key: string, src: FontSource | null): State {
  const [state, setState] = useState<State>('loading');
  useEffect(() => {
    if (!src) { setState('failed'); return; }
    let live = true;
    setState('loading');
    void load(key, src).then((family) => { if (live) setState(family ? { family } : 'failed'); });
    return () => { live = false; };
    // src is described by key; a new object with the same key is the same font.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

/**
 * Was this font made in the Font maker (its meta is a saved drawing, lib/font-doc.ts)? A quick look
 * only, so the Library can offer Remix without loading the font-building code; the editor checks fully.
 */
export function isFontDrawing(meta: string | null | undefined): boolean {
  return typeof meta === 'string' && meta.startsWith('{"v":1,"glyphs":');
}

/** Check that `dataUri` really is a font the browser can draw (the browser's own sanitizer decides). */
export async function fontWorks(dataUri: string): Promise<boolean> {
  if (typeof FontFace !== 'function') return true;
  try {
    await new FontFace(`shcode-check-${++seq}`, bytesOf(dataUri)).load();
    return true;
  } catch {
    return false;
  }
}
