// The message to show a person when a request failed. The API answers errors as {"error":"..."}; reading the
// body with res.text() and showing that put raw JSON in front of teachers ({"error":"Failed to create ..."}).
// Falls back to the plain body, then to the status, so there is always something readable.
export async function errorText(res: Response): Promise<string> {
  const raw = await res.text().catch(() => '');
  try {
    const parsed = JSON.parse(raw) as { error?: unknown };
    if (parsed && typeof parsed.error === 'string' && parsed.error.trim()) return parsed.error.trim();
    // JSON, but not an error message we can read: never show the JSON itself.
    if (parsed && typeof parsed === 'object') return `Something went wrong (HTTP ${res.status}).`;
  } catch {
    /* not JSON: use the text */
  }
  const text = raw.trim();
  // An HTML error page (a proxy or the platform answering) is not for a person to read.
  if (!text || text.startsWith('<')) return `Something went wrong (HTTP ${res.status}).`;
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
}
