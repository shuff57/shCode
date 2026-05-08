// Base64-url-safe encoder for UTF-8 strings.
// Shared by Q5PlayPreview and ShPlayPreview so both iframes use identical encoding.
// The runner.html pages decode with the inverse: base64 → unescape(escape(...)) → code.
export function encodeCode(code: string): string {
  const utf8 = unescape(encodeURIComponent(code));
  const b64 = typeof window === 'undefined' ? '' : window.btoa(utf8);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
