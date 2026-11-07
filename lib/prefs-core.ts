// Appearance settings (#73, #77): the theme, an accent, the body font and the
// home page's background. Shared by the route (functions/api/prefs.ts), which
// validates what is stored, and the browser (lib/prefs.ts), which applies it.
//
// Everything here is an id from a fixed list, never a CSS value: the stored
// prefs are rendered into the page (an attribute, a background), so a value
// the server accepted must not be able to carry CSS or a URL of its own. The
// one free-form thing, an uploaded background, is an upload id (32 hex) and an
// extension from a fixed list; the route also checks the upload is the
// caller's own.

export const THEMES = ['dark', 'light', 'candy', 'retro', 'forest'] as const;
export type ThemeId = (typeof THEMES)[number];

/** Same list as ACCENTS in scripts/generate-theme-css.mjs (which checks each one's contrast). */
export const ACCENTS = ['cyan', 'purple', 'pink', 'green', 'orange', 'red'] as const;
export type AccentId = (typeof ACCENTS)[number];

export const FONTS = ['classic', 'modern', 'sans'] as const;
export type FontId = (typeof FONTS)[number];

export const HOME_PRESETS = ['dots', 'grid', 'glow', 'stripes', 'waves'] as const;
export type HomePresetId = (typeof HOME_PRESETS)[number];

export const UPLOAD_EXTS = ['png', 'jpg', 'gif', 'webp'] as const;

export type HomeBg =
  | { kind: 'preset'; id: HomePresetId }
  | { kind: 'upload'; id: string; ext: (typeof UPLOAD_EXTS)[number] };

export interface Prefs {
  theme: ThemeId;
  /** null = the theme's own brand colour. */
  accent: AccentId | null;
  font: FontId;
  /** null = the plain page background. */
  homeBg: HomeBg | null;
}

export const DEFAULT_PREFS: Prefs = { theme: 'dark', accent: null, font: 'classic', homeBg: null };

export const THEME_LABELS: Record<ThemeId, string> = {
  dark: 'Dark', light: 'Light', candy: 'Candy', retro: 'Retro arcade', forest: 'Forest',
};
export const ACCENT_LABELS: Record<AccentId, string> = {
  cyan: 'Cyan', purple: 'Purple', pink: 'Pink', green: 'Green', orange: 'Orange', red: 'Red',
};
export const FONT_LABELS: Record<FontId, string> = {
  classic: 'Classic typewriter', modern: 'Modern code', sans: 'Clean sans',
};
export const HOME_PRESET_LABELS: Record<HomePresetId, string> = {
  dots: 'Dots', grid: 'Grid', glow: 'Glow', stripes: 'Stripes', waves: 'Waves',
};

/** The CSS background for a preset. Built from theme variables, so it suits every theme. */
export function presetBackground(id: HomePresetId): string {
  switch (id) {
    case 'dots':
      return 'radial-gradient(circle, color-mix(in srgb, var(--brand) 35%, transparent) 1.5px, transparent 1.6px) 0 0 / 22px 22px, var(--bg)';
    case 'grid':
      return 'linear-gradient(color-mix(in srgb, var(--c-line) 70%, transparent) 1px, transparent 1px) 0 0 / 32px 32px, linear-gradient(90deg, color-mix(in srgb, var(--c-line) 70%, transparent) 1px, transparent 1px) 0 0 / 32px 32px, var(--bg)';
    case 'glow':
      return 'radial-gradient(ellipse at 15% 0%, color-mix(in srgb, var(--brand) 30%, transparent), transparent 55%), radial-gradient(ellipse at 90% 100%, color-mix(in srgb, var(--c-pink) 22%, transparent), transparent 55%), var(--bg)';
    case 'stripes':
      return 'repeating-linear-gradient(135deg, color-mix(in srgb, var(--brand) 9%, transparent) 0 18px, transparent 18px 36px), var(--bg)';
    case 'waves':
      return 'radial-gradient(circle at 50% 120%, transparent 38%, color-mix(in srgb, var(--brand) 16%, transparent) 39% 41%, transparent 42%) 0 0 / 60px 30px, var(--bg)';
  }
}

/** The public path of an uploaded background (served by functions/uploads/[file].ts, no auth). */
export function uploadUrl(bg: { id: string; ext: string }): string {
  return `/uploads/${bg.id}.${bg.ext}`;
}

const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v);

/**
 * Validate a prefs object from storage or a request. Unknown keys are dropped;
 * a field that is missing takes its default; a field that is present but wrong
 * is an error (so a bad request is refused, not half-applied).
 */
export function parsePrefs(raw: unknown): { ok: true; prefs: Prefs } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'Settings must be an object.' };
  const r = raw as Record<string, unknown>;
  const out: Prefs = { ...DEFAULT_PREFS };
  if (r.theme !== undefined) {
    if (!isOneOf(THEMES, r.theme)) return { ok: false, error: 'Unknown theme.' };
    out.theme = r.theme;
  }
  if (r.accent !== undefined && r.accent !== null) {
    if (!isOneOf(ACCENTS, r.accent)) return { ok: false, error: 'Unknown accent colour.' };
    out.accent = r.accent;
  }
  if (r.font !== undefined) {
    if (!isOneOf(FONTS, r.font)) return { ok: false, error: 'Unknown font.' };
    out.font = r.font;
  }
  if (r.homeBg !== undefined && r.homeBg !== null) {
    const b = r.homeBg as Record<string, unknown>;
    if (typeof b !== 'object' || Array.isArray(b)) return { ok: false, error: 'Unknown home background.' };
    if (b.kind === 'preset' && isOneOf(HOME_PRESETS, b.id)) out.homeBg = { kind: 'preset', id: b.id };
    else if (b.kind === 'upload' && typeof b.id === 'string' && /^[0-9a-f]{32}$/.test(b.id) && isOneOf(UPLOAD_EXTS, b.ext)) {
      out.homeBg = { kind: 'upload', id: b.id, ext: b.ext };
    } else return { ok: false, error: 'Unknown home background.' };
  }
  return { ok: true, prefs: out };
}

/** The attributes on <html> that carry the prefs (read by app/themes.css and app/globals.css). */
export function htmlAttributes(p: Prefs): Record<'data-theme' | 'data-accent' | 'data-font', string | null> {
  return {
    'data-theme': p.theme === 'dark' ? null : p.theme,
    'data-accent': p.accent,
    'data-font': p.font === 'classic' ? null : p.font,
  };
}
