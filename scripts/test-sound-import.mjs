#!/usr/bin/env node
// lib/sound-import.ts (#85): an imported clip is typed by its bytes, fits the
// saved-sound cap once encoded, and gets a code-safe name that never clashes.
// Run: node scripts/test-sound-import.mjs
import { sniffClip, prepareClip, clipName, maxClipBytes, MAX_SAVED_SOUND_CHARS } from '../lib/sound-import.ts';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ' -- ' + JSON.stringify(detail) : ''}`); }
}
const pad = (head, n) => { const b = new Uint8Array(n); b.set(head); return b; };
const WAV = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45];
const OGG = [0x4f, 0x67, 0x67, 0x53, 0, 2, 0, 0, 0, 0, 0, 0];
const ID3 = [0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0, 0, 0];
const SYNC = [0xff, 0xfb, 0x90, 0x64, 0, 0, 0, 0, 0, 0, 0, 0];

check('WAV, OGG, MP3 (ID3) and MP3 (frame sync) are recognised',
  sniffClip(pad(WAV, 64)) === 'audio/wav' && sniffClip(pad(OGG, 64)) === 'audio/ogg'
    && sniffClip(pad(ID3, 64)) === 'audio/mpeg' && sniffClip(pad(SYNC, 64)) === 'audio/mpeg');
check('a renamed web page is refused', sniffClip(new TextEncoder().encode('<html><script>x</script></html>')) === null);
check('a PNG is refused', sniffClip(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 64)) === null);
check('a bare 0xFF byte with a reserved layer is refused', sniffClip(pad([0xff, 0xe0], 64)) === null);

const max = maxClipBytes('audio/mpeg');
const fits = prepareClip(pad(ID3, max));
check('the largest allowed clip fits the 256 KB saved-sound cap once JSON-encoded',
  fits.ok && JSON.stringify(fits.dataUri).length <= MAX_SAVED_SOUND_CHARS, fits.ok ? JSON.stringify(fits.dataUri).length : fits);
const over = prepareClip(pad(ID3, max + 4));
check('one step bigger is refused with the size in KB', !over.ok && /KB/.test(over.error), over);
const notSound = prepareClip(new TextEncoder().encode('hello world, not audio'));
check('a non-sound gets a plain sentence', !notSound.ok && /not an MP3, WAV or OGG/.test(notSound.error), notSound);
const ok = prepareClip(pad(WAV, 1000));
check('a WAV becomes a data:audio/wav URI', ok.ok && ok.dataUri.startsWith('data:audio/wav;base64,'), ok.ok && ok.dataUri.slice(0, 30));

check('names come from the file name', clipName('Big Jump!.mp3', new Set()) === 'Big_Jump', clipName('Big Jump!.mp3', new Set()));
check('a name starting with a digit gets a letter in front', clipName('8bit.wav', new Set()) === 'clip_8bit', clipName('8bit.wav', new Set()));
check('a taken name gets a number', clipName('zap.ogg', new Set(['zap', 'zap2'])) === 'zap3');
check('names stay within 40 characters', clipName('a'.repeat(80) + '.mp3', new Set()).length === 40);
check('an empty name still yields a valid one', /^[A-Za-z][A-Za-z0-9_]*$/.test(clipName('.mp3', new Set())), clipName('.mp3', new Set()));

console.log(`\ntest-sound-import: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
