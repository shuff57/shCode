// ChaCha20-Poly1305 (RFC 8439), synchronous, for the work kept in this browser
// (lib/owned-storage.ts). Synchronous because every read of stored work is synchronous and
// crypto.subtle is not; first-party because the repo's package managers would not add a library
// without rewriting the lockfiles. It is not clever: it follows the RFC line by line, and
// scripts/test-work-cipher.mjs checks it against the RFC's own vectors and, on random inputs in
// both directions, against Node's built-in chacha20-poly1305.
//
// What it is for, and what it is not: it keeps an account's stored work unreadable on a computer
// once that account's page no longer holds the key (signed out, session ended, tab closed). It
// does not protect against the person using the account while it is signed in.
//
// sealed = nonce (12 bytes, random) | ciphertext | tag (16 bytes)

const SIGMA = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574];

function rotl(v: number, n: number): number {
  return (v << n) | (v >>> (32 - n));
}

function quarter(x: Uint32Array, a: number, b: number, c: number, d: number): void {
  x[a] = (x[a] + x[b]) | 0; x[d] = rotl(x[d] ^ x[a], 16);
  x[c] = (x[c] + x[d]) | 0; x[b] = rotl(x[b] ^ x[c], 12);
  x[a] = (x[a] + x[b]) | 0; x[d] = rotl(x[d] ^ x[a], 8);
  x[c] = (x[c] + x[d]) | 0; x[b] = rotl(x[b] ^ x[c], 7);
}

function le32(b: Uint8Array, i: number): number {
  return (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
}

/** One 64-byte keystream block (RFC 8439 2.3) into `out`. */
function block(key: Uint8Array, counter: number, nonce: Uint8Array, out: Uint8Array, state: Uint32Array, work: Uint32Array): void {
  state[0] = SIGMA[0]; state[1] = SIGMA[1]; state[2] = SIGMA[2]; state[3] = SIGMA[3];
  for (let i = 0; i < 8; i++) state[4 + i] = le32(key, i * 4);
  state[12] = counter >>> 0;
  state[13] = le32(nonce, 0); state[14] = le32(nonce, 4); state[15] = le32(nonce, 8);
  work.set(state);
  for (let i = 0; i < 10; i++) {
    quarter(work, 0, 4, 8, 12); quarter(work, 1, 5, 9, 13); quarter(work, 2, 6, 10, 14); quarter(work, 3, 7, 11, 15);
    quarter(work, 0, 5, 10, 15); quarter(work, 1, 6, 11, 12); quarter(work, 2, 7, 8, 13); quarter(work, 3, 4, 9, 14);
  }
  for (let i = 0; i < 16; i++) {
    const v = (work[i] + state[i]) >>> 0;
    out[i * 4] = v & 0xff; out[i * 4 + 1] = (v >>> 8) & 0xff; out[i * 4 + 2] = (v >>> 16) & 0xff; out[i * 4 + 3] = (v >>> 24) & 0xff;
  }
}

/** ChaCha20 (RFC 8439 2.4): XOR `data` with the keystream starting at block `counter`. */
export function chacha20(key: Uint8Array, counter: number, nonce: Uint8Array, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length);
  const ks = new Uint8Array(64);
  const state = new Uint32Array(16);
  const work = new Uint32Array(16);
  for (let off = 0; off < data.length; off += 64) {
    block(key, counter++, nonce, ks, state, work);
    const n = Math.min(64, data.length - off);
    for (let i = 0; i < n; i++) out[off + i] = data[off + i] ^ ks[i];
  }
  return out;
}

/** 130 bits of little-endian bytes as ten 13-bit limbs. */
function limbs13(b: Uint8Array, out: Float64Array): void {
  let acc = 0;
  let bits = 0;
  let at = 0;
  for (let i = 0; i < 10; i++) {
    while (bits < 13 && at < b.length) { acc += b[at++] * 2 ** bits; bits += 8; }
    out[i] = acc % 8192;
    acc = Math.floor(acc / 8192);
    bits -= 13;
  }
}

/**
 * Poly1305 (RFC 8439 2.5) with a 32-byte one-time key. The 130-bit numbers are ten 13-bit limbs,
 * so every product is below 2^30 and every sum below 2^34: plain numbers are exact. Checked
 * against the RFC vector and against Node on random inputs (scripts/test-work-cipher.mjs).
 */
export function poly1305(key: Uint8Array, msg: Uint8Array): Uint8Array {
  const rb = key.slice(0, 16);
  rb[3] &= 15; rb[7] &= 15; rb[11] &= 15; rb[15] &= 15;
  rb[4] &= 252; rb[8] &= 252; rb[12] &= 252;
  const r = new Float64Array(10);
  limbs13(rb, r);
  const r5 = new Float64Array(10);
  for (let i = 0; i < 10; i++) r5[i] = r[i] * 5;
  const h = new Float64Array(10);
  const n = new Float64Array(10);
  const d = new Float64Array(10);
  const buf = new Uint8Array(17);
  for (let off = 0; off < msg.length; off += 16) {
    const len = Math.min(16, msg.length - off);
    // The block as a number with one extra 1 byte after its last byte (RFC 8439 2.5.1).
    if (len === 16) {
      // A full block, straight from four 32-bit words (the same limbs limbs13 would give).
      const w0 = le32(msg, off), w1 = le32(msg, off + 4), w2 = le32(msg, off + 8), w3 = le32(msg, off + 12);
      h[0] += w0 & 0x1fff;
      h[1] += (w0 >>> 13) & 0x1fff;
      h[2] += ((w0 >>> 26) | (w1 << 6)) & 0x1fff;
      h[3] += (w1 >>> 7) & 0x1fff;
      h[4] += ((w1 >>> 20) | (w2 << 12)) & 0x1fff;
      h[5] += (w2 >>> 1) & 0x1fff;
      h[6] += (w2 >>> 14) & 0x1fff;
      h[7] += ((w2 >>> 27) | (w3 << 5)) & 0x1fff;
      h[8] += (w3 >>> 8) & 0x1fff;
      h[9] += (w3 >>> 21) | 0x800;
    } else {
      buf.fill(0);
      buf.set(msg.subarray(off, off + len));
      buf[len] = 1;
      limbs13(buf, n);
      for (let i = 0; i < 10; i++) h[i] += n[i];
    }
    // h * r mod 2^130 - 5: a limb past the tenth wraps round multiplied by 5.
    d.fill(0);
    for (let i = 0; i < 10; i++) {
      const hi = h[i];
      const split = 10 - i;
      for (let j = 0; j < split; j++) d[i + j] += hi * r[j];
      for (let j = split; j < 10; j++) d[i + j - 10] += hi * r5[j];
    }
    let c = 0;
    for (let k = 0; k < 10; k++) {
      const v = d[k] + c;
      c = Math.floor(v / 8192);
      h[k] = v % 8192;
    }
    h[0] += c * 5;
    c = Math.floor(h[0] / 8192);
    h[0] %= 8192;
    h[1] += c;
  }
  // Carry fully (twice covers the wrap), then subtract p once if h >= p.
  for (let pass = 0; pass < 2; pass++) {
    let c = 0;
    for (let k = 0; k < 10; k++) {
      const v = h[k] + c;
      c = Math.floor(v / 8192);
      h[k] = v % 8192;
    }
    h[0] += c * 5;
  }
  let acc = 0n;
  for (let k = 9; k >= 0; k--) acc = (acc << 13n) | BigInt(h[k]);
  const p = (1n << 130n) - 5n;
  acc %= p;
  let sum = (acc + leNum(key, 16, 32)) & ((1n << 128n) - 1n);
  const tag = new Uint8Array(16);
  for (let i = 0; i < 16; i++) { tag[i] = Number(sum & 0xffn); sum >>= 8n; }
  return tag;
}

function leNum(b: Uint8Array, from: number, to: number): bigint {
  let v = 0n;
  for (let i = to - 1; i >= from; i--) v = (v << 8n) | BigInt(b[i]);
  return v;
}

function macData(aad: Uint8Array, ct: Uint8Array): Uint8Array {
  const pad = (n: number) => (16 - (n % 16)) % 16;
  const out = new Uint8Array(aad.length + pad(aad.length) + ct.length + pad(ct.length) + 16);
  out.set(aad, 0);
  const at = aad.length + pad(aad.length);
  out.set(ct, at);
  const tail = at + ct.length + pad(ct.length);
  // Lengths as 64-bit little-endian; these inputs are far below 2^32 bytes.
  new DataView(out.buffer).setUint32(tail, aad.length, true);
  new DataView(out.buffer).setUint32(tail + 8, ct.length, true);
  return out;
}

function tagFor(key: Uint8Array, nonce: Uint8Array, aad: Uint8Array, ct: Uint8Array): Uint8Array {
  const otk = chacha20(key, 0, nonce, new Uint8Array(32));
  return poly1305(otk, macData(aad, ct));
}

/** AEAD seal (RFC 8439 2.8). Returns ciphertext | tag. `key` 32 bytes, `nonce` 12 bytes. */
export function aeadSeal(key: Uint8Array, nonce: Uint8Array, plain: Uint8Array, aad: Uint8Array): Uint8Array {
  if (key.length !== 32 || nonce.length !== 12) throw new Error('work-cipher: bad key or nonce length');
  const ct = chacha20(key, 1, nonce, plain);
  const out = new Uint8Array(ct.length + 16);
  out.set(ct, 0);
  out.set(tagFor(key, nonce, aad, ct), ct.length);
  return out;
}

/** AEAD open. Null when the tag does not match (wrong key, or the bytes were changed). */
export function aeadOpen(key: Uint8Array, nonce: Uint8Array, sealed: Uint8Array, aad: Uint8Array): Uint8Array | null {
  if (key.length !== 32 || nonce.length !== 12 || sealed.length < 16) return null;
  const ct = sealed.subarray(0, sealed.length - 16);
  const tag = sealed.subarray(sealed.length - 16);
  const want = tagFor(key, nonce, aad, ct);
  let diff = 0;
  for (let i = 0; i < 16; i++) diff |= want[i] ^ tag[i];
  if (diff !== 0) return null;
  return chacha20(key, 1, nonce, ct);
}

// ---- text in, text out ------------------------------------------------------------------------

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_CODES = (() => { const t = new Uint8Array(64); for (let i = 0; i < 64; i++) t[i] = B64.charCodeAt(i); return t; })();

/** Standard base64 with padding (what atob reads), built as bytes so a megabyte costs milliseconds. */
export function toBase64(bytes: Uint8Array): string {
  const n = bytes.length;
  const out = new Uint8Array(Math.ceil(n / 3) * 4);
  let o = 0;
  let i = 0;
  for (; i + 2 < n; i += 3) {
    const v = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out[o++] = B64_CODES[v >>> 18]; out[o++] = B64_CODES[(v >>> 12) & 63]; out[o++] = B64_CODES[(v >>> 6) & 63]; out[o++] = B64_CODES[v & 63];
  }
  if (i < n) {
    const two = i + 1 < n;
    const v = (bytes[i] << 16) | (two ? bytes[i + 1] << 8 : 0);
    out[o++] = B64_CODES[v >>> 18]; out[o++] = B64_CODES[(v >>> 12) & 63];
    out[o++] = two ? B64_CODES[(v >>> 6) & 63] : 61; out[o++] = 61;
  }
  // Every byte is an ASCII character, so UTF-8 decoding is exact.
  return new TextDecoder().decode(out);
}
export function fromBase64(text: string): Uint8Array | null {
  try {
    const bin = atob(text);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/**
 * Seal a string. `bind` ties the result to where it is stored (the full storage key), so a
 * sealed record copied under another key does not open there.
 */
export function sealText(key: Uint8Array, text: string, bind: string, random: (n: number) => Uint8Array): string {
  const enc = new TextEncoder();
  const nonce = random(12);
  const sealed = aeadSeal(key, nonce, enc.encode(text), enc.encode(bind));
  const out = new Uint8Array(12 + sealed.length);
  out.set(nonce, 0);
  out.set(sealed, 12);
  return toBase64(out);
}

/** Open what sealText made. Null when it does not open with this key at this place. */
export function openText(key: Uint8Array, sealedB64: string, bind: string): string | null {
  const all = fromBase64(sealedB64);
  if (!all || all.length < 28) return null;
  const plain = aeadOpen(key, all.subarray(0, 12), all.subarray(12), new TextEncoder().encode(bind));
  if (!plain) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(plain);
  } catch {
    return null;
  }
}
