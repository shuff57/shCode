-- 0060: a host student and their approved guest may message each other in soSHial (owner's decision 2026-11-14;
-- reverses the "no messaging" line of the 0059 guest spec).
--
-- It is an ordinary two-person conversation (message_threads.kind 'students') filed under the HOST's vouching class, so
-- everything messaging already guarantees carries over: that class's teachers read it and can Remove a message, the
-- personal-details filter and the rate caps run, and a teacher's messaging level for the host governs both directions.
-- `guest` marks it, so the page can say who reads it ("a teacher of the class that invited them") and so a guest's caps
-- apply even to an adult's teacher-role account. The guest member's stored name carries " (guest)".
--
-- It is host-and-guest ONLY: a guest is on no roster, so classPeople(), groups, channels and @mentions never include them.
-- Ending the guest (host, guest, teacher, class switched off, class archived, approval expired) stops sending; both people
-- keep reading what was said.

ALTER TABLE message_threads ADD COLUMN guest INTEGER NOT NULL DEFAULT 0;
