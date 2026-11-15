// The sizing rules of the console box under the editor (components/ResizableConsole.tsx), kept apart
// from React so they can be tested: how tall it may be, and what the arrow keys do to it.

/** The shortest the console box may be dragged to, in px: the header and a line or two. */
export const CONSOLE_MIN = 72;

/**
 * A wanted height, kept between CONSOLE_MIN and `most`. A `most` below the minimum (a short window)
 * still leaves the minimum, so the console never vanishes; a `most` that is not a number is "no limit".
 */
export function clampConsoleHeight(want: number, most: number, min: number = CONSOLE_MIN): number {
  if (Number.isNaN(want)) return min;
  // The ceiling: `most`, else (no usable ceiling) the wanted height itself, else just the minimum, so the
  // result is always a finite number.
  const cap = Number.isFinite(most) ? Math.max(min, most) : Number.isFinite(want) ? Math.max(min, want) : min;
  return Math.round(Math.max(min, Math.min(want, cap)));
}

/**
 * What an arrow key does to the console's height: up makes it taller, down shorter, 24 px a press and
 * 80 with Shift held. Any other key is not ours (null).
 */
export function consoleKeyDelta(key: string, shift: boolean): number | null {
  if (key !== 'ArrowUp' && key !== 'ArrowDown') return null;
  return (shift ? 80 : 24) * (key === 'ArrowUp' ? 1 : -1);
}

/** A window's share of its height: the default ceiling for a console that sits in a scrolling page. */
export function windowShare(innerHeight: number, share = 0.6): number {
  return Math.round(Math.max(0, innerHeight) * share);
}
