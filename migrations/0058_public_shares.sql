-- 0058: "Everyone", the Public rung of who can see a shared picture, sound, font or game (owner's decisions 2026-11-14;
-- spec codehs-review/ASSET-AUDIENCE-SPEC.md).
--
-- Public is live at once. It is for accounts that are VETTED (in a live class on this site; later also an approved
-- sandbox guest), never for "any signed-in account": signup is open, so that would be the open web.
-- One row per item or game. A teacher of ANY class the owner is in can pull it (hidden_at/hidden_by, an optional short
-- hidden_reason the student reads); a pull is sticky: the row stays so the owner cannot make it public again until a
-- teacher puts it back. Pulling leaves the class shares (library_shares / library_game_shares) alone, so the item
-- falls back to the owner's classes. Deleting the item or game does not delete this row; every reader joins the item.
--
-- classes.public_sharing_off is a per-class kill switch, the way messaging has levels: while ANY live class of the owner
-- has it on, nothing of theirs is public (nothing new, and what was public goes dark until it is switched off again).

CREATE TABLE IF NOT EXISTS public_shares (
  kind          TEXT    NOT NULL CHECK (kind IN ('item', 'game')),
  id            TEXT    NOT NULL,
  owner_email   TEXT    NOT NULL,
  shared_at     INTEGER NOT NULL,
  hidden_at     INTEGER,
  hidden_by     TEXT,
  hidden_reason TEXT,
  PRIMARY KEY (kind, id)
);
CREATE INDEX IF NOT EXISTS idx_public_shares_owner ON public_shares (owner_email);
CREATE INDEX IF NOT EXISTS idx_public_shares_when ON public_shares (shared_at);

ALTER TABLE classes ADD COLUMN public_sharing_off INTEGER NOT NULL DEFAULT 0;
