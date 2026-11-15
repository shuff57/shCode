-- 0062: what a student tells their teacher about the person they invite as a guest (owner's decision 2026-11-15: "make sure I collect
-- relevant information about who a student is trying to invite"). The teacher approves a guest on exactly this plus the guest's own
-- account (address, role, age of the account), so it is asked for up front and shown on the teacher's Guests card.
--
-- All of it is the HOST'S claim, in their own words, checked for personal details (no phone, email, street address): the guest's name,
-- an age group (a guest has to be 13 or older; adult guests are flagged for the teacher), where they go to school or work, and what
-- the two of them will do together. `relation` (0059) stays "who are they to you". Rows from before this have empty strings.

ALTER TABLE sandbox_guests ADD COLUMN guest_name    TEXT NOT NULL DEFAULT '';
ALTER TABLE sandbox_guests ADD COLUMN guest_age     TEXT NOT NULL DEFAULT '';   -- 'teen' (13 to 17) | 'adult' (18 or older) | '' (before 0062)
ALTER TABLE sandbox_guests ADD COLUMN guest_org     TEXT NOT NULL DEFAULT '';   -- where they go to school or work
ALTER TABLE sandbox_guests ADD COLUMN guest_purpose TEXT NOT NULL DEFAULT '';   -- what they will do together
