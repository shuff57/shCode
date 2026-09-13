// Detects two related symptoms of a browser tab surviving across a deploy
// (see student-filed issue #20): a Next.js App Router client fetching a
// route's RSC payload (out/<route>/index.txt -- confirmed by inspecting a
// real export: lines like `I[1180,["...","static/chunks/...js"],
// "AnnouncementBanner"]` plus `OutletBoundary`/`AsyncMetadataOutlet`
// references) and, instead of that text being parsed into React by the
// flight client, it ending up rendered verbatim as visible page content.
// The other half is an ordinary ChunkLoadError -- a hashed chunk file that
// no longer exists once a new deploy replaced `_next/static/chunks/*`.
//
// Neither mechanism was reproduced live in this session (would need two
// real Cloudflare Pages deploys with a tab held open across them); this is
// the best-supported theory from the reported screenshot, not a confirmed
// live repro. Detection is intentionally narrow: it requires markers that
// are internal Next.js identifiers, never real lesson content.

const RELOAD_FLAG_KEY = 'shcode:stale-build-reload';

// Both markers must be present in *visible* text (document.body.innerText,
// which -- unlike textContent -- excludes <script> tag contents, so a
// normal page's <script src="...chunks/...js"> never trips this). A lesson
// would have to contain both a literal "static/chunks/" path AND one of
// Next's internal RSC boundary component names to false-positive.
const CHUNK_PATH_MARKER = /static\/chunks\//;
const RSC_INTERNAL_MARKER = /OutletBoundary|AsyncMetadataOutlet|MetadataBoundary|ViewportBoundary/;

export function looksLikeStaleFlightPayload(visibleText: string): boolean {
  return CHUNK_PATH_MARKER.test(visibleText) && RSC_INTERNAL_MARKER.test(visibleText);
}

const CHUNK_ERROR_MARKER =
  /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;

export function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const name = err instanceof Error ? err.name : '';
  const message = err instanceof Error ? err.message : String(err);
  return CHUNK_ERROR_MARKER.test(name) || CHUNK_ERROR_MARKER.test(message);
}

// Reloads at most once per failure episode. Returns true if it reloaded,
// false if an earlier reload already happened and didn't help (caller
// should show a manual fallback instead of looping forever). If
// sessionStorage is unavailable (private mode, etc.) we cannot tell episodes
// apart, so we fail safe and refuse to auto-reload rather than risk a loop.
export function guardedReload(reason: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem(RELOAD_FLAG_KEY) === '1') {
      console.error(`[stale-build-guard] already reloaded once for this episode, giving up (${reason})`);
      return false;
    }
    sessionStorage.setItem(RELOAD_FLAG_KEY, '1');
  } catch {
    console.error(`[stale-build-guard] sessionStorage unavailable, refusing to auto-reload (${reason})`);
    return false;
  }
  console.error(`[stale-build-guard] reloading (${reason})`);
  window.location.reload();
  return true;
}

// Call this once a page has rendered normally, so a later, genuinely new
// stale-build episode (e.g. after the next redeploy) can trigger a reload
// again instead of being blocked forever by an old flag.
export function clearStaleBuildGuard(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(RELOAD_FLAG_KEY);
  } catch {
    // ignore
  }
}
