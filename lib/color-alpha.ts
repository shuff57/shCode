// A colour with transparency, whether the colour is a hex ('#50fa7b') or a
// theme variable ('var(--c-green)'). Appending two hex digits ('#50fa7b' + '22')
// was how components faded a colour; on a variable that yields
// 'var(--c-green)22', which is not a colour, and the browser drops the whole
// declaration (the badge loses its background with no error).
//
// withAlpha(c, '22') === the old c + '22' for a hex, and the same colour at the
// same opacity for anything else.
export function withAlpha(color: string, alphaHex: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color + alphaHex;
  const pct = +((parseInt(alphaHex, 16) / 255) * 100).toFixed(4);
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}
