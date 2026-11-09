// Leaving a room from the browser: POST /api/rooms/<code>/leave with this
// tab's device id (functions/api/rooms/[code]/leave.ts). One copy for game
// rooms (lib/moshion-online.ts) and Code together (components/CodeTogetherBar.tsx).
//
// Two ways, for two moments:
//   - leaveRoom: Leave was pressed. A plain fetch that resolves once the server
//     has answered, so a list of open rooms loaded after it already counts this
//     tab as gone (loaded at the same moment, it could still say "2 of 2 here").
//   - leaveOnUnload: the page is going (pagehide: the tab closing, a reload,
//     another page). navigator.sendBeacon is delivered after the page has gone,
//     with the session cookie; its body is text/plain, which leave.ts reads as
//     JSON all the same. A browser that refuses the beacon gets a keepalive fetch.
//
// The seat stays the account's in this tab either way (a reload in the same tab
// keeps its device id, so Rejoin gives the seat back); the host's leaving closes
// the room. If neither request gets out, the room's own host-gone rule closes it
// a minute later (HOST_GONE_MS in lib/live-protocol.ts).

export function leaveUrl(code: string): string {
  return `/api/rooms/${encodeURIComponent(code)}/leave`;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<unknown>;
interface BeaconLike { sendBeacon?: (url: string, data?: BodyInit | null) => boolean }

/** Leave now (Leave pressed). Resolves when the server has answered, or the request failed; never rejects. */
export function leaveRoom(code: string, device: string, f: FetchLike = (u, i) => fetch(u, i)): Promise<void> {
  try {
    return f(leaveUrl(code), {
      method: 'POST', credentials: 'same-origin', keepalive: true,
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device }),
    }).then(() => undefined, () => undefined);
  } catch {
    return Promise.resolve();
  }
}

/**
 * Leave as the page goes (pagehide). true when the beacon was queued; false
 * when it fell back to a keepalive fetch (or nothing could be sent).
 */
export function leaveOnUnload(
  code: string,
  device: string,
  nav: BeaconLike | null = typeof navigator === 'undefined' ? null : navigator,
  f: FetchLike = (u, i) => fetch(u, i),
): boolean {
  const body = JSON.stringify({ device });
  try {
    if (nav?.sendBeacon && nav.sendBeacon(leaveUrl(code), body)) return true;
  } catch { /* refused: try the fetch */ }
  void leaveRoom(code, device, f);
  return false;
}
