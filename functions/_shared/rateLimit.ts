// IP-scoped rate limiting on D1, ported from raSHio's
// functions/utils/rateLimit.js (same sibling classroom app, same Cloudflare
// Pages + D1 stack) — same (ip, action) table, same fail-open tradeoff, same
// UNIQUE-constraint race handling. Complements the per-email login lockout
// in auth.ts: that stops one account being hammered from many IPs, this
// stops one IP hammering many accounts (or brute-forcing a 6-char class code).

interface RateLimitConfig {
  attempts: number;
  windowSeconds: number;
}

export type RateLimitAction = 'login' | 'signup' | 'joinClass';

const RATE_LIMITS: Record<RateLimitAction, RateLimitConfig> = {
  login: { attempts: 100, windowSeconds: 900 }, // 100 / 15 min — classroom-friendly, the email lockout is the tight one
  signup: { attempts: 30, windowSeconds: 3600 }, // 30 / hour per IP — allows a whole class signing up from one lab
  joinClass: { attempts: 10, windowSeconds: 3600 }, // 10 / hour — the only thing stopping brute-forcing a guessable 6-char code
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

/** Cloudflare's header first; fall back to a per-request random id, which
 *  effectively disables the limit rather than grouping unrelated callers
 *  into one shared bucket. Safe in production, where CF-Connecting-IP is
 *  always present. */
function getClientIP(request: Request): string {
  const cfIP = request.headers.get('CF-Connecting-IP');
  if (cfIP) return cfIP;
  const realIP = request.headers.get('X-Real-IP');
  if (realIP) return realIP;
  const forwardedFor = request.headers.get('X-Forwarded-For');
  if (forwardedFor) {
    const firstIP = forwardedFor.split(',')[0].trim();
    if (firstIP) return firstIP;
  }
  return `anon-${crypto.randomUUID()}`;
}

/** Check and update the counter for an (ip, action) pair. */
export async function checkRateLimit(
  db: D1Database,
  request: Request,
  action: RateLimitAction,
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[action];
  const ip = getClientIP(request);
  const now = Date.now();
  const windowStart = now - config.windowSeconds * 1000;

  // Given an existing row, apply the window/limit rules and return the
  // verdict. Pulled out so the race-recovery branch below (a concurrent
  // INSERT that lost the UNIQUE(ip, action) race) can reuse the exact same
  // logic as the normal "row already existed" path.
  const evaluateExisting = async (existing: {
    count: number;
    window_start: number;
  }): Promise<RateLimitResult> => {
    if (existing.window_start < windowStart) {
      await db
        .prepare('UPDATE rate_limit SET count = 1, window_start = ?1 WHERE ip = ?2 AND action = ?3')
        .bind(now, ip, action)
        .run();
      return { allowed: true, remaining: config.attempts - 1, retryAfter: 0 };
    }

    if (existing.count >= config.attempts) {
      const retryAfter = Math.ceil(
        (existing.window_start + config.windowSeconds * 1000 - now) / 1000,
      );
      return { allowed: false, remaining: 0, retryAfter };
    }

    await db
      .prepare('UPDATE rate_limit SET count = count + 1 WHERE ip = ?1 AND action = ?2')
      .bind(ip, action)
      .run();
    return { allowed: true, remaining: config.attempts - existing.count - 1, retryAfter: 0 };
  };

  try {
    const existing = await db
      .prepare('SELECT count, window_start FROM rate_limit WHERE ip = ?1 AND action = ?2')
      .bind(ip, action)
      .first<{ count: number; window_start: number }>();

    if (!existing) {
      // First attempt in window — but two concurrent requests from the same
      // IP can both reach this branch. Only one INSERT can win; the loser
      // throws on UNIQUE(ip, action). Fall through to evaluateExisting() on
      // the row the winner just created, instead of letting it bubble to the
      // catch-all below — which fails OPEN and would let exactly the
      // concurrent burst this limiter exists to catch through unthrottled.
      try {
        await db
          .prepare('INSERT INTO rate_limit (ip, action, count, window_start) VALUES (?1, ?2, 1, ?3)')
          .bind(ip, action, now)
          .run();
        return { allowed: true, remaining: config.attempts - 1, retryAfter: 0 };
      } catch (insertError) {
        const msg = insertError instanceof Error ? insertError.message : String(insertError);
        if (!msg.includes('UNIQUE constraint failed')) throw insertError;
        const raced = await db
          .prepare('SELECT count, window_start FROM rate_limit WHERE ip = ?1 AND action = ?2')
          .bind(ip, action)
          .first<{ count: number; window_start: number }>();
        // Someone else's INSERT won the race — it's already committed, so
        // this re-read can't come back empty.
        return await evaluateExisting(raced!);
      }
    }

    return await evaluateExisting(existing);
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail OPEN on anything else (D1 unavailable, migration not applied,
    // etc). A limiter that hard-fails the whole site over a transient D1
    // error is worse than temporarily under-limiting. The UNIQUE-constraint
    // race above is the one failure mode that must NOT fail open, and it's
    // handled before it can reach here.
    return { allowed: true, remaining: 999, retryAfter: 0 };
  }
}

export function rateLimitExceeded(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.', retryAfter }),
    {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) },
    },
  );
}
