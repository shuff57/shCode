-- Per-student image uploads. The BYTES live in R2 (binding `UPLOADS`); this
-- table is the ownership record, the quota ledger, and the listing index.
-- D1 holds no image data.
--
-- `id` is 32 hex chars from crypto.getRandomValues — 128 bits. It is the R2
-- object key AND the public URL path, so it is a capability: anyone holding
-- the link can fetch the image, with no auth check.
--
-- That is deliberate and it is the only thing that works. The sketch iframe
-- (components/MoshionPreview.tsx) is sandboxed WITHOUT allow-same-origin, on
-- purpose, so student code cannot reach /api/* carrying the session cookie.
-- An opaque-origin document making a subresource request is cross-site for
-- cookie purposes, and the session cookie is SameSite=Lax, so it is not sent
-- — an auth-gated image URL would 401 inside every student sketch.
--
-- DIRECTIVE: do not "fix" this by adding allow-same-origin to that iframe.
-- That flag is absent to stop student code calling the API as the student.
--
-- content_type is stored from a MAGIC-BYTE sniff of the upload, never from
-- the client's Content-Type header, and the serve route sets
-- X-Content-Type-Options: nosniff. Without both, a file that claims to be a
-- PNG but contains HTML would be served as HTML from our own origin —
-- stored XSS against every signed-in user who opens the link.
CREATE TABLE IF NOT EXISTS uploads (
  id            TEXT    PRIMARY KEY,
  owner_email   TEXT    NOT NULL,
  filename      TEXT    NOT NULL,
  content_type  TEXT    NOT NULL,
  bytes         INTEGER NOT NULL,
  created_at    INTEGER NOT NULL
);

-- The listing query and the quota sum are both "this student's rows".
CREATE INDEX IF NOT EXISTS idx_uploads_owner ON uploads(owner_email, created_at DESC);
