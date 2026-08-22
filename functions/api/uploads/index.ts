// GET  /api/uploads  — list the caller's images (newest first) + quota usage
// POST /api/uploads  — store one image, return its id and public URL
//
// Auth comes from functions/_middleware.ts, which has already verified the
// session cookie and put the caller on context.data. Every query here is
// scoped to data.email; there is no route that lists another student's files.
//
// The BYTES go to R2 (binding UPLOADS). D1 holds only ownership, size and
// content type — see migrations/0015_uploads.sql for why the serve route is
// unauthenticated and why that is the only thing that works.

import {
  ALLOWED_TYPES,
  MAX_UPLOAD_BYTES,
  QUOTA_BYTES,
  QUOTA_FILES,
  extensionFor,
  newUploadId,
  safeFilename,
  sniffImageType,
} from '../../_shared/uploads';

interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

interface Row {
  id: string;
  filename: string;
  content_type: string;
  bytes: number;
  created_at: number;
}

function publicUrl(id: string, contentType: string): string {
  return `/uploads/${id}.${extensionFor(contentType)}`;
}

export const onRequestGet: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { env, data } = context;
  const result = await env.DB.prepare(
    `SELECT id, filename, content_type, bytes, created_at
       FROM uploads
      WHERE owner_email = ?
      ORDER BY created_at DESC`,
  )
    .bind(data.email)
    .all<Row>();

  const rows = result.results ?? [];
  const used = rows.reduce((n, r) => n + r.bytes, 0);
  return json({
    uploads: rows.map((r) => ({ ...r, url: publicUrl(r.id, r.content_type) })),
    quota: {
      files: rows.length,
      maxFiles: QUOTA_FILES,
      bytes: used,
      maxBytes: QUOTA_BYTES,
    },
  });
};

export const onRequestPost: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { request, env, data } = context;

  if (!env.UPLOADS) return json({ error: 'Uploads are not configured on this server' }, 500);

  // Reject on the declared length before reading the body, so an oversized
  // upload costs one header instead of streaming megabytes into the worker.
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_UPLOAD_BYTES) {
    return json({ error: `That image is too large. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` }, 413);
  }

  let filename = 'image';
  let body: ArrayBuffer;

  const ct = request.headers.get('Content-Type') || '';
  if (ct.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return json({ error: 'No file was included in the upload.' }, 400);
    filename = safeFilename(file.name);
    body = await file.arrayBuffer();
  } else {
    // Raw-body form: the filename rides in a header. Used by the editor's
    // paste/drop path, where there is no <form> to build.
    //
    // Percent-decoded first — HTTP headers are ASCII-only, so the client
    // encodes the name. Without this, "my cat.png" stores as "my%20cat.png"
    // and anything non-Latin stores as mojibake. Decoding can throw on a
    // malformed sequence, which is a client bug, not a reason to 500.
    const rawName = request.headers.get('X-Filename') || 'image';
    let decoded = rawName;
    try {
      decoded = decodeURIComponent(rawName);
    } catch {
      /* keep the raw form */
    }
    filename = safeFilename(decoded);
    body = await request.arrayBuffer();
  }

  const bytes = new Uint8Array(body);
  if (bytes.byteLength === 0) return json({ error: 'That file is empty.' }, 400);

  // The declared length can lie; this is the real one.
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return json({ error: `That image is too large. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` }, 413);
  }

  // Content type comes from the BYTES, never from the client. A file that
  // claims image/png and contains HTML is refused here — anything stored is
  // later served from our own origin, so this is the line that stops a
  // renamed .html becoming stored XSS.
  const contentType = sniffImageType(bytes);
  if (!contentType) {
    return json(
      {
        error:
          'That does not look like an image. Allowed formats: ' +
          ALLOWED_TYPES.map((t) => t.replace('image/', '')).join(', ') +
          '. (SVG is not allowed: it can contain scripts.)',
      },
      415,
    );
  }

  // Quota, counted from D1 rather than from R2 — D1 is the ownership record
  // and the only place a per-student total exists.
  const usage = await env.DB.prepare(
    `SELECT COUNT(*) AS files, COALESCE(SUM(bytes), 0) AS total FROM uploads WHERE owner_email = ?`,
  )
    .bind(data.email)
    .first<{ files: number; total: number }>();

  const files = usage?.files ?? 0;
  const total = usage?.total ?? 0;
  if (files >= QUOTA_FILES) {
    return json({ error: `You have ${files} images stored, which is the limit. Delete one to add another.` }, 409);
  }
  if (total + bytes.byteLength > QUOTA_BYTES) {
    return json(
      { error: `That would put you over your ${QUOTA_BYTES / 1024 / 1024} MB storage limit. Delete something first.` },
      409,
    );
  }

  const id = newUploadId();

  // R2 first. If the D1 insert then fails we have an orphaned object, which
  // is invisible and costs a few KB. The other order would give a row that
  // 404s — a broken image in a student's sketch with no way to fix it.
  await env.UPLOADS.put(id, body, {
    httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' },
    customMetadata: { owner: data.email },
  });

  try {
    await env.DB.prepare(
      `INSERT INTO uploads (id, owner_email, filename, content_type, bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, data.email, filename, contentType, bytes.byteLength, Date.now())
      .run();
  } catch (e) {
    // Don't leave the orphan behind if we can help it.
    await env.UPLOADS.delete(id).catch(() => {});
    return json({ error: 'Could not save that upload. Try again.' }, 500);
  }

  return json({
    id,
    url: publicUrl(id, contentType),
    filename,
    contentType,
    bytes: bytes.byteLength,
  }, 201);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
