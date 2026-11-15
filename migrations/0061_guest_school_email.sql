-- 0061: a school email as proof for a guest (owner's decisions 2026-11-15; extends 0059/0060).
--
-- The district's mail blocks students' incoming and outgoing outside mail, so the site cannot (and does not) email anyone. Instead
-- the proof stays inside the district's own mail: when a class requires it, the guest gives a school address on the class's allowlist
-- of domains, the TEACHER'S card shows a one-time phrase, the teacher emails that phrase from their school account to the guest's
-- school address, and the guest types it back. Only someone who can read that inbox can. A teacher still decides after (approve or
-- decline is the gate; the proof only has to come first). The phrase is deleted the moment it is used, when the request is decided,
-- after 5 wrong tries, or after 7 days; the school address stays on the row for the teacher's record. No ID image is ever stored.
--
-- classes.guest_school_required is a per-class switch, off by default (a class that never turns it on sees nothing new).
-- classes.guest_school_domains is the class's list of accepted domains, lower case, comma separated.

ALTER TABLE classes ADD COLUMN guest_school_required INTEGER NOT NULL DEFAULT 0;
ALTER TABLE classes ADD COLUMN guest_school_domains TEXT NOT NULL DEFAULT '';

ALTER TABLE sandbox_guests ADD COLUMN school_email TEXT;               -- the address the guest says is theirs; only a teacher of the class and the guest ever see it
ALTER TABLE sandbox_guests ADD COLUMN school_phrase TEXT;              -- 6 characters; NULL once used, decided, locked out or old
ALTER TABLE sandbox_guests ADD COLUMN school_phrase_at INTEGER;        -- when it was made (7 day life)
ALTER TABLE sandbox_guests ADD COLUMN school_tries INTEGER NOT NULL DEFAULT 0;  -- wrong phrases typed; 5 and it is cleared until a teacher makes a new one
ALTER TABLE sandbox_guests ADD COLUMN school_verified_at INTEGER;      -- when the guest typed the phrase back
