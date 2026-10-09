// Placement for shapes added from the palette. Dependency-free (no @xyflow)
// so scripts/test-diagram.mjs can compile and test it.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const GAP = 40;
const PAD = 20;
const MAX_SLOTS = 200;

function hits(a: Rect, b: Rect, pad: number): boolean {
  return (
    a.x - pad < b.x + b.w &&
    a.x + a.w + pad > b.x &&
    a.y - pad < b.y + b.h &&
    a.y + a.h + pad > b.y
  );
}

/**
 * First free slot walking a grid from `origin`, left to right then down. A slot
 * is free when its rect, padded by 20, touches no existing rect. Deterministic.
 * Falls back to a scatter near the origin if 200 slots are all taken.
 */
export function nextFreeSlot(
  existing: Rect[],
  size: { w: number; h: number },
  origin: { x: number; y: number },
  cols = 4,
): { x: number; y: number } {
  const stepX = size.w + GAP;
  const stepY = size.h + GAP;
  for (let i = 0; i < MAX_SLOTS; i++) {
    const x = origin.x + (i % cols) * stepX;
    const y = origin.y + Math.floor(i / cols) * stepY;
    const cand = { x, y, w: size.w, h: size.h };
    if (!existing.some((r) => hits(cand, r, PAD))) return { x, y };
  }
  const n = existing.length;
  return { x: origin.x + 280 + ((n * 37) % 140), y: origin.y + ((n * 61) % 220) };
}

/**
 * Where a shape added "from" an anchor shape goes: directly below it, centred
 * on the anchor's column, so a straight run of steps falls in one column. When
 * that slot is taken (a diamond's second exit, say) it tries below-right, then
 * below-left, then slides further down the anchor's column. Never moves
 * anything already placed. Returns null if nothing nearby is free, so the
 * caller can fall back to the grid.
 */
export function placeBelow(
  anchor: Rect,
  existing: Rect[],
  size: { w: number; h: number },
): { x: number; y: number } | null {
  const rowGap = 50;
  const cx = anchor.x + (anchor.w - size.w) / 2;
  const y0 = anchor.y + anchor.h + rowGap;
  const stepX = Math.max(anchor.w, size.w) + GAP;
  const free = (x: number, y: number) =>
    !existing.some((r) => hits({ x, y, w: size.w, h: size.h }, r, 10));
  for (const dx of [0, stepX, -stepX]) {
    if (free(cx + dx, y0)) return { x: Math.round(cx + dx), y: Math.round(y0) };
  }
  for (let i = 1; i <= 8; i++) {
    const y = y0 + i * (size.h + GAP);
    if (free(cx, y)) return { x: Math.round(cx), y: Math.round(y) };
  }
  return null;
}

/**
 * The label offered for a diamond's next exit: `yes` for the first, and the
 * opposite of the answer already used for the second (so a student who drew
 * `no` first and corrected it is not handed a second `no`). Blank otherwise.
 * `existing` is the labels of the exits already drawn.
 */
export function nextDecisionLabel(existing: string[]): string {
  const norm = existing.map((l) => l.trim().toLowerCase());
  if (existing.length === 0) return 'yes';
  if (existing.length === 1) {
    if (norm[0] === 'yes') return 'no';
    if (norm[0] === 'no') return 'yes';
  }
  return '';
}

/** Shown at the moment a second arrow between the same two shapes is refused. */
export const DUPLICATE_ARROW_NOTICE =
  'Those two shapes already have an arrow between them, so a second one was not added. ' +
  "If this is a diamond's other exit, give it its own step or point it at a different shape.";
