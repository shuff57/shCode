-- Add per-student role. Default 'student'; 'admin' assigned at signup when
-- the email matches the ADMIN_EMAILS env var allowlist.
ALTER TABLE students ADD COLUMN role TEXT NOT NULL DEFAULT 'student';
