// Turn a short mouth recording into a starting jsfxr definition.
//
// This is signal analysis, not a cloud model: pitch, envelope, waveform shape
// and brightness are measured in this browser and fitted to the same knobs the
// Tweak panel exposes. That is the honest trade. A text model cannot reliably
// invent synthesis parameters from audio, while an autocorrelation and an RMS
// envelope can get close enough that the student then tweaks the last 20%.
//
// Nothing is uploaded. The UI decodes the recording to an AudioBuffer and
// passes the mono samples here.
//
// The two mappings were measured against the vendored engine, not guessed:
//
//   frequency   p_base_freq = sqrt(f0 * 6.25 / 22050 - 0.001)
//   envelope    seconds per stage = p^2 * (100000 / 44100)
//
// The first is the oscillator's own relationship (see sfxr.cjs's period
// formula and the measured table in scripts/test-sound-match.mjs). The second
// is the envelope length in samples scaled by the render rate.

import type { SfxrParams } from './vendor/jsfxr/sfxr.mjs';
import { clampParam } from './params';

export interface MatchResult {
  def: SfxrParams;
  /** Plain words for the UI: "rising", "short", "buzzy". */
  notes: string[];
  /** 0..1. Low means "this is a guess, tweak it". */
  confidence: number;
  /** The measurements behind the guess, for tests and the curious. */
  debug?: {
    f0: number;
    h2: number;
    h3: number;
    mag1: number;
    mag3: number;
    rate: number;
    harmonicity: number;
    voiced: number;
  };
}

const RENDER_RATE = 22050;
const ANALYSIS_RATE = 11025;
const SECONDS_PER_ENVELOPE_UNIT = 100000 / 44100; // 2.2676

/** The measured oscillator mapping: frequency = rate * (p^2 + 0.001) / 6.25. */
export function paramToFreq(p: number, rate = RENDER_RATE): number {
  return (rate * (p * p + 0.001)) / 6.25;
}

export function freqToParam(freq: number): number {
  if (!Number.isFinite(freq) || freq <= 0) return 0.02;
  return Math.max(0.02, Math.min(0.99, Math.sqrt((freq * 6.25) / RENDER_RATE - 0.001)));
}

/** An envelope stage of `seconds` maps to this jsfxr amount. */
export function secondsToParam(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.min(1, Math.sqrt(seconds / SECONDS_PER_ENVELOPE_UNIT));
}

function resampleLinear(input: Float32Array, from: number, to: number): Float32Array {
  if (to >= from || input.length === 0) return input;
  const step = from / to;
  const out = new Float32Array(Math.floor(input.length / step));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * step);
    const end = Math.min(input.length, Math.floor((i + 1) * step));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = end > start ? sum / (end - start) : 0;
  }
  return out;
}

function rms(frame: Float32Array, from: number, to: number): number {
  let sum = 0;
  for (let i = from; i < to; i++) sum += frame[i] * frame[i];
  return to > from ? Math.sqrt(sum / (to - from)) : 0;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Magnitude of one frequency in a short signal.
 *
 * The wave-shape choice uses harmonic RATIOS (2nd and 3rd against the
 * fundamental), which are amplitude-invariant. A mean-absolute heuristic read
 * a naturally decaying sine as a saw because its loud first half dominated.
 */
function goertzel(samples: Float32Array, rate: number, freq: number): number {
  const n = samples.length;
  if (n < 8 || !(freq > 0) || freq >= rate / 2) return 0;
  const w = (2 * Math.PI * freq) / rate;
  const coeff = 2 * Math.cos(w);
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < n; i++) {
    // Hann window: a rectangular window leaks enough to invent harmonics.
    const wnd = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    s0 = samples[i] * wnd + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - coeff * s1 * s2));
}

/**
 * The strongest magnitude near a harmonic. Autocorrelation reports f0 as
 * rate/lag, so it is quantized (about 18 Hz at 441 Hz); a 3rd-harmonic probe
 * at exactly 3*f0 can then miss the peak and read a square as a sine. The
 * search has to be fine (0.2%) as well as small: a 1% step missed the 1320 Hz
 * peak for a 440 Hz square and halved its 3rd-harmonic ratio.
 */
function harmonicMag(samples: Float32Array, rate: number, freq: number): number {
  let best = 0;
  for (let i = -15; i <= 15; i++) {
    best = Math.max(best, goertzel(samples, rate, freq * (1 + i * 0.002)));
  }
  return best;
}

interface PitchFrame {
  f0: number;
  strength: number;
  index: number;
}

function pitchFrame(frame: Float32Array, rate: number): PitchFrame | null {
  const minLag = Math.max(2, Math.floor(rate / 1200));
  const maxLag = Math.min(Math.floor(frame.length / 2), Math.ceil(rate / 60));
  if (maxLag <= minLag) return null;
  const n = frame.length - maxLag;
  if (n < minLag * 2) return null;

  let mean = 0;
  for (let i = 0; i < frame.length; i++) mean += frame[i];
  mean /= frame.length;

  const x = new Float32Array(frame.length);
  for (let i = 0; i < frame.length; i++) x[i] = frame[i] - mean;

  let energy0 = 0;
  for (let i = 0; i < n; i++) energy0 += x[i] * x[i];
  if (energy0 < 1e-9) return null;

  const corr = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let energyLag = 0;
    for (let i = 0; i < n; i++) {
      sum += x[i] * x[i + lag];
      energyLag += x[i + lag] * x[i + lag];
    }
    corr[lag] = energyLag > 1e-9 ? sum / Math.sqrt(energy0 * energyLag) : 0;
  }

  let best = 0;
  let bestLag = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (corr[lag] > best) {
      best = corr[lag];
      bestLag = lag;
    }
  }
  if (best < 0.3 || !bestLag) return null;

  // Prefer the SHORTEST strong peak. A harmonic-rich mouth sound has a strong
  // correlation at twice its period too; taking the global maximum there would
  // report the pitch an octave low.
  for (let lag = minLag + 1; lag < bestLag; lag++) {
    if (corr[lag] >= best * 0.9 && corr[lag] >= corr[lag - 1] && corr[lag] >= corr[lag + 1]) {
      bestLag = lag;
      break;
    }
  }

  return { f0: rate / bestLag, strength: best, index: 0 };
}

/**
 * Fit a recording to a jsfxr definition. Returns null when there is nothing
 * usable to fit (silence, or shorter than a click).
 */
export function matchRecording(input: Float32Array, sampleRate: number): MatchResult | null {
  if (!input.length || !(sampleRate > 0)) return null;

  const peak = input.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  if (peak < 0.015) return null;

  const rate = Math.min(ANALYSIS_RATE, sampleRate);
  const x = resampleLinear(input, sampleRate, rate);
  if (x.length < rate * 0.03) return null;

  // ---- trim to the sound -------------------------------------------------
  const win = Math.max(16, Math.floor(rate * 0.01));
  const windows: number[] = [];
  for (let i = 0; i + win <= x.length; i += win) windows.push(rms(x, i, i + win));
  const maxWindow = Math.max(...windows);
  if (maxWindow < 0.004) return null;
  const gate = maxWindow * 0.1;

  let first = 0;
  let last = windows.length - 1;
  while (first < windows.length && windows[first] < gate) first++;
  while (last > first && windows[last] < gate) last--;
  const margin = Math.floor(rate * 0.02);
  const start = Math.max(0, first * win - margin);
  const end = Math.min(x.length, (last + 1) * win + margin);
  const voiced = x.subarray(start, end);
  if (voiced.length < rate * 0.04) return null;
  const duration = voiced.length / rate;

  // ---- envelope ----------------------------------------------------------
  const envWin = Math.max(16, Math.floor(rate * 0.005));
  const env: number[] = [];
  for (let i = 0; i < voiced.length; i += envWin) {
    env.push(rms(voiced, i, Math.min(voiced.length, i + envWin)));
  }
  let peakEnv = 0;
  let peakIndex = 0;
  for (let i = 0; i < env.length; i++) {
    if (env[i] > peakEnv) {
      peakEnv = env[i];
      peakIndex = i;
    }
  }
  let sustainEnd = peakIndex;
  for (let i = peakIndex; i < env.length; i++) {
    if (env[i] >= peakEnv * 0.5) sustainEnd = i;
  }
  const averageEnv = env.reduce((a, b) => a + b, 0) / Math.max(1, env.length);
  const attack = (peakIndex * envWin) / rate;
  const sustain = Math.max(0, (sustainEnd - peakIndex) * envWin / rate);
  const decay = Math.max(0, (env.length - sustainEnd) * envWin / rate);
  const punch = Math.max(0, Math.min(1, ((peakEnv - averageEnv) / Math.max(peakEnv, 1e-6)) * 2));

  // ---- pitch -------------------------------------------------------------
  const frameLen = Math.floor(rate * 0.04);
  const hop = Math.floor(rate * 0.02);
  const pitch: PitchFrame[] = [];
  for (let i = 0; i + frameLen <= voiced.length; i += hop) {
    const frameRms = rms(voiced, i, i + frameLen);
    if (frameRms < peakEnv * 0.2) continue;
    const f = pitchFrame(voiced.subarray(i, i + frameLen), rate);
    if (f) pitch.push({ ...f, index: i });
  }

  const f0s = pitch.map((p) => p.f0);
  const medianF0 = median(f0s);
  const firstF0 = f0s.length ? (f0s[0] + (f0s[1] ?? f0s[0])) / 2 : 0;
  const lastF0 = f0s.length ? (f0s[f0s.length - 1] + (f0s[f0s.length - 2] ?? f0s[f0s.length - 1])) / 2 : 0;
  const harmonicity = pitch.length
    ? pitch.reduce((a, p) => a + p.strength, 0) / pitch.length
    : 0;
  const ratio = firstF0 > 0 && lastF0 > 0 ? lastF0 / firstF0 : 1;
  const freqRamp = Math.max(-1, Math.min(1, Math.sign(ratio - 1) * Math.cbrt(Math.abs(ratio - 1)) * 0.8));

  let vibStrength = 0;
  let vibSpeed = 0;
  if (f0s.length >= 5 && medianF0 > 0) {
    // Detrend first. A monotonic rise or fall is a slide, not vibrato; only
    // the residuals around a line describe a wobble. Without this, every
    // sweep looked like a 100% vibrato.
    const n = f0s.length;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let sxy = 0;
    for (let i = 0; i < n; i++) {
      sx += i;
      sy += f0s[i];
      sxx += i * i;
      sxy += i * f0s[i];
    }
    const denom = n * sxx - sx * sx;
    const slope = denom ? (n * sxy - sx * sy) / denom : 0;
    const intercept = (sy - slope * sx) / n;
    const residuals = f0s.map((v, i) => v - (intercept + slope * i));
    const residualMean = residuals.reduce((a, b) => a + b, 0) / n;
    const variance = residuals.reduce((a, b) => a + (b - residualMean) ** 2, 0) / n;
    const deviation = Math.sqrt(variance) / medianF0;
    let changes = 0;
    for (let i = 1; i < n; i++) {
      if ((residuals[i - 1] - residualMean) * (residuals[i] - residualMean) < 0) changes++;
    }
    const rateHz = changes / 2 / Math.max(0.05, duration);
    if (deviation > 0.03 && deviation < 0.6 && changes >= 2 && rateHz >= 2 && rateHz <= 15) {
      vibStrength = Math.max(0, Math.min(1, deviation * 6));
      vibSpeed = Math.max(0, Math.min(1, (rateHz - 2) / 10));
    }
  }

  // ---- waveform shape ----------------------------------------------------
  let mean = 0;
  for (let i = 0; i < voiced.length; i++) mean += voiced[i];
  mean /= voiced.length;

  const centered = new Float32Array(voiced.length);
  let sumSq = 0;
  let positive = 0;
  let diffSq = 0;
  for (let i = 0; i < voiced.length; i++) {
    const v = voiced[i] - mean;
    centered[i] = v;
    sumSq += v * v;
    if (v > 0) positive++;
    if (i > 0) diffSq += (v - centered[i - 1]) ** 2;
  }
  const positiveRatio = positive / voiced.length;
  const diffRatio = sumSq > 1e-9 ? diffSq / sumSq : 0;

  // A saw has a strong 2nd harmonic; a square has a strong 3rd and almost no
  // 2nd; a sine has neither. Ratios, not absolute amplitude, so a decaying
  // recording still classifies by its waveform.
  let h2 = 0;
  let h3 = 0;
  let mag1 = 0;
  let mag3 = 0;
  if (medianF0 > 0) {
    mag1 = harmonicMag(centered, rate, medianF0);
    if (mag1 > 1e-9) {
      h2 = harmonicMag(centered, rate, medianF0 * 2) / mag1;
      mag3 = harmonicMag(centered, rate, medianF0 * 3);
      h3 = mag3 / mag1;
    }
  }

  let waveType: number;
  if (pitch.length < 2 || harmonicity < 0.3) waveType = 3; // noise
  else if (h2 > 0.22) waveType = 1; // saw
  else if (h3 > 0.22) waveType = 0; // square
  else waveType = 2; // sine

  const duty = waveType === 0
    ? Math.max(0, Math.min(1, 1 - 2 * Math.min(positiveRatio, 1 - positiveRatio)))
    : 0;
  const lpf = Math.max(0.7, Math.min(1, 0.7 + diffRatio * 4));
  const hpf = waveType === 3 ? 0.25 : 0;

  const def: SfxrParams = {
    oldParams: true,
    wave_type: waveType,
    p_env_attack: secondsToParam(attack),
    p_env_sustain: secondsToParam(sustain),
    p_env_punch: punch,
    p_env_decay: secondsToParam(decay),
    p_base_freq: freqToParam(medianF0),
    p_freq_limit: 0,
    p_freq_ramp: freqRamp,
    p_freq_dramp: 0,
    p_vib_strength: vibStrength,
    p_vib_speed: vibSpeed,
    p_arp_mod: 0,
    p_arp_speed: 0,
    p_duty: duty,
    p_duty_ramp: 0,
    p_repeat_speed: 0,
    p_pha_offset: 0,
    p_pha_ramp: 0,
    p_lpf_freq: lpf,
    p_lpf_ramp: 0,
    p_lpf_resonance: 0,
    p_hpf_freq: hpf,
    p_hpf_ramp: 0,
    sound_vol: 0.25,
    sample_rate: RENDER_RATE,
    sample_size: 8,
  };

  // Nothing can put a fitted value outside the slider it lands on.
  for (const key of Object.keys(def)) {
    if (key.startsWith('p_')) def[key] = clampParam(key, def[key]);
  }

  const notes: string[] = [];
  notes.push(ratio > 1.15 ? 'rising' : ratio < 0.87 ? 'falling' : 'steady');
  notes.push(duration < 0.15 ? 'short' : duration > 0.8 ? 'long' : 'medium');
  notes.push(waveType === 3 ? 'noisy' : waveType === 0 ? 'square' : waveType === 1 ? 'buzzy' : 'round');
  if (vibStrength > 0.05) notes.push('wobbly');

  const confidence = Math.max(
    0.15,
    Math.min(0.95, 0.1 + harmonicity * 0.6 + Math.min(0.25, pitch.length / 40))
  );

  return {
    def,
    notes,
    confidence,
    debug: { f0: medianF0, h2, h3, mag1, mag3, rate, harmonicity, voiced: voiced.length },
  };
}
