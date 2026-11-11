#!/usr/bin/env node
// Importing a picture into the texture editor (#99, lib/texture-import.ts).
// What has to hold:
//   1. a picture already inside the grid is taken at its own size;
//   2. pixel art blown up by a whole number comes back at its real size,
//      pixel for pixel (no smoothing);
//   3. anything else shrinks to fit the grid, keeping its shape, smoothed;
//   4. every file name becomes a name saveTexture accepts.
import assert from 'node:assert/strict';
import { importSize, blockFactor, isBlockScaled, pixelScale, textureNameFromFile, IMPORT_TYPES } from '../lib/texture-import.ts';

const MAX = 64;
assert.deepEqual(importSize(21, 21, MAX), { w: 21, h: 21, smooth: false });
assert.deepEqual(importSize(64, 10, MAX), { w: 64, h: 10, smooth: false });
assert.deepEqual(importSize(84, 84, MAX, 4), { w: 21, h: 21, smooth: false }, '21x21 art at 4x comes back at 21x21');
assert.deepEqual(importSize(128, 64, MAX, 2), { w: 64, h: 32, smooth: false });
assert.deepEqual(importSize(128, 64, MAX, 1).smooth, true, 'a scale that does not fit is ignored');
assert.deepEqual(importSize(1920, 1080, MAX), { w: 64, h: 36, smooth: true }, 'a photo that divides evenly is still smoothed');
assert.deepEqual(importSize(1920, 1080, MAX, null), { w: 64, h: 36, smooth: true });
assert.equal(blockFactor(84, 84, MAX), 2);
assert.equal(blockFactor(100, 300, MAX), 5);
assert.equal(blockFactor(100, 301, MAX), null);
assert.equal(blockFactor(40, 40, MAX), null, 'already fits');
assert.deepEqual(importSize(100, 300, MAX), { w: 21, h: 64, smooth: true });
assert.deepEqual(importSize(5000, 1, MAX), { w: 64, h: 1, smooth: true }, 'never a 0-pixel side');
assert.equal(importSize(0, 10, MAX), null);
assert.equal(importSize(NaN, 10, MAX), null);
for (const [w, h] of [[65, 65], [300, 7], [999, 1000], [64, 65]]) {
  const s = importSize(w, h, MAX);
  assert.ok(s.w >= 1 && s.h >= 1 && s.w <= MAX && s.h <= MAX, `${w}x${h} fits`);
}

const valid = /^[A-Za-z][A-Za-z0-9_]*$/;
const names = {
  'hero.png': 'hero',
  'My Hero (2).png': 'My_Hero_2',
  '8bit-coin.webp': 'p8bit_coin',
  '...png': 'picture',
  '日本.png': 'picture',
  'Body_Hurtbox.PNG': 'Body_Hurtbox',
};
for (const [file, want] of Object.entries(names)) {
  const got = textureNameFromFile(file);
  assert.equal(got, want, file);
  assert.match(got, valid);
}
assert.ok(textureNameFromFile('a'.repeat(200) + '.png').length <= 40);
// isBlockScaled: a 2x2 picture blown up 3x is blocky; one changed pixel is not.
function blowUp(px, w, h, k) {
  const W = w * k, H = h * k, out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = ((Math.floor(y / k)) * w + Math.floor(x / k)) * 4, d = (y * W + x) * 4;
    for (let c = 0; c < 4; c++) out[d + c] = px[s + c];
  }
  return out;
}
const art = [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 0, 0, 0, 0];
const big = blowUp(art, 2, 2, 3);
assert.equal(isBlockScaled(big, 6, 6, 3), true);
big[(4 * 6 + 1) * 4] ^= 1;  // inside the opaque blue block
assert.equal(isBlockScaled(big, 6, 6, 3), false, 'one pixel off breaks it');
assert.equal(isBlockScaled(blowUp(art, 2, 2, 3), 6, 6, 4), false, 'k must divide the sides');
// Fully transparent pixels count as the same whatever colour they hide.
const clear = blowUp(art, 2, 2, 3);
clear[(5 * 6 + 5) * 4] = 77;  // bottom-right block is alpha 0
assert.equal(isBlockScaled(clear, 6, 6, 3), true, 'hidden colour under alpha 0 does not matter');
// pixelScale: the real blow-up, not just the smallest shrink that fits.
const art21 = new Uint8ClampedArray(21 * 21 * 4).map((_, i) => (i * 37) % 256);
assert.equal(pixelScale(blowUp(art21, 21, 21, 4), 84, 84, 2), 4);
assert.equal(pixelScale(blowUp(art21, 21, 21, 1), 21, 21, 2), null, 'not blown up');
assert.ok(!IMPORT_TYPES.includes('image/svg+xml'), 'SVG is not pixels');

console.log('test-texture-import: ok');
