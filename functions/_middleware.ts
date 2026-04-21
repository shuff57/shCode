// Runs before every /api/* Pages Function. Verifies the Cloudflare Access
// JWT and attaches the authenticated student's email to context.data so
// downstream handlers can scope their reads / writes to the caller.
//
// Dev fallback: if ACCESS_AUD is still the placeholder or a JWT header is
// missing, we stamp a `dev@localhost` identity so `wrangler pages dev`
// remains usable before the Access application is configured.

import { createRemoteJWKSet, jwtVerify } from 'jose';

interface Env {
  DB: D1Database;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  ALLOWED_EMAIL_DOMAIN: string;
}

type Ctx = EventContext<Env, string, { email: string }>;

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedTeamDomain = '';

function getJwks(teamDomain: string) {
  if (!cachedJwks || cachedTeamDomain !== teamDomain) {
    cachedJwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    cachedTeamDomain = teamDomain;
  }
  return cachedJwks;
}

function isUnconfigured(env: Env): boolean {
  return !env.ACCESS_AUD || env.ACCESS_AUD.startsWith('REPLACE_WITH_');
}

function isLocalRequest(url: URL): boolean {
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
}

export const onRequest: PagesFunction<Env, string, { email: string }> = async (context: Ctx) => {
  const { request, env, next, data } = context;
  const url = new URL(request.url);

  if (!url.pathname.startsWith('/api/')) return next();

  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');

  if (!jwt) {
    // Dev fallback: only allow unauthenticated access when BOTH Access is
    // unconfigured AND the request is to localhost. In production (pages.dev
    // or a custom domain), missing JWT always means 401 so the URL isn't
    // open to the internet while Access is still being set up.
    if (isUnconfigured(env) && isLocalRequest(url)) {
      data.email = 'dev@localhost';
      return next();
    }
    return new Response('Not signed in', { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(jwt, getJwks(env.ACCESS_TEAM_DOMAIN), {
      issuer: `https://${env.ACCESS_TEAM_DOMAIN}`,
      audience: env.ACCESS_AUD,
    });
    const email = String(payload.email || '').toLowerCase();
    if (!email) return new Response('No email in token', { status: 403 });

    const allowed = env.ALLOWED_EMAIL_DOMAIN || '@';
    if (!email.endsWith(allowed)) {
      return new Response('Email domain not allowed', { status: 403 });
    }

    data.email = email;
    return next();
  } catch {
    return new Response('Invalid Access token', { status: 401 });
  }
};
