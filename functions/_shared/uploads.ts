// Shared rules for student image uploads. Both the write route
// (functions/api/uploads/) and the public serve route (functions/uploads/)
// import from here so the allowlist can never drift between them.

/** Max bytes for a single image. */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

/** Total bytes one student may store. */
export const QUOTA_BYTES = 20 * 1024 * 1024; // 20 MB

/** Max number of files one student may keep. */
export const QUOTA_FILES = 40;

/**
 * The only content types we will ever store or serve.
 *
 * SVG is deliberately absent. An SVG is a document: it can carry <script>
 * and event handlers, and serving one from our own origin would run that
 * script as us. Every other format here is inert raster data.
 */
export const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;
export type AllowedType = (typeof ALLOWED_TYPES)[number];

const EXT: Record<AllowedType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

export function extensionFor(type: string): string {
  return EXT[type as AllowedType] ?? 'bin';
}

/**
 * Identify an image from its LEADING BYTES, never from the client's
 * Content-Type header or the filename — both are attacker-controlled. A file
 * that claims image/png and contains HTML must be rejected here, because
 * anything we store we later serve from our own origin.
 *
 * Returns null when the bytes are not one of the four allowed formats, which
 * is also how a renamed .html, .js or .svg gets refused.
 */
export function sniffImageType(bytes: Uint8Array): AllowedType | null {
  if (bytes.length < 12) return null;
  const b = bytes;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) {
    return 'image/png';
  }
  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  // GIF: "GIF87a" or "GIF89a"
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 &&
      (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) {
    return 'image/gif';
  }
  // WebP: "RIFF" .... "WEBP"
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    return 'image/webp';
  }
  return null;
}

/**
 * 32 hex chars of CSPRNG output — 128 bits.
 *
 * This is the whole access control for a stored image: the id is the R2 key
 * and the public URL, and there is no auth check on the serve route (there
 * cannot be one; see migrations/0015_uploads.sql). Guessing must be
 * infeasible, so this must stay crypto.getRandomValues and must not shrink.
 * Never derive it from the filename, the email, or a timestamp.
 */
export function newUploadId(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => n.toString(16).padStart(2, '0')).join('');
}

/** Only ids we could have generated — keeps arbitrary strings out of R2 keys. */
export function isUploadId(s: string): boolean {
  return /^[0-9a-f]{32}$/.test(s);
}

/**
 * Strip a client filename down to something safe to echo back in listings.
 * Never used as a storage key — the id is the key — so this is only about
 * not storing control characters or absurd lengths.
 */
export function safeFilename(raw: string): string {
  const base = (raw || 'image').split(/[\\/]/).pop() || 'image';
  // Control characters only. This string is displayed in a listing, never used
  // as a key or a path, so stripping ordinary punctuation would make listings
  // unreadable for no security gain.
  //
  // Written as \u escapes on purpose. An earlier version used a literal
  // control-character range and the characters were eaten in transit, leaving a
  // range from space to hyphen -- which strips digits and punctuation and no
  // control characters at all. A character class is unreadable either way; the
  // escaped form is at least the one that survives being copied around.
  return base.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 120).trim() || 'image';
}
