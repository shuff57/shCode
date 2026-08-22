// GET /uploads/:id.:ext — serve a stored image. NO AUTH.
//
// Deliberately outside /api/, so functions/_middleware.ts lets it through
// (its first line returns next() for anything not under /api/).
//
// It has to be unauthenticated. The sketch iframe in
// components/ShPlayPreview.tsx is sandboxed WITHOUT allow-same-origin, on
// purpose, so student code cannot call /api/* as the signed-in student. An
// opaque-origin document is cross-site for cookie purposes and the session
// cookie is SameSite=Lax, so it is never sent — an auth-gated image URL
// would 401 inside every sketch that used it.
//
// The access control is therefore the id itself: 128 bits of CSPRNG, so the
// URL is a capability. Unlisted and unguessable, but anyone holding the link
// can fetch it. That tradeoff was made explicitly; see
// migrations/0015_uploads.sql.
//
// DIRECTIVE: two things here are load-bearing and must not be relaxed.
//   1. Content-Type is read from R2's stored metadata, which the write route
//      set from a MAGIC-BYTE sniff — never from the request, the filename,
//      or the extension in the URL.
//   2. X-Content-Type-Options: nosniff. Without it a browser may sniff a
//      crafted file as HTML and run it on our origin, which is stored XSS
//      against every signed-in user who opens the link.

import { ALLOWED_TYPES, isUploadId } from '../_shared/uploads';

interface Env {
  UPLOADS: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params, request } = context;

  if (!env.UPLOADS) return new Response('Not found', { status: 404 });

  // The extension in the URL is cosmetic — it makes the link look like an
  // image to humans and to editors that guess by suffix. The id is the key.
  const raw = decodeURIComponent(String((params as { name?: string }).name || ''));
  const id = raw.split('.')[0];
  if (!isUploadId(id)) return new Response('Not found', { status: 404 });

  const object = await env.UPLOADS.get(id);
  if (!object) return new Response('Not found', { status: 404 });

  const stored = object.httpMetadata?.contentType || '';
  // Refuse to serve anything whose stored type is not on the allowlist, even
  // though the write route is the only thing that can create these objects.
  // If a bucket is ever populated by another path, this is the backstop that
  // stops it becoming a way to host arbitrary content on our origin.
  const contentType = (ALLOWED_TYPES as readonly string[]).includes(stored) ? stored : null;
  if (!contentType) return new Response('Not found', { status: 404 });

  // `no-cache` means "reuse the bytes, but check with me first" — not "don't
  // cache". With the ETag below, a repeat load is a 304 with no body, so the
  // bandwidth saving is kept.
  //
  // This started as `max-age=31536000, immutable`, which is what you want for
  // a content-addressed URL: a given id's bytes never change. Measured in a
  // real browser, that was wrong in the one case that matters — after the
  // owner deleted an image, their browser kept serving it from cache. The R2
  // object was genuinely gone (a cache-busted request 404s), but `immutable`
  // tells the browser not to revalidate for a YEAR, so the student who
  // deleted it would keep seeing it. `immutable` promises the response will
  // not change; deletion changes it to a 404, so the promise was false.
  const headers = new Headers({
    'Content-Type': contentType,
    'Cache-Control': 'public, no-cache',
    'X-Content-Type-Options': 'nosniff',
    // Belt and braces: even if a browser somehow treated this as a document,
    // this CSP leaves it nothing to execute.
    'Content-Security-Policy': "default-src 'none'; sandbox",
    ETag: object.httpEtag,
  });

  if (request.headers.get('If-None-Match') === object.httpEtag) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(object.body, { headers });
};
