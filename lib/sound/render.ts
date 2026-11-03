// Turning a sound choice into samples and into the data: URI loadSound()
// takes. Two engines, one output shape:
//
//   jsfxr  -> a short 8-bit WAV (it renders it itself)
//   ZzFXM  -> [left, right] Float32Arrays, encoded here
//
// Both are cached. A mixer channel must keep the same random variation while
// the student drags its volume slider; regenerating a `random` preset on every
// render would make the sound change under their hand.

import { sfxr, type SfxrParams } from './vendor/jsfxr/sfxr.mjs';
import { zzfxM, zzfxR } from './vendor/zzfxm/zzfxm.js';
import { findMusicLoop } from './loops';
import { paramsFromPreset, SFX_SAMPLE_RATE } from './params';
import { downsample, encodeWav, toMono, wavDataUri } from './wav';

export interface RenderedSfx {
  kind: 'sfx';
  dataUri: string;
  /** Mono, -1..1, for the waveform and the preview. */
  samples: Float32Array;
  sampleRate: number;
  duration: number;
  /** jsfxr's own parameter object, for a reloadable definition. */
  def: SfxrParams;
}

export interface RenderedMusic {
  kind: 'music';
  dataUri: string;
  /** Stereo at zzfxR, for the preview. */
  channels: Float32Array[];
  sampleRate: number;
  /** The rate inside dataUri, which is lower so it fits in localStorage. */
  saveSampleRate: number;
  duration: number;
}

export type Rendered = RenderedSfx | RenderedMusic;

const sfxCache = new Map<string, RenderedSfx>();
const musicCache = new Map<string, RenderedMusic>();

/**
 * Render one explicit jsfxr definition.
 *
 * This is the path the mixer's Tweak panel uses: the definition IS the sound,
 * so a slider move must render exactly what the student sees. jsfxr's own
 * presets and the `random` preset go through paramsFromPreset(), which pins
 * the coin's envelope and normalises every value to the mixer's spec ranges.
 */
export function renderSfxDef(def: SfxrParams, sampleRate = SFX_SAMPLE_RATE): RenderedSfx {
  const rate = Number(def.sample_rate) || sampleRate;
  // Fill in the three sample fields a hand-edited or older saved definition
  // may be missing. toBuffer() reads all of them.
  const renderDef: SfxrParams = {
    sound_vol: 0.25,
    sample_size: 8,
    ...def,
    sample_rate: rate,
  };
  // toBuffer() is the 8-bit UNSIGNED buffer jsfxr rendered: 128 is silence.
  const raw = sfxr.toBuffer(renderDef);
  const samples = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) samples[i] = (raw[i] - 128) / 128;
  return {
    kind: 'sfx',
    dataUri: wavDataUri(encodeWav([samples], rate, 8)),
    samples,
    sampleRate: rate,
    duration: samples.length / rate,
    def: renderDef,
  };
}

/**
 * Render one jsfxr preset.
 *
 * 22050 Hz is the mixer's default: half the samples of CD audio, a quarter of
 * the bytes, and above the top of what an 8-bit chiptune effect needs. The
 * course's palette files use the same rate.
 *
 * `seed` is only a cache key. jsfxr rolls fresh parameters on every
 * generate(), so a new seed is how the caller asks for a new `random` sound.
 */
export function renderSfx(preset: string, seed = '', sampleRate = SFX_SAMPLE_RATE): RenderedSfx {
  const key = `${preset}@${sampleRate}:${seed}`;
  const cached = sfxCache.get(key);
  if (cached) return cached;
  const def = paramsFromPreset(preset);
  if (sampleRate !== SFX_SAMPLE_RATE) def.sample_rate = sampleRate;
  const rendered = renderSfxDef(def, sampleRate);
  sfxCache.set(key, rendered);
  return rendered;
}

export interface MusicOptions {
  /** Sample rate inside the saved data: URI. Default 22050. */
  saveRate?: number;
  /** Mix to one channel in the saved data: URI. Default true. */
  mono?: boolean;
}

/**
 * Render one ZzFXM loop.
 *
 * The preview keeps the engine's 44100 Hz stereo; the saved data: URI is
 * downsampled (and usually mono) because it is going into localStorage next
 * to the student's textures and lesson drafts. A five-second loop at 22050 Hz
 * mono is about 117 KB of samples, ~156 KB as base64 — under the sound cap
 * and still recognisably the same tune.
 */
export function renderMusic(loopId: string, options: MusicOptions = {}): RenderedMusic {
  const saveRate = options.saveRate ?? 22050;
  const mono = options.mono ?? true;
  const key = `${loopId}@${saveRate}:${mono ? 'm' : 's'}`;
  const cached = musicCache.get(key);
  if (cached) return cached;

  const loop = findMusicLoop(loopId);
  const raw = zzfxM(loop.instruments, loop.patterns, loop.sequence, loop.bpm);
  const channels = raw.map((c) => (c instanceof Float32Array ? c : Float32Array.from(c)));
  const saveChannels = downsample(channels, zzfxR, saveRate);
  const outChannels = mono ? [toMono(saveChannels)] : saveChannels;
  const dataUri = wavDataUri(encodeWav(outChannels, saveRate, 8));
  const rendered: RenderedMusic = {
    kind: 'music',
    dataUri,
    channels,
    sampleRate: zzfxR,
    saveSampleRate: saveRate,
    duration: (channels[0]?.length ?? 0) / zzfxR,
  };
  musicCache.set(key, rendered);
  return rendered;
}

/** Render whatever a mixer channel is set to. */
export function renderChannel(
  kind: 'sfx' | 'music',
  source: string,
  def?: SfxrParams
): Rendered {
  if (kind === 'music') return renderMusic(source);
  return def ? renderSfxDef(def) : renderSfx(source);
}
