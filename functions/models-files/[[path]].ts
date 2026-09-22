// GET /models-files/[...path] — serve a staged AI-tutor safety model file
// from the shcode-uploads R2 bucket. NO AUTH, same reasoning as
// /uploads/[id]: the weights are public static assets, and the transformers.js
// worker inside the page (same-origin) fetches them with the browser's normal
// credential-less static-asset path.
//
// WHY R2 AT ALL. Cloudflare Pages rejects uploads over 25 MiB per file; the
// Prompt Guard ONNX is ~70 MB and the asyncify ORT wasm is ~26 MB. Those two
// cannot ship as static export files, so they live in R2 (no per-file cap)
// and this route streams them from the same origin.
//
// PATH SAFETY. The route serves raw R2 bytes with an allowlisted
// Content-Type; it refuses anything not matching a fixed allowlist of paths,
// so it cannot become a general file host. Path segments are validated
// against [a-z0-9/._-]+ and the resolved key must start with "models/".

interface Env {
  UPLOADS: R2Bucket;
}

type Ctx = EventContext<Env, string, Record<string, never>>;

// key -> the Content-Type the client must see. These are the only keys this
// route will serve; everything else 404s.
const KEY_TYPES: Record<string, string> = {
  'models/prompt-guard/onnx/model_quantized.onnx': 'application/octet-stream',
  'models/pii/onnx/model_quantized.onnx': 'application/octet-stream',
  'models/ort/ort-wasm-simd-threaded.asyncify.wasm': 'application/wasm',
  // ORT's ESM glue is fetched by dynamic import from wasmPaths and needs a
  // JS content type or the import is refused.
  'models/ort/ort-wasm-simd-threaded.asyncify.mjs': 'text/javascript',
  'models/ort/ort-wasm-simd-threaded.mjs': 'text/javascript',
  'models/ort/ort-wasm-simd-threaded.wasm': 'application/wasm',
  'models/prompt-guard/config.json': 'application/json',
  'models/prompt-guard/tokenizer.json': 'application/json',
  'models/prompt-guard/tokenizer_config.json': 'application/json',
  'models/prompt-guard/special_tokens_map.json': 'application/json',
  'models/pii/config.json': 'application/json',
  'models/pii/tokenizer.json': 'application/json',
  'models/pii/tokenizer_config.json': 'application/json',
  'models/pii/special_tokens_map.json': 'application/json',
  'models/pii/vocab.txt': 'text/plain',
};

const SAFE_PATH = /^[a-z0-9][a-z0-9/._-]*$/;

// HEAD is allowed for parity: it returns the same headers with a null body,
// so a missing allowlist entry can't masquerade as "route missing" in a
// curl -I probe.
export const onRequestHead: PagesFunction<Env, string, Record<string, never>> = async (
  context: Ctx,
) => {
  return onRequestGet(context);
};

export const onRequestGet: PagesFunction<Env, string, Record<string, never>> = async (
  context: Ctx,
) => {
  const { env, params, request } = context;

  if (!env.UPLOADS) return new Response('Not found', { status: 404 });

  const raw = (params as { path?: string | string[] }).path;
  const rel = Array.isArray(raw) ? raw.join('/') : String(raw || '');
  const key = 'models/' + rel;

  // Two backstops: the key must be on the allowlist (exact string), and the
  // path text must be boring. Either failing is a 404 — no probing the
  // bucket's other contents through this route.
  const contentType = SAFE_PATH.test(rel) ? KEY_TYPES[key] : undefined;
  if (!contentType) return new Response('Not found', { status: 404 });

  // Only GET/HEAD make sense here; anything else falls off the end of the
  // routing table into a 404 by Pages convention.
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }

  // get() for HEAD too: it carries the same metadata (httpEtag) and the body
  // simply goes unread on the null-body HEAD response, keeping the type a
  // plain R2ObjectBody instead of a union without .body.
  const object = await env.UPLOADS.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  // Content-addressed by filename: these bytes are pinned to the transformers
  // version in package.json, so long cache with revalidate-on-delete is right.
  // Same reasoning as /uploads/: no `immutable` — deletion must be observable.
  const headers = new Headers({
    'Content-Type': contentType,
    'Cache-Control': 'public, no-cache',
    'Cross-Origin-Resource-Policy': 'same-origin',
    ETag: object.httpEtag,
  });

  if (request.headers.get('If-None-Match') === object.httpEtag) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(request.method === 'HEAD' ? null : object.body, { headers });
};