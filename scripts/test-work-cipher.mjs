// lib/work-cipher.ts is a first-party ChaCha20-Poly1305. This proves it is the real thing:
//  * the RFC 8439 test vectors (ChaCha20 2.4.2, Poly1305 2.5.2, the AEAD 2.8.2);
//  * against Node's built-in chacha20-poly1305, on random keys, nonces, associated data and
//    lengths (block boundaries included), in both directions;
//  * a changed byte, a wrong key, a wrong place or a wrong nonce never opens.
//
// Run: node --import ./scripts/register-ts.mjs scripts/test-work-cipher.mjs

import assert from 'node:assert/strict';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { aeadOpen, aeadSeal, chacha20, fromBase64, openText, poly1305, sealText, toBase64 } from '../lib/work-cipher.ts';

const hex = (s) => Uint8Array.from(Buffer.from(s.replace(/\s+/g, ''), 'hex'));
const toHex = (b) => Buffer.from(b).toString('hex');
let n = 0;
const ok = (name) => { n++; console.log(`PASS  ${name}`); };

// RFC 8439 2.4.2
{
  const key = hex('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f');
  const nonce = hex('000000000000004a00000000');
  const text = new TextEncoder().encode("Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it.");
  assert.equal(toHex(chacha20(key, 1, nonce, text)),
    '6e2e359a2568f98041ba0728dd0d6981e97e7aec1d4360c20a27afccfd9fae0bf91b65c5524733ab8f593dabcd62b3571639d624e65152ab8f530c359f0861d807ca0dbf500d6a6156a38e088a22b65e52bc514d16ccf806818ce91ab77937365af90bbf74a35be6b40b8eedf2785e42874d');
  ok('RFC 8439 2.4.2 ChaCha20 encryption');
}
// RFC 8439 2.5.2
{
  const key = hex('85d6be7857556d337f4452fe42d506a80103808afb0db2fd4abff6af4149f51b');
  assert.equal(toHex(poly1305(key, new TextEncoder().encode('Cryptographic Forum Research Group'))), 'a8061dc1305136c6c22b8baf0c0127a9');
  ok('RFC 8439 2.5.2 Poly1305 tag');
}
// RFC 8439 2.8.2
{
  const key = hex('808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f');
  const nonce = hex('070000004041424344454647');
  const aad = hex('50515253c0c1c2c3c4c5c6c7');
  const text = new TextEncoder().encode("Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it.");
  const sealed = aeadSeal(key, nonce, text, aad);
  assert.equal(toHex(sealed),
    'd31a8d34648e60db7b86afbc53ef7ec2a4aded51296e08fea9e2b5a736ee62d63dbea45e8ca9671282fafb69da92728b1a71de0a9e060b2905d6a5b67ecd3b3692ddbd7f2d778b8c9803aee328091b58fab324e4fad675945585808b4831d7bc3ff4def08e4b7a9de576d26586cec64b6116'
    + '1ae10b594f09e26a7e902ecbd0600691');
  assert.deepEqual(aeadOpen(key, nonce, sealed, aad), text);
  ok('RFC 8439 2.8.2 AEAD seal and open');
}

// Against Node's implementation, both directions, lengths around every block boundary.
{
  const lengths = [0, 1, 15, 16, 17, 31, 32, 33, 63, 64, 65, 127, 128, 129, 255, 256, 1000, 4096, 70000];
  for (const len of lengths) {
    for (const aadLen of [0, 5, 16, 33]) {
      const key = randomBytes(32); const nonce = randomBytes(12); const plain = randomBytes(len); const aad = randomBytes(aadLen);
      const c = createCipheriv('chacha20-poly1305', key, nonce, { authTagLength: 16 });
      c.setAAD(aad, { plaintextLength: len });
      const theirs = Buffer.concat([c.update(plain), c.final(), c.getAuthTag()]);
      const ours = aeadSeal(key, nonce, plain, aad);
      assert.equal(toHex(ours), theirs.toString('hex'), `seal differs at length ${len}, aad ${aadLen}`);
      // Node opens ours...
      const d = createDecipheriv('chacha20-poly1305', key, nonce, { authTagLength: 16 });
      d.setAAD(aad, { plaintextLength: len });
      d.setAuthTag(Buffer.from(ours.subarray(ours.length - 16)));
      assert.equal(Buffer.concat([d.update(Buffer.from(ours.subarray(0, ours.length - 16))), d.final()]).toString('hex'), plain.toString('hex'));
      // ...and we open Node's.
      assert.equal(toHex(aeadOpen(key, nonce, theirs, aad)), plain.toString('hex'));
    }
  }
  ok(`matches Node's chacha20-poly1305 on ${lengths.length * 4} random cases, sealing and opening`);
}

// Nothing opens that should not.
{
  const key = randomBytes(32); const nonce = randomBytes(12); const aad = randomBytes(9);
  const sealed = aeadSeal(key, nonce, randomBytes(100), aad);
  for (let i = 0; i < sealed.length; i += 7) {
    const bad = Uint8Array.from(sealed); bad[i] ^= 1;
    assert.equal(aeadOpen(key, nonce, bad, aad), null, `a changed byte at ${i} opened`);
  }
  assert.equal(aeadOpen(randomBytes(32), nonce, sealed, aad), null);
  assert.equal(aeadOpen(key, randomBytes(12), sealed, aad), null);
  assert.equal(aeadOpen(key, nonce, sealed, randomBytes(9)), null);
  assert.equal(aeadOpen(key, nonce, sealed.subarray(0, 10), aad), null);
  assert.throws(() => aeadSeal(randomBytes(31), nonce, new Uint8Array(1), aad));
  ok('a changed byte, a wrong key, nonce or associated data, or a short input never opens');
}

// Text: every kind of string a student types, bound to where it is stored.
{
  const key = randomBytes(32);
  const random = (len) => randomBytes(len);
  const texts = ['', 'a', 'console.log("hi");\n', 'ñ é 你好 🎮 \u0000 \ud83d', 'x'.repeat(200000), JSON.stringify({ files: { 'script.js': 'let a = 1;\n'.repeat(500) } })];
  for (const t of texts) {
    const sealed = sealText(key, t, 'w1:owner:progress:L1', random);
    // A lone surrogate cannot round-trip through UTF-8; everything else must, exactly.
    const want = new TextDecoder().decode(new TextEncoder().encode(t));
    assert.equal(openText(key, sealed, 'w1:owner:progress:L1'), want);
    assert.equal(openText(key, sealed, 'w1:owner:progress:L2'), null, 'opened under another key name');
    assert.equal(openText(randomBytes(32), sealed, 'w1:owner:progress:L1'), null);
    assert.ok(!sealed.includes('console.log'));
  }
  const a = sealText(key, 'same', 'k', random); const b = sealText(key, 'same', 'k', random);
  assert.notEqual(a, b, 'two seals of the same text were identical (nonce reused)');
  assert.equal(openText(key, 'not base64 !!!', 'k'), null);
  assert.equal(openText(key, toBase64(new Uint8Array(5)), 'k'), null);
  assert.deepEqual(fromBase64(toBase64(Uint8Array.from([0, 255, 1, 254]))), Uint8Array.from([0, 255, 1, 254]));
  for (let len = 0; len < 70; len++) { const b = randomBytes(len); assert.equal(toBase64(b), b.toString('base64'), `base64 differs at length ${len}`); }
  ok('text round-trips exactly, is bound to its storage key, and never repeats');
}

console.log(`test-work-cipher: ${n} groups passed`);
