// Tests for student image uploads.
//
// The interesting surface is small and pure: what counts as an image, what
// counts as an id, and how a filename is sanitised. That is also where the
// security actually lives — everything downstream trusts sniffImageType() to
// have refused anything that is not inert raster data, because whatever gets
// stored is later served from our own origin.
//
// The happy path here is nearly worthless. The cases that matter are the
// adversarial ones: a renamed .html, an SVG, a polyglot, a truncated header.
//
// Run: node scripts/test-uploads.mjs   (also part of `npm test`)

import {
  ALLOWED_TYPES,
  MAX_UPLOAD_BYTES,
  QUOTA_BYTES,
  QUOTA_FILES,
  extensionFor,
  isUploadId,
  newUploadId,
  safeFilename,
  sniffImageType,
} from '../functions/_shared/uploads.ts';

let pass = 0;
const fails = [];
function ok(name, cond, detail = '') {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fails.push(name + (detail ? ' — ' + detail : '')); console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
}

const bytes = (...n) => new Uint8Array(n);
const pad = (head, len = 32) => {
  const b = new Uint8Array(len);
  b.set(head);
  return b;
};
const ascii = (s) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));

console.log('\n=== real formats are recognised ===');
ok('PNG', sniffImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) === 'image/png');
ok('JPEG', sniffImageType(pad([0xff, 0xd8, 0xff, 0xe0])) === 'image/jpeg');
ok('GIF87a', sniffImageType(pad([...ascii('GIF87a')])) === 'image/gif');
ok('GIF89a', sniffImageType(pad([...ascii('GIF89a')])) === 'image/gif');
{
  const webp = new Uint8Array(32);
  webp.set(ascii('RIFF'), 0);
  webp.set(ascii('WEBP'), 8);
  ok('WebP', sniffImageType(webp) === 'image/webp');
}

console.log('\n=== things that must be refused ===');
// This is the whole point of sniffing: the client controls the filename and
// the Content-Type header, so neither can be trusted.
ok('HTML renamed to .png', sniffImageType(pad([...ascii('<!DOCTYPE html><script>')])) === null);
ok('a bare script tag', sniffImageType(pad([...ascii('<script>alert(1)</script>')])) === null);
ok('SVG (a document, can carry script)', sniffImageType(pad([...ascii('<svg xmlns="http://www.w')])) === null);
ok('SVG with an XML prolog', sniffImageType(pad([...ascii('<?xml version="1.0"?><svg')])) === null);
ok('a PDF', sniffImageType(pad([...ascii('%PDF-1.7')])) === null);
ok('a ZIP / docx / jar', sniffImageType(pad([0x50, 0x4b, 0x03, 0x04])) === null);
ok('a Windows executable', sniffImageType(pad([0x4d, 0x5a, 0x90, 0x00])) === null);
ok('an ELF binary', sniffImageType(pad([0x7f, ...ascii('ELF')])) === null);
ok('empty input', sniffImageType(new Uint8Array(0)) === null);
ok('too short to identify', sniffImageType(bytes(0x89, 0x50, 0x4e)) === null, 'a truncated PNG header must not pass');

// A near-miss on each signature — one wrong byte must fail, or the check is
// matching something looser than it claims.
ok('PNG with one byte wrong', sniffImageType(pad([0x89, 0x50, 0x4e, 0x48, 0x0d, 0x0a, 0x1a, 0x0a])) === null);
ok('GIF with a bad version', sniffImageType(pad([...ascii('GIF88a')])) === null);
{
  const notWebp = new Uint8Array(32);
  notWebp.set(ascii('RIFF'), 0);
  notWebp.set(ascii('WAVE'), 8); // RIFF container, but audio
  ok('RIFF that is not WebP (a .wav)', sniffImageType(notWebp) === null);
}
{
  // Polyglot: valid GIF header, HTML immediately after. Real technique for
  // smuggling script past a naive filter. We accept it AS A GIF — which is
  // safe only because the serve route pins Content-Type from this sniff and
  // sends nosniff, so the browser never parses it as markup.
  const poly = new Uint8Array(64);
  poly.set(ascii('GIF89a'), 0);
  poly.set(ascii('<script>alert(1)</script>'), 6);
  ok('GIF/HTML polyglot is typed as a GIF, not HTML', sniffImageType(poly) === 'image/gif',
    'it is served with an image Content-Type + nosniff, so it cannot execute');
}

console.log('\n=== ids are unguessable and validated ===');
{
  const ids = new Set();
  for (let i = 0; i < 2000; i++) ids.add(newUploadId());
  ok('2000 ids, no collisions', ids.size === 2000, `got ${ids.size}`);
  const one = newUploadId();
  ok('id is 32 hex chars (128 bits)', /^[0-9a-f]{32}$/.test(one), one);
  ok('isUploadId accepts a real id', isUploadId(one));
  // Since the id becomes an R2 key and a URL path, anything else must bounce.
  ok('rejects path traversal', !isUploadId('../../etc/passwd'));
  ok('rejects a slash', !isUploadId('abcd/efgh'));
  ok('rejects uppercase hex', !isUploadId('A'.repeat(32)), 'keys are lowercase; accepting both invites duplicates');
  ok('rejects the wrong length', !isUploadId('abc') && !isUploadId('a'.repeat(33)));
  ok('rejects empty', !isUploadId(''));
  ok('rejects a wildcard', !isUploadId('*'));
}

console.log('\n=== filenames are display-only, but still cleaned ===');
ok('keeps an ordinary name', safeFilename('my cat.png') === 'my cat.png');
ok('keeps punctuation', safeFilename('sprite-sheet_v2.final.png') === 'sprite-sheet_v2.final.png',
  'over-stripping makes listings unreadable for no gain');
ok('drops a unix path', safeFilename('/etc/passwd') === 'passwd');
ok('drops a windows path', safeFilename('C:\\Users\\me\\pic.png') === 'pic.png');
ok('strips control characters', safeFilename('a\u0000b\u001fc\u007f.png') === 'abc.png');
ok('caps the length', safeFilename('x'.repeat(500)).length <= 120);
ok('never returns empty', safeFilename('') === 'image' && safeFilename('\u0000') === 'image');

console.log('\n=== extensions and limits ===');
for (const t of ALLOWED_TYPES) {
  ok(`${t} maps to an extension`, /^(png|jpg|gif|webp)$/.test(extensionFor(t)), extensionFor(t));
}
ok('an unknown type does not become an extension', extensionFor('text/html') === 'bin');
ok('SVG is not on the allowlist', !ALLOWED_TYPES.includes('image/svg+xml'),
  'an SVG is a document and can carry script');
ok('per-file limit is sane', MAX_UPLOAD_BYTES > 0 && MAX_UPLOAD_BYTES <= 8 * 1024 * 1024);
ok('per-file limit fits inside the quota', MAX_UPLOAD_BYTES < QUOTA_BYTES);
ok('file-count quota is positive', QUOTA_FILES > 0);

console.log('\n=== serve route keeps its two load-bearing headers ===');
{
  // Asserted against the source: these two lines are the difference between
  // hosting images and hosting arbitrary content on our own origin, and a
  // future edit that drops one would otherwise be invisible.
  const { readFileSync } = await import('node:fs');
  const src = readFileSync('functions/uploads/[name].ts', 'utf8');
  ok('sets X-Content-Type-Options: nosniff', /X-Content-Type-Options'?\s*:\s*'nosniff'/.test(src));
  ok('pins Content-Type from stored metadata', /object\.httpMetadata\?\.contentType/.test(src));
  ok('re-checks the stored type against the allowlist', /ALLOWED_TYPES[\s\S]{0,80}includes\(stored\)/.test(src));
  ok('does not read a type from the request', !/request\.headers\.get\(['"]Content-Type/.test(src));
}

console.log('\n=== write route trusts bytes, not the client ===');
{
  const { readFileSync } = await import('node:fs');
  const src = readFileSync('functions/api/uploads/index.ts', 'utf8');
  ok('content type comes from sniffImageType', /const contentType = sniffImageType\(bytes\)/.test(src));
  ok('rejects when the sniff fails', /if \(!contentType\)/.test(src));
  ok('checks the real byte length, not just Content-Length', /bytes\.byteLength > MAX_UPLOAD_BYTES/.test(src));
  ok('enforces a quota before storing', /QUOTA_BYTES/.test(src) && /QUOTA_FILES/.test(src));
}
{
  const { readFileSync } = await import('node:fs');
  const src = readFileSync('functions/api/uploads/[id].ts', 'utf8');
  ok('delete scopes by owner in SQL, not in JS',
    /DELETE FROM uploads WHERE id = \? AND owner_email = \?/.test(src));
  ok('missing and not-yours both 404', (src.match(/'Not found'/g) || []).length >= 2,
    'distinguishing them would let a student probe which ids exist');
}

console.log('');
if (fails.length) {
  console.log(`FAIL — ${fails.length} of ${pass + fails.length} checks failed`);
  for (const f of fails) console.log('  - ' + f);
  process.exit(1);
}
console.log(`ALL PASS — ${pass} checks`);
