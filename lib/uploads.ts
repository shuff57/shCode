// Client-side wrapper over /api/uploads.
//
// The returned `url` is a plain public path (/uploads/<id>.png). It is meant
// to be pasted straight into a sketch — sprite.image = '/uploads/....png' —
// and it works there precisely because the serve route has no auth check.
// See migrations/0015_uploads.sql for why that is the only option.

export interface UploadItem {
  id: string;
  filename: string;
  content_type: string;
  bytes: number;
  created_at: number;
  url: string;
}

export interface UploadQuota {
  files: number;
  maxFiles: number;
  bytes: number;
  maxBytes: number;
}

export class UploadError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function readError(res: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const body = (await res.json()) as { error?: string };
    if (body?.error) message = body.error;
  } catch {
    /* non-JSON body: keep the fallback */
  }
  throw new UploadError(res.status, message);
}

export async function listUploads(): Promise<{ uploads: UploadItem[]; quota: UploadQuota }> {
  const res = await fetch('/api/uploads', { credentials: 'same-origin' });
  if (!res.ok) await readError(res, 'Could not load your images.');
  return res.json();
}

/**
 * Raw-body upload. The filename rides in a header rather than a multipart
 * envelope, because a paste or a drag-and-drop has no <form> behind it and
 * building a FormData just to carry one file is noise.
 */
export async function uploadImage(file: File): Promise<UploadItem> {
  const res = await fetch('/api/uploads', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      // The server ignores this for typing — it sniffs the bytes — but
      // sending the real one keeps proxies and dev tools honest.
      'Content-Type': file.type || 'application/octet-stream',
      'X-Filename': encodeURIComponent(file.name || 'image'),
    },
    body: file,
  });
  if (!res.ok) await readError(res, 'Upload failed.');
  return res.json();
}

export async function deleteUpload(id: string): Promise<void> {
  const res = await fetch(`/api/uploads/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  if (!res.ok) await readError(res, 'Could not delete that image.');
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
