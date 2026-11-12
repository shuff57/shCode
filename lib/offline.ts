// Hand-ins (Check, Submit, the commit Submit makes) are NOT queued while offline: each one
// has a time and, on a capped part, a try. Sending one later would change both. The work
// itself is already kept on this computer, so a hand-in that cannot reach the server says
// this instead of a generic error.

export const OFFLINE_HANDIN_TEXT =
  "You're offline. Your answer is saved on this computer. Hand it in when you're back online.";

/** True only when the browser says it is offline (unknown counts as online). */
export function isOffline(): boolean {
  try {
    const nav = (globalThis as { navigator?: { onLine?: boolean } }).navigator;
    return nav?.onLine === false;
  } catch {
    return false;
  }
}
