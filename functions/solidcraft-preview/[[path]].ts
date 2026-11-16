// The engines exceed Pages' static asset limit. Serve only pinned public runtime objects from R2.
import { SOLIDCRAFT_ASSETS } from '../_shared/solidcraft-runtime';

interface Env { UPLOADS: R2Bucket }

export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  const path = new URL(request.url).pathname.slice('/solidcraft-preview/'.length);
  const asset = SOLIDCRAFT_ASSETS.find(item => item.path === path);
  if (!asset) return next();
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  if (!env.UPLOADS) return new Response('CAD runtime unavailable', { status: 503 });
  const object = request.method === 'HEAD' ? await env.UPLOADS.head(asset.key) : await env.UPLOADS.get(asset.key);
  if (!object || object.size !== asset.size) return new Response('CAD runtime unavailable', { status: 503 });
  const headers = new Headers({
    'Content-Type': 'application/wasm',
    'Content-Length': String(asset.size),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=3600, must-revalidate',
    ETag: `"${asset.sha256}"`,
  });
  if (request.headers.get('If-None-Match') === headers.get('ETag')) {
    if (request.method !== 'HEAD') await (object as R2ObjectBody).body.cancel();
    headers.delete('Content-Length');
    return new Response(null, { status: 304, headers });
  }
  return new Response(request.method === 'HEAD' ? null : (object as R2ObjectBody).body, { headers });
};
