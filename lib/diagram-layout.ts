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
