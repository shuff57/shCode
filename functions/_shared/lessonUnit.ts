// Server-side resolution of a lesson's unit string, for rate-limit bucket
// keys and similar server-derived values.
//
// LEF-17: the ai-help quota used to key its bucket off `body.unit`, a value
// the client supplies. A caller that sent a fresh random string per request
// got a fresh allowance every time, so the quota bounded nothing. The fix is
// the same shape the rest of the Functions already trust: derive every key
// component from data the server owns — here the build-time catalog at
// `public/lessons-manifest.json`, the same asset lessonAccess.ts and
// dueDates.ts resolve through `env.ASSETS`.
//
// Lookup failure buckets under the empty string, exactly like a lesson that
// genuinely has no unit. That is the conservative direction: the caller keeps
// ONE shared bucket instead of gaining a fresh per-value allowance.

interface ManifestLesson {
  id: string;
  unit?: string | null;
}

interface Manifest {
  lessons: ManifestLesson[];
}

interface UnitEnv {
  ASSETS?: Fetcher;
}

let manifestCache: Map<string, string> | null = null;

async function loadUnitMap(env: UnitEnv, request: Request): Promise<Map<string, string> | null> {
  if (manifestCache) return manifestCache;
  const url = new URL(request.url);
  url.pathname = '/lessons-manifest.json';
  url.search = '';
  try {
    const res = env.ASSETS
      ? await env.ASSETS.fetch(new Request(url.toString()))
      : await fetch(url.toString());
    if (!res.ok) return null;
    const manifest = (await res.json()) as Manifest;
    if (!manifest || !Array.isArray(manifest.lessons)) return null;
    const map = new Map<string, string>();
    for (const l of manifest.lessons) {
      if (l && typeof l.id === 'string' && typeof l.unit === 'string' && l.unit.trim()) {
        map.set(l.id, l.unit.trim());
      }
    }
    manifestCache = map;
    return map;
  } catch {
    return null;
  }
}

/** UnitResolver shape: the unit string for a lesson id, or null when the
 *  catalog can't resolve one (caller buckets under ''). */
export type UnitResolver = string | null;

/**
 * Resolve the bucket-key unit for a lesson, from the build-time catalog.
 * `lessonId` comes from the request body but is only ever an untrusted
 * lookup hint — an unknown id returns null and the caller buckets under '',
 * so no request-supplied value ever reaches the key itself.
 */
export async function resolveUnitForLesson(
  env: UnitEnv,
  request: Request,
  lessonId: string,
): Promise<UnitResolver> {
  if (!lessonId) return null;
  const map = await loadUnitMap(env, request);
  if (!map) return null; // fail to the shared bucket, never to client input
  return map.get(lessonId) ?? null;
}

let idSetCache: Set<string> | null = null;

/**
 * True when the build-time catalog lists this lesson id. null when the catalog
 * cannot be read, so a caller that must not trust the request can fail closed.
 */
export async function lessonInCatalog(
  env: UnitEnv,
  request: Request,
  lessonId: string,
): Promise<boolean | null> {
  if (!lessonId) return false;
  if (!idSetCache) {
    const url = new URL(request.url);
    url.pathname = '/lessons-manifest.json';
    url.search = '';
    try {
      const res = env.ASSETS
        ? await env.ASSETS.fetch(new Request(url.toString()))
        : await fetch(url.toString());
      if (!res.ok) return null;
      const manifest = (await res.json()) as Manifest;
      if (!manifest || !Array.isArray(manifest.lessons)) return null;
      idSetCache = new Set(manifest.lessons.filter((l) => l && typeof l.id === 'string').map((l) => l.id));
    } catch {
      return null;
    }
  }
  return idSetCache.has(lessonId);
}
