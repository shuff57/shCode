// SVG pictures, turned into PNG in the browser as they come in (#114).
//
// An SVG is a document, not pixels: it can carry <script>, so the server never
// stores one (functions/_shared/uploads.ts refuses it by its bytes). A student
// with a drawing saved as .svg still gets to use it: the page draws it through
// an <img> (which never runs an SVG's scripts or fetches what it links to),
// paints that onto a canvas at a chosen size, and hands on a PNG. Nothing
// downstream ever sees the SVG.

export const SVG_TYPE = 'image/svg+xml';

/** True for an .svg file, whether or not the computer gave it a type. */
export function isSvgFile(file: { name?: string; type?: string }): boolean {
  return file.type === SVG_TYPE || /\.svg$/i.test(file.name ?? '');
}

/**
 * The size an SVG asks to be drawn at, in pixels: its own width and height
 * when they are plain numbers (or px), else its viewBox, else null (the caller
 * picks one). A width in %, em, cm and so on is not a pixel size and is skipped.
 */
export function svgIntrinsicSize(attrs: { width?: string | null; height?: string | null; viewBox?: string | null }): { w: number; h: number } | null {
  const px = (v?: string | null) => {
    const m = /^\s*([0-9]*\.?[0-9]+)\s*(px)?\s*$/i.exec(v ?? '');
    const n = m ? Number(m[1]) : NaN;
    return n > 0 && Number.isFinite(n) ? n : null;
  };
  const vb = (attrs.viewBox ?? '').trim().split(/[\s,]+/).map(Number);
  const vw = vb.length === 4 && vb[2] > 0 ? vb[2] : null;
  const vh = vb.length === 4 && vb[3] > 0 ? vb[3] : null;
  let w = px(attrs.width);
  let h = px(attrs.height);
  // One side given: the other follows the viewBox's shape, or matches it.
  if (w && !h) h = vw && vh ? (w * vh) / vw : w;
  if (h && !w) w = vw && vh ? (h * vw) / vh : h;
  if (w && h) return { w, h };
  if (vw && vh) return { w: vw, h: vh };
  return null;
}

/** Fit (w, h) so the longer side is at most `max`, keeping the shape. Never grows it. */
export function fitSide(w: number, h: number, max: number): { w: number; h: number } {
  const f = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * f)), h: Math.max(1, Math.round(h * f)) };
}

export class SvgError extends Error {}

/**
 * Draw an SVG file as a PNG file. `maxSide` caps the longer side; an SVG with
 * no size of its own is drawn `fallback` pixels on its longer side.
 * Throws SvgError with a sentence a student can act on.
 */
export async function svgToPng(file: File, { maxSide, fallback = 512 }: { maxSide: number; fallback?: number }): Promise<File> {
  const text = await file.text();
  const doc = new DOMParser().parseFromString(text, SVG_TYPE);
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) {
    throw new SvgError(`${file.name} is not an SVG drawing this page can read.`);
  }
  const own = svgIntrinsicSize({
    width: root.getAttribute('width'),
    height: root.getAttribute('height'),
    viewBox: root.getAttribute('viewBox'),
  });
  const size = fitSide(own?.w ?? fallback, own?.h ?? fallback, maxSide);
  // Give the drawing that exact size, so the browser draws it crisp at the
  // size we want instead of guessing (an SVG with only a viewBox has none).
  if (!root.getAttribute('viewBox') && own) root.setAttribute('viewBox', `0 0 ${own.w} ${own.h}`);
  root.setAttribute('width', String(size.w));
  root.setAttribute('height', String(size.h));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)], { type: SVG_TYPE }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new SvgError(`${file.name} could not be drawn. Try saving it as a PNG.`));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new SvgError('This browser could not draw the picture.');
    ctx.drawImage(img, 0, 0, size.w, size.h);
    let blob: Blob | null;
    try {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    } catch {
      // A drawing with web-page parts inside it (<foreignObject>) locks the canvas.
      blob = null;
    }
    if (!blob) throw new SvgError(`${file.name} has parts a picture cannot keep. Try saving it as a PNG.`);
    const name = (file.name || 'picture.svg').replace(/\.svg$/i, '') + '.png';
    return new File([blob], name, { type: 'image/png' });
  } finally {
    URL.revokeObjectURL(url);
  }
}
