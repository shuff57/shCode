// Importing a picture into the texture editor (#99).
//
// The editor is a pixel grid of at most `max` x `max` cells, so a picture is
// fitted into that box keeping its shape. Two cases read differently:
//  - pixel art that was simply blown up (a 21x21 sprite saved at 84x84) is made
//    of solid k x k blocks; shrinking it by k, one source pixel per cell
//    (`smooth: false`), gives the art back exactly;
//  - anything else (a photo, a drawing) is averaged by the browser
//    (`smooth: true`), because picking one pixel per cell looks ragged.
// Whole-number sides alone prove nothing (a 1920x1080 photo divides by 30), so
// the blocks themselves are checked: pixelScale() over the real pixels.
// A picture already inside the box is taken as it is.

export interface ImportSize { w: number; h: number; smooth: boolean }

/** The smallest whole-number shrink that would fit `max`, if it divides both sides. */
export function blockFactor(srcW: number, srcH: number, max: number): number | null {
  if (srcW <= max && srcH <= max) return null;
  const k = Math.ceil(Math.max(srcW, srcH) / max);
  return srcW % k === 0 && srcH % k === 0 ? k : null;
}

/**
 * How many times blown up the picture really is: the LARGEST k >= minK that
 * divides both sides and leaves every k x k block solid, or null. 21x21 art
 * saved at 4x fits the grid after a shrink of 2, but 4 gives the art back at
 * its own size.
 */
export function pixelScale(data: ArrayLike<number>, w: number, h: number, minK: number): number | null {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const g = gcd(w, h);
  for (let k = g; k >= Math.max(2, minK); k--) {
    if (g % k === 0 && isBlockScaled(data, w, h, k)) return k;
  }
  return null;
}

/** True when every k x k block of the RGBA pixels is one solid colour. */
export function isBlockScaled(data: ArrayLike<number>, w: number, h: number, k: number): boolean {
  if (k < 2 || w % k || h % k) return false;
  for (let y = 0; y < h; y++) {
    const by = y - (y % k);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const j = (by * w + (x - (x % k))) * 4;
      if (data[i + 3] === 0 && data[j + 3] === 0) continue; // clear is clear, whatever colour it hides
      if (data[i] !== data[j] || data[i + 1] !== data[j + 1] || data[i + 2] !== data[j + 2] || data[i + 3] !== data[j + 3]) return false;
    }
  }
  return true;
}

/** Target size. `scale` is pixelScale()'s answer (null: not blown-up pixel art). */
export function importSize(srcW: number, srcH: number, max: number, scale: number | null = null): ImportSize | null {
  if (!(srcW >= 1 && srcH >= 1) || !Number.isFinite(srcW) || !Number.isFinite(srcH)) return null;
  if (srcW <= max && srcH <= max) return { w: srcW, h: srcH, smooth: false };
  if (scale && srcW % scale === 0 && srcH % scale === 0 && srcW / scale <= max && srcH / scale <= max) {
    return { w: srcW / scale, h: srcH / scale, smooth: false };
  }
  const f = max / Math.max(srcW, srcH);
  return {
    w: Math.max(1, Math.min(max, Math.round(srcW * f))),
    h: Math.max(1, Math.min(max, Math.round(srcH * f))),
    smooth: true,
  };
}

// A texture name must match /^[A-Za-z][A-Za-z0-9_]*$/ (lib/moshion-storage.ts),
// so "My Hero (2).png" becomes "My_Hero_2". A name that starts with a digit gets
// a letter in front; a name with nothing usable falls back to "picture".
export function textureNameFromFile(filename: string): string {
  const base = filename.replace(/\.[A-Za-z0-9]{1,5}$/, '');
  let n = base.replace(/[^A-Za-z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  if (!n) return 'picture';
  if (!/^[A-Za-z]/.test(n)) n = 'p' + n;
  return n.slice(0, 40);
}

// The kinds a browser can decode into a canvas without surprises. SVG is not
// one of them: it is a document, not pixels. The editor turns an SVG into a PNG
// first (lib/svg-raster.ts) and then imports that.
export const IMPORT_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
export const IMPORT_MAX_BYTES = 10 * 1024 * 1024;
