// Work typed while signed out, offered to the account that then signs in.
//
// Signed out, a page keeps its work under the `guest` owner (lib/owned-storage.ts),
// which everyone using this computer while signed out shares. After signing in,
// the lab shows "You have work in this lesson from before you signed in" ONLY when
// that guest draft is real work (not the starter) and differs from what the account
// has open. Nothing is merged on its own: the student chooses. Choosing to use it
// keeps the account's own version in History first, then copies the guest draft into
// the account (the guest copy stays in the guest space, as it was before signing in). "No thanks" is remembered for
// that exact guest draft, so a later, different one is offered again.
//
// Labs only (the `progress` record). Quiz picks, written text and Try-it blocks a
// guest typed stay in the guest space.

import { filesEqual, type FileMap } from './lesson-sync-merge';
import { asDraft, normalizeContents, PROGRESS_KEY, saveProgress } from './version-control';
import { guestLocal, ownedLocal, pageIsAccount } from './owned-storage';
import { keepInHistory } from './local-history';

const DISMISS_KEY = 'guest-offer-dismissed:';
/** Offers answered on this page, so one is not shown again even if that could not be stored. */
const answeredHere = new Set<string>();
function remember(lessonId: string, fp: string): void {
  answeredHere.add(`${lessonId}\n${fp}`);
  ownedLocal.setItem(DISMISS_KEY + lessonId, fp);
}

/** A short, stable fingerprint of a file map (not security: it only tells drafts apart). */
export function fingerprint(files: FileMap): string {
  const text = JSON.stringify(Object.keys(files).sort().map((k) => [k, files[k]]));
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return `${text.length}.${h.toString(36)}`;
}

export interface GuestOffer {
  files: FileMap;
  fingerprint: string;
}

export function guestWorkOffer(lessonId: string, current: FileMap, starter: FileMap): GuestOffer | null {
  if (!pageIsAccount()) return null;
  const draft = asDraft(guestLocal.getJSON(PROGRESS_KEY + lessonId));
  if (!draft) return null;
  const files = normalizeContents(draft.fileContents);
  if (filesEqual(files, normalizeContents(starter))) return null;
  if (filesEqual(files, normalizeContents(current))) return null;
  const fp = fingerprint(files);
  if (answeredHere.has(`${lessonId}\n${fp}`) || ownedLocal.getItem(DISMISS_KEY + lessonId) === fp) return null;
  return { files, fingerprint: fp };
}

export type AcceptResult =
  | { ok: true; files: FileMap }
  /** history: the account's own version could not be kept in History, so nothing changed.
   *  save: the guest draft could not be saved into the account, so nothing changed. */
  | { ok: false; reason: 'history' | 'save' };

/**
 * Use the guest draft in this account. The account's own (non-starter) version is put in
 * History FIRST and read back; if that fails, nothing at all changes. Only then is the
 * account's draft replaced. The guest copy is left in the guest space (never removed here)
 * and that exact draft is not offered to this account again.
 */
export function acceptGuestWork(lessonId: string, offer: GuestOffer, current: FileMap, starter: FileMap): AcceptResult {
  if (!filesEqual(normalizeContents(current), normalizeContents(starter))) {
    if (!keepInHistory(lessonId, current, 'Before using work from before you signed in')) {
      return { ok: false, reason: 'history' };
    }
  }
  const kept = saveProgress(lessonId, {
    fileContents: offer.files,
    commits: [],
    lastCommittedFileContents: normalizeContents(starter),
    completedSteps: [],
  });
  if (kept !== 'ok') return { ok: false, reason: 'save' };
  // The guest copy STAYS where it is: another signed-out tab may be saving a newer draft
  // into that very key, and taking it out cannot be made safe against that. This exact
  // draft is simply not offered to this account again.
  remember(lessonId, offer.fingerprint);
  return { ok: true, files: offer.files };
}

export function declineGuestWork(lessonId: string, offer: GuestOffer): void {
  remember(lessonId, offer.fingerprint);
}
