// What a student reads when the AI grader fails. Plain words only: no vendor,
// no "key" or "endpoint", and no "ask your teacher" for a grader that simply
// could not be reached. The raw status and the server's own reason never go
// through here -- callers keep them in console.warn and send them to the
// teacher side (recordFailedAttempt), which is where staff look.

export type GradeFailureKind =
  | 'network' // fetch threw: offline, dropped, DNS
  | 'rate-limit' // 429: the server's own text is already calm
  | 'busy' // 503 from a busy grader: server text kept
  | 'offline' // 503 offline:true -- grader not set up (server text, vendor-free)
  | 'server' // 5xx from the grader
  | 'unreadable' // non-JSON / 404: a proxy or an old deploy answered
  | 'other'; // a 4xx the server explained (tries used, locked, bad request)

export interface GradeFailureInput {
  kind: GradeFailureKind;
  /** HTTP status; kept by the caller for logs, never shown. */
  status?: number;
  serverMessage?: string;
  /** true: a capped part, the draft is saved and no try was used.
   *  false: an uncapped part, the answer went to the teacher for marking.
   *  undefined: no second sentence (callers that never had one). */
  keepsTries?: boolean;
}

export const NETWORK_TEXT =
  'We could not reach the grader. Check your connection, then try again. Your work is saved.';
export const SERVER_TEXT =
  "The grader isn't responding right now. Your work is saved, so you can try again in a minute.";
const SERVER_BASE = "The grader isn't responding right now.";
const DRAFT_TAIL = 'Your draft is saved and this did not use one of your tries.';
const SENT_TAIL = 'Your answer has been saved and sent to your teacher for marking.';

// Words a student must never read in a grader failure. Exported for the test.
export const BANNED_IN_UNREACHABLE = /ollama|\bkey\b|endpoint|api\b|ask your teacher|HTTP \d/i;

export function classifyGradeFailure(
  status: number,
  data: { error?: string; offline?: boolean; rateLimited?: boolean } | null,
  network?: boolean,
): GradeFailureKind {
  if (network) return 'network';
  if (data === null || data === undefined) return 'unreadable';
  if (data.offline) return 'offline';
  if (status === 429 || data.rateLimited) return 'rate-limit';
  if (status === 503) return 'busy';
  if (status >= 500) return 'server';
  return 'other';
}

/** Strip anything that names the vendor or a key, in case an older deploy
 *  still sends it as the `error` text. Falls back to the server sentence. */
function calm(msg: string | undefined): string | null {
  const m = (msg ?? '').trim();
  if (!m || /ollama|\bkey\b|endpoint|_API_|ask your teacher/i.test(m)) return null;
  return m;
}

export function gradeFailureMessage({ kind, serverMessage, keepsTries }: GradeFailureInput): string {
  const tail = keepsTries === true ? DRAFT_TAIL : keepsTries === false ? SENT_TAIL : '';
  switch (kind) {
    case 'network':
      return keepsTries === true
        ? 'We could not reach the grader. Check your connection, then try again. Your work is saved and this did not use one of your tries.'
        : NETWORK_TEXT;
    case 'rate-limit':
    case 'busy': {
      const base = calm(serverMessage) ?? 'The grader is busy right now. Wait a moment and try again.';
      return tail ? `${base} ${tail}${keepsTries === true ? ' Try again in a minute.' : ''}` : base;
    }
    case 'offline': {
      const base = calm(serverMessage) ?? 'The grader is not available on this site right now.';
      return tail ? `${base} ${tail}` : base;
    }
    case 'other': {
      const base = calm(serverMessage) ?? SERVER_BASE;
      return tail ? `${base} ${tail}` : base;
    }
    case 'server':
    case 'unreadable':
    default:
      if (keepsTries === true) return `${SERVER_BASE} ${DRAFT_TAIL} Try again in a minute.`;
      if (keepsTries === false) return `${SERVER_BASE} ${SENT_TAIL}`;
      return SERVER_TEXT;
  }
}
