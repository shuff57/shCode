// The browser half of Appearance settings (#73, #77). See lib/prefs-core.ts.
//
// The prefs are applied as attributes on <html> (data-theme, data-accent,
// data-font). A copy lives in localStorage under PREFS_KEY so the inline script
// in app/layout.tsx can apply it before first paint (no flash of the dark
// theme); the account copy (GET/PUT /api/prefs) is what follows the student to
// another computer. On arrival the account copy wins; signing out removes the
// local copy so the next person on a shared computer starts from the default.

import { DEFAULT_PREFS, htmlAttributes, parsePrefs, type Prefs } from './prefs-core';

export const PREFS_KEY = 'shcode.prefs';
/** The key the first theme build used (a theme only); still read as a fallback. */
const OLD_THEME_KEY = 'shcode.theme';
export const PREFS_CHANGED = 'shcode:prefs-changed';

export function readLocalPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const p = parsePrefs(JSON.parse(raw));
      if (p.ok) return p.prefs;
    }
    const t = localStorage.getItem(OLD_THEME_KEY);
    if (t) {
      const p = parsePrefs({ theme: t });
      if (p.ok) return p.prefs;
    }
  } catch { /* storage blocked: defaults */ }
  return { ...DEFAULT_PREFS };
}

export function applyPrefs(p: Prefs): void {
  const el = document.documentElement;
  for (const [name, value] of Object.entries(htmlAttributes(p))) {
    if (value) el.setAttribute(name, value);
    else el.removeAttribute(name);
  }
  window.dispatchEvent(new CustomEvent(PREFS_CHANGED, { detail: p }));
}

function writeLocal(p: Prefs | null): void {
  try {
    if (p) localStorage.setItem(PREFS_KEY, JSON.stringify(p));
    else localStorage.removeItem(PREFS_KEY);
    localStorage.removeItem(OLD_THEME_KEY);
  } catch { /* storage blocked: the page still shows them */ }
}

/** Apply and remember locally (no network). */
export function setLocalPrefs(p: Prefs): void {
  writeLocal(p);
  applyPrefs(p);
}

/** Fetch the account copy and apply it. Returns null when signed out or offline. */
export async function pullPrefs(): Promise<Prefs | null> {
  try {
    const res = await fetch('/api/prefs', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const body = (await res.json()) as { prefs?: unknown; updatedAt?: number | null };
    // Nothing saved on the account yet: keep what this browser has, and give it
    // to the account so it follows the student from now on.
    if (!body.updatedAt) {
      const local = readLocalPrefs();
      if (JSON.stringify(local) !== JSON.stringify(DEFAULT_PREFS)) void pushPrefs(local).catch(() => {});
      return local;
    }
    const p = parsePrefs(body.prefs);
    if (!p.ok) return null;
    setLocalPrefs(p.prefs);
    return p.prefs;
  } catch {
    return null;
  }
}

/** Save to the account. Throws with the server's reason on failure. */
export async function pushPrefs(p: Prefs): Promise<Prefs> {
  const res = await fetch('/api/prefs', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefs: p }),
  });
  let body: { prefs?: unknown; error?: string } = {};
  try { body = await res.json(); } catch { /* empty */ }
  if (!res.ok) throw new Error(body.error || `Could not save (${res.status}).`);
  const parsed = parsePrefs(body.prefs);
  return parsed.ok ? parsed.prefs : p;
}

/** Sign-out: forget this account's look on this browser. */
export function clearLocalPrefs(): void {
  writeLocal(null);
  applyPrefs({ ...DEFAULT_PREFS });
}

/**
 * The inline script in app/layout.tsx: applies the stored prefs before first
 * paint. Kept here so the attribute rules live beside htmlAttributes(); it must
 * stay self-contained ES5 (it runs before any bundle) and only ever set an
 * attribute to a value from the fixed lists (it re-checks them itself).
 */
export const PREFS_BOOT_SCRIPT = `try{var s=localStorage.getItem('${PREFS_KEY}'),p=s?JSON.parse(s):{theme:localStorage.getItem('${OLD_THEME_KEY}')},d=document.documentElement,`
  + `ok=function(v,l){return typeof v==='string'&&l.indexOf(v)>=0};`
  + `if(ok(p.theme,['light','candy','retro','forest']))d.setAttribute('data-theme',p.theme);`
  + `if(ok(p.accent,['cyan','purple','pink','green','orange','red']))d.setAttribute('data-accent',p.accent);`
  + `if(ok(p.font,['modern','sans']))d.setAttribute('data-font',p.font)}catch(e){}`;
