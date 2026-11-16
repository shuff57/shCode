// Exercise the real transport with controlled media events, including slow shared fetches.
import assert from 'node:assert/strict';
import { createSoundPreview } from '../lib/sound-preview.ts';

class AudioStub {
  paused = true;
  ended = false;
  currentTime = 0;
  volume = 1;
  playbackRate = 1;
  onplay = null;
  onpause = null;
  onended = null;
  onerror = null;
  plays = 0;
  failure = false;
  async play() {
    this.plays++;
    if (this.failure) throw new Error('Playback blocked');
    this.paused = false;
    this.onplay?.();
  }
  pause() { this.paused = true; this.onpause?.(); }
  finish() { this.ended = true; this.paused = true; this.onended?.(); }
}
function preview(source = 'sound.wav', options = {}) {
  const audio = new AudioStub();
  const states = [];
  const urls = [];
  const player = createSoundPreview({ source, onState: (state) => states.push(state), makeAudio: (url) => { urls.push(url); return audio; }, ...options });
  return { audio, states, urls, player, state: () => states.at(-1) };
}
const a = preview('first.wav', { settings: () => ({ volume: 0.4, rate: 1.5 }) });
assert.equal(a.urls.length, 0, 'No media object before clicking Play');
await a.player.toggle();
assert.equal(a.state(), 'playing');
assert.equal(a.audio.volume, 0.4);
assert.equal(a.audio.playbackRate, 1.5);
a.audio.currentTime = 12;
await a.player.toggle();
assert.equal(a.state(), 'paused');
assert.equal(a.audio.paused, true);
assert.equal(a.audio.currentTime, 12);
await a.player.toggle();
assert.equal(a.state(), 'playing');
assert.equal(a.audio.currentTime, 12, 'Resume keeps the playback position');
assert.deepEqual(a.urls, ['first.wav'], 'Resume reuses its media object');

const b = preview('second.wav');
await b.player.toggle();
assert.equal(a.state(), 'paused');
assert.equal(a.audio.paused, true, 'Starting another preview silences the first');
assert.equal(b.state(), 'playing');
b.audio.finish();
assert.equal(b.state(), 'idle');
assert.equal(b.audio.currentTime, 0);
await b.player.toggle();
assert.equal(b.state(), 'playing', 'Finished previews can restart');
b.player.dispose();
assert.equal(b.audio.paused, true, 'Closing a folder or tab pauses its media');
const beforeDispose = b.states.length;
await b.player.toggle();
assert.equal(b.states.length, beforeDispose, 'Disposed previews cannot restart');
a.player.dispose();

let resolveSource;
const slow = preview(() => new Promise((resolve) => { resolveSource = resolve; }));
const pending = slow.player.toggle();
assert.equal(slow.state(), 'loading');
const newer = preview();
await newer.player.toggle();
resolveSource('late.wav');
await pending;
assert.equal(slow.urls.length, 0, 'A late shared fetch cannot interrupt a newer preview');
assert.equal(newer.state(), 'playing');
newer.player.dispose();
slow.player.dispose();

let resolveRemoved;
const removed = preview(() => new Promise((resolve) => { resolveRemoved = resolve; }));
const removedPending = removed.player.toggle();
removed.player.dispose();
resolveRemoved('removed.wav');
await removedPending;
assert.equal(removed.urls.length, 0, 'An unmounted preview cannot start after its fetch resolves');

const failed = preview();
failed.audio.failure = true;
await failed.player.toggle();
assert.equal(failed.state(), 'error');
failed.audio.failure = false;
await failed.player.toggle();
assert.equal(failed.state(), 'playing', 'A failed play can be retried');
failed.audio.onerror?.();
assert.equal(failed.state(), 'error');
failed.player.dispose();
const unavailable = preview(() => null);
await unavailable.player.toggle();
assert.equal(unavailable.state(), 'error');
unavailable.player.dispose();

let resolvePlay;
const lateAudio = new AudioStub();
lateAudio.play = () => new Promise((resolve) => { resolvePlay = () => { lateAudio.paused = false; resolve(); }; });
const late = preview('late-play.wav', { makeAudio: () => lateAudio });
const latePending = late.player.toggle();
late.player.dispose();
resolvePlay();
await latePending;
assert.equal(lateAudio.paused, true, 'A pending play is silenced when it resolves after disposal');

const interruptedAudio = new AudioStub();
interruptedAudio.play = () => new Promise((resolve) => { resolvePlay = () => { interruptedAudio.paused = false; resolve(); }; });
const interrupted = preview('interrupted.wav', { makeAudio: () => interruptedAudio });
const interruptedPending = interrupted.player.toggle();
await interrupted.player.toggle();
resolvePlay();
await interruptedPending;
assert.equal(interruptedAudio.paused, true, 'Pausing during a pending play cannot leave a late sound running');
interrupted.player.dispose();
console.log('PASS Sound previews: pause/resume position, one active sound, completion/restart, failures/retry, disposal and asynchronous fetch/play races');
