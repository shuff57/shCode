// A page that loaded signed out, but is signed in.
//
// A page fixes its owner when it loads (lib/owned-storage.ts). If it loaded without the
// `shcode_owner` cookie while the browser does hold a session (the HTML came from a cache
// the server never saw, or the cookie was deleted by hand), it keeps the student's work in
// the shared `guest` space. So, once GET /api/me says someone is signed in:
//  * every save still waiting on its countdown is run (lib/draft-autosave.ts);
//  * the page reloads ONCE. The /api/me answer has already set the owner cookie
//    (functions/_middleware.ts), so the reloaded page is the account's, and a lab typed in
//    that short while is offered there ("work from before you signed in", lib/guest-work.ts).
// Nothing is moved, cleared or refused: every earlier design that did one of those could
// lose work or hand a previous guest's draft to the account. What was typed before the
// reload stays in the guest space, like anything typed signed out.
// No reload when a save on this page has failed (the edit may live only in memory), or when
// this tab already reloaded for this reason within the last minute (no loop if the cookie
// cannot be set). The page then keeps working as guest; its API calls are refused as an
// owner mismatch, which the page says out loud (components/OwnerNotices.tsx).
//
// Run by components/OwnerNotices.tsx after mount. Never delays anything.

import { GUEST, lastStorageProblem, pageOwner } from './owned-storage';
import { flushAllPendingSaves } from './draft-autosave';

/** sessionStorage key: when this tab last reloaded for this reason. Not personal. */
export const OWNER_RELOAD_KEY = 'shcode.ownerReload';
const WINDOW_MS = 60_000;

export type GuardResult = 'account' | 'guest' | 'reloading' | 'stuck';

export interface GuardDeps {
  /** Who /api/me says is signed in, or null. */
  me: () => Promise<{ email: string } | null>;
  reload: () => void;
  session: Pick<Storage, 'getItem' | 'setItem'> | null;
  now?: () => number;
}

export async function guardSignedInGuest(deps: GuardDeps): Promise<GuardResult> {
  if (pageOwner() !== GUEST) return 'account';
  let user: { email: string } | null = null;
  try { user = await deps.me(); } catch { user = null; }
  if (!user) return 'guest';
  flushAllPendingSaves();
  // A save that failed may have left the newest edit in memory only: do not reload it away.
  if (lastStorageProblem()) return 'stuck';
  const now = (deps.now ?? Date.now)();
  let last = 0;
  try { last = Number(deps.session?.getItem(OWNER_RELOAD_KEY) ?? 0) || 0; } catch { last = 0; }
  if (now - last < WINDOW_MS) return 'stuck';
  // Without a place to remember the reload there is no loop guard, so do not reload.
  try {
    if (!deps.session) return 'stuck';
    deps.session.setItem(OWNER_RELOAD_KEY, String(now));
    if (deps.session.getItem(OWNER_RELOAD_KEY) !== String(now)) return 'stuck';
  } catch {
    return 'stuck';
  }
  deps.reload();
  return 'reloading';
}
