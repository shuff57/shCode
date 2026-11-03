// WAV encoding for the sound mixer.
//
// jsfxr already emits a WAV data URI, so this file exists for the other half:
// ZzFXM returns [left, right] Float32Arrays and has no file format of its own.
// The mixer turns those into the same thing loadSound() expects — a URL that
// fetch() can read and decodeAudioData() can decode. A data: URI is that URL.
//
// 8-bit PCM is deliberate. It is what the course means by "8-bit", it keeps a
// five-second loop small enough to live in the same localStorage store as the
// saved textures, and it matches jsfxr's own output so the two halves sound
// like one palette.

export type WavBits = 8 | 16;

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

/**
 * Encode Float32 samples (one array per channel, each -1..1) as a WAV file.
 *
 * Channels are interleaved in the data chunk. 8-bit WAV samples are unsigned
 * (0..255, with 128 as silence) while 16-bit samples are signed little-endian;
 * getting that backwards is the classic "it plays, but as a wall of fuzz".
 */
export function encodeWav(
  channels: Float32Array[],
  sampleRate: number,
  bits: WavBits = 8
): Uint8Array {
  const channelCount = Math.max(1, channels.length);
  const frameCount = channels[0]?.length ?? 0;
  const bytesPerSample = bits / 8;
  const blockAlign = channelCount * bytesPerSample;
  const dataBytes = frameCount * blockAlign;
  const out = new Uint8Array(44 + dataBytes);
  const view = new DataView(out.buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, 'WAVE');

  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);          // fmt chunk size
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bits, true);

  writeAscii(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  let o = 44;
  for (let f = 0; f < frameCount; f++) {
    for (let c = 0; c < channelCount; c++) {
      const sample = channels[c]?.[f] ?? 0;
      const clamped = sample < -1 ? -1 : sample > 1 ? 1 : sample;
      if (bits === 8) {
        out[o++] = Math.round((clamped * 0.5 + 0.5) * 255);
      } else {
        const v = Math.round(clamped * 32767);
        out[o++] = v & 0xff;
        out[o++] = (v >> 8) & 0xff;
      }
    }
  }
  return out;
}

/** The URL form loadSound() takes. Works in the browser and in Node. */
export function wavDataUri(bytes: Uint8Array): string {
  let b64: string;
  if (typeof btoa === 'function') {
    let binary = '';
    // Chunked so a long music loop does not blow the argument limit.
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    b64 = btoa(binary);
  } else {
    // Node (the palette generator). `Buffer` is not in the DOM lib, hence the
    // indirection rather than a direct reference TypeScript would reject.
    const B = (globalThis as unknown as { Buffer?: { from(b: Uint8Array): { toString(enc: string): string } } }).Buffer;
    b64 = B ? B.from(bytes).toString('base64') : '';
  }
  return 'data:audio/wav;base64,' + b64;
}

/** Bytes behind a data: URI, for writing a palette file from the generator. */
export function dataUriBytes(dataUri: string): Uint8Array {
  const comma = dataUri.indexOf(',');
  if (comma < 0) return new Uint8Array();
  const meta = dataUri.slice(0, comma);
  const body = dataUri.slice(comma + 1);
  if (meta.includes(';base64')) {
    if (typeof atob === 'function') {
      const binary = atob(body);
      const out = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
      return out;
    }
    const B = (globalThis as unknown as { Buffer?: { from(s: string, enc: string): Uint8Array } }).Buffer;
    return B ? new Uint8Array(B.from(body, 'base64')) : new Uint8Array();
  }
  return new TextEncoder().encode(decodeURIComponent(body));
}

/**
 * Average every `step` samples. A plain "take every Nth" decimates a square
 * wave into aliasing hiss; averaging is a one-pole low-pass and keeps the
 * chiptune shape without the fizz.
 */
export function downsample(channels: Float32Array[], from: number, to: number): Float32Array[] {
  if (to >= from) return channels.map((c) => c.slice());
  const step = from / to;
  return channels.map((channel) => {
    const length = Math.floor(channel.length / step);
    const out = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      const start = Math.floor(i * step);
      const end = Math.min(channel.length, Math.floor((i + 1) * step));
      let sum = 0;
      for (let j = start; j < end; j++) sum += channel[j];
      out[i] = end > start ? sum / (end - start) : 0;
    }
    return out;
  });
}

/** Mix stereo down to one channel, so a saved loop is half the bytes. */
export function toMono(channels: Float32Array[]): Float32Array {
  if (channels.length <= 1) return channels[0] ?? new Float32Array();
  const length = channels[0].length;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (const c of channels) sum += c[i] ?? 0;
    out[i] = sum / channels.length;
  }
  return out;
}
