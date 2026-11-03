// The controls the mixer exposes for shaping one jsfxr effect.
//
// The values are jsfxr's own parameter fields, in its own 0..1 / -1..1 units.
// Keeping that unit (rather than Hz or seconds) is deliberate: the vendored
// engine is the thing that defines the sound, and a student who opens the
// jsfxr source sees the same names and numbers. The labels are plain words.
//
// The spec is also the clamp table. Every mutation and every slider write goes
// through it, so a hand-edited or reloaded definition can never put a value
// outside the range the engine can actually render.

import { sfxr, type SfxrParams } from './vendor/jsfxr/sfxr.mjs';

export type ParamGroup = 'pitch' | 'envelope' | 'character';

export interface ParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  group: ParamGroup;
}

export interface WaveShape {
  value: number;
  label: string;
}

export const WAVE_SHAPES: WaveShape[] = [
  { value: 0, label: 'Square' },
  { value: 1, label: 'Saw' },
  { value: 2, label: 'Sine' },
  { value: 3, label: 'Noise' },
];

export const PARAM_GROUPS: { id: ParamGroup; label: string }[] = [
  { id: 'pitch', label: 'Pitch' },
  { id: 'envelope', label: 'Envelope' },
  { id: 'character', label: 'Character' },
];

export const PARAM_SPECS: ParamSpec[] = [
  // Pitch. `slide` and `bend` are signed; the rest are amounts.
  { key: 'p_base_freq', label: 'pitch', min: 0, max: 1, step: 0.01, group: 'pitch' },
  { key: 'p_freq_limit', label: 'floor', min: 0, max: 1, step: 0.01, group: 'pitch' },
  { key: 'p_freq_ramp', label: 'slide', min: -1, max: 1, step: 0.01, group: 'pitch' },
  { key: 'p_freq_dramp', label: 'bend', min: -1, max: 1, step: 0.01, group: 'pitch' },
  { key: 'p_vib_strength', label: 'wobble', min: 0, max: 1, step: 0.01, group: 'pitch' },
  { key: 'p_vib_speed', label: 'wobble speed', min: 0, max: 1, step: 0.01, group: 'pitch' },
  { key: 'p_arp_mod', label: 'jump', min: -1, max: 1, step: 0.01, group: 'pitch' },
  { key: 'p_arp_speed', label: 'jump speed', min: 0, max: 1, step: 0.01, group: 'pitch' },
  // Envelope. All four are amounts from 0 to 1.
  { key: 'p_env_attack', label: 'attack', min: 0, max: 1, step: 0.01, group: 'envelope' },
  { key: 'p_env_sustain', label: 'sustain', min: 0, max: 1, step: 0.01, group: 'envelope' },
  { key: 'p_env_decay', label: 'decay', min: 0, max: 1, step: 0.01, group: 'envelope' },
  { key: 'p_env_punch', label: 'punch', min: 0, max: 1, step: 0.01, group: 'envelope' },
  // Character. Duty and filters shape the tone; the sweeps are signed.
  { key: 'p_duty', label: 'duty', min: 0, max: 1, step: 0.01, group: 'character' },
  { key: 'p_duty_ramp', label: 'duty sweep', min: -1, max: 1, step: 0.01, group: 'character' },
  { key: 'p_repeat_speed', label: 'repeat', min: 0, max: 1, step: 0.01, group: 'character' },
  { key: 'p_lpf_freq', label: 'low pass', min: 0, max: 1, step: 0.01, group: 'character' },
  { key: 'p_lpf_resonance', label: 'resonance', min: 0, max: 1, step: 0.01, group: 'character' },
  { key: 'p_lpf_ramp', label: 'filter sweep', min: -1, max: 1, step: 0.01, group: 'character' },
  { key: 'p_hpf_freq', label: 'high pass', min: 0, max: 1, step: 0.01, group: 'character' },
  { key: 'p_hpf_ramp', label: 'high sweep', min: -1, max: 1, step: 0.01, group: 'character' },
  { key: 'p_pha_offset', label: 'flanger', min: -1, max: 1, step: 0.01, group: 'character' },
  { key: 'p_pha_ramp', label: 'flanger sweep', min: -1, max: 1, step: 0.01, group: 'character' },
];

const SPEC_BY_KEY = new Map(PARAM_SPECS.map((s) => [s.key, s]));

export const SFX_SAMPLE_RATE = 22050;

// jsfxr's presets roll their envelope lengths from Math.random, so the same
// preset can come out 64 ms one time and half a second the next. The coin is
// the one the course describes by duration ("about a fifth of a second"), so
// its envelope is pinned here. Everything else keeps jsfxr's variation.
export const ENVELOPE_TWEAKS: Record<string, Record<string, number>> = {
  pickupCoin: { p_env_sustain: 0.08, p_env_decay: 0.3 },
};

export function clampParam(key: string, value: unknown): number {
  const spec = SPEC_BY_KEY.get(key);
  const n = Number(value);
  if (!spec) return Number.isFinite(n) ? n : 0;
  if (!Number.isFinite(n)) return spec.min;
  return Math.max(spec.min, Math.min(spec.max, n));
}

/**
 * A plain, editable definition for one preset.
 *
 * `sfxr.generate` returns a Params instance whose own fields are all we need;
 * spreading it into a plain object keeps the mixer's state serialisable (and
 * therefore saveable and reloadable) without carrying jsfxr methods around.
 */
export function paramsFromPreset(preset: string): SfxrParams {
  const generated = sfxr.generate(preset, {
    sound_vol: 0.25,
    sample_size: 8,
    sample_rate: SFX_SAMPLE_RATE,
  }) as SfxrParams;
  Object.assign(generated, ENVELOPE_TWEAKS[preset] ?? {});
  const def: SfxrParams = { ...generated, wave_type: Math.floor(Number(generated.wave_type) || 0) };
  for (const spec of PARAM_SPECS) def[spec.key] = clampParam(spec.key, def[spec.key]);
  return def;
}

/** Nudge a few random controls, keeping every value inside its spec range. */
export function mutateDef(def: SfxrParams): SfxrParams {
  const next: SfxrParams = { ...def };
  const count = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    const spec = PARAM_SPECS[Math.floor(Math.random() * PARAM_SPECS.length)];
    const current = Number(next[spec.key]) || 0;
    // jsfxr's own mutate() nudges by up to 0.05 per field. A slightly larger
    // step is audible as "different" without throwing away the character.
    const delta = (Math.random() * 2 - 1) * 0.12;
    next[spec.key] = clampParam(spec.key, current + delta);
  }
  if (Math.random() < 0.15) next.wave_type = Math.floor(Math.random() * WAVE_SHAPES.length);
  return next;
}

/**
 * A stable identity for one definition, used as a render-cache key and as the
 * React dependency that redraws the waveform. Only the fields that affect the
 * sound are included; `sound_vol` and the sample rate are fixed by the mixer.
 */
export function defKey(def: SfxrParams): string {
  const parts = PARAM_SPECS.map((s) => `${s.key}=${Number(def[s.key]) || 0}`);
  parts.push(`wave=${Math.floor(Number(def.wave_type) || 0)}`);
  return parts.join('|');
}
