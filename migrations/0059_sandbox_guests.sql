-- 0059: guests. A student invites an account holder into their sandbox sessions; a teacher approves
-- (owner's decisions 2026-11-14; spec codehs-review/GUEST-COLLAB-SPEC.md).
--
-- A guest is NOT an enrollment: it puts nobody on a roster, in a gradebook, in classPeople(), in a channel or in
-- messaging. The sandbox itself was never gated on lessons; what a person with no class lacks is the class-bound
-- features, and a guest gets exactly one narrow bridge into them: joining Code together sessions and game rooms that
-- their HOST starts (rooms.ts mayJoin), and counting as a vetted viewer of Everyone (publicShare.ts viewerVetted).
-- They cannot host, message, share into a class, or publish beyond "Just me".
--
-- Flow: the host makes a one-use code (status 'invited', good 7 days, never typed as an email); the guest, signed in
-- with their own account, redeems it ('pending'); a teacher of the vouching class approves ('approved', until the school
-- year's cutoff, ends_at) or declines. The host, the guest or a teacher can end it ('revoked'); ending it also drops the
-- guest's seats in running sessions. A declined or revoked pair cannot be invited again by code.
--
-- classes.guests_off is a per-class switch (like the messaging levels and public_sharing_off): while on, no new invites and
-- none of that class's guests can join anything.

CREATE TABLE IF NOT EXISTS sandbox_guests (
  id          TEXT    PRIMARY KEY,                -- 32 hex chars
  host_email  TEXT    NOT NULL,                   -- the student who invited
  class_id    TEXT    NOT NULL,                   -- the host's class that vouches, whose teachers decide
  guest_email TEXT,                               -- NULL until the code is redeemed
  code        TEXT    NOT NULL UNIQUE,            -- 8 characters, single use
  relation    TEXT    NOT NULL DEFAULT '',        -- the host's own words for who this is, at most 60 characters, checked for personal details
  status      TEXT    NOT NULL CHECK (status IN ('invited', 'pending', 'approved', 'declined', 'revoked')),
  invited_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,                   -- the code stops working
  redeemed_at INTEGER,
  decided_by  TEXT,
  decided_at  INTEGER,
  ends_at     INTEGER                             -- an approval's end (the school year's cutoff)
);
CREATE INDEX IF NOT EXISTS idx_sandbox_guests_host ON sandbox_guests (host_email, status);
CREATE INDEX IF NOT EXISTS idx_sandbox_guests_guest ON sandbox_guests (guest_email, status);
CREATE INDEX IF NOT EXISTS idx_sandbox_guests_class ON sandbox_guests (class_id, status);

ALTER TABLE classes ADD COLUMN guests_off INTEGER NOT NULL DEFAULT 0;
