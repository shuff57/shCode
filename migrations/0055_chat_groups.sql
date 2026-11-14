-- 0055: group chats, class channels, and three messaging levels (owner's decision 2026-11-14).
--
-- A conversation (message_threads, 0053) can now also be:
--   kind 'group'    2-8 people of one class, made by a student or a teacher. Its people are its
--                   message_members rows; `title` is its name ('' = shown as its people's names).
--                   pair_key is 'group|<id>'.
--   kind 'channel'  the whole class: everyone in the class now reads and (unless `locked`) posts.
--                   `title` is the name (#general is made for every class the first time it is
--                   needed). Anyone may add a channel; a teacher can lock (only teachers post),
--                   rename or delete one. pair_key is 'channel|<class id>|<name>', so two channels
--                   of one class never share a name. A channel's message_members rows only hold
--                   read_at (made when someone opens or posts in it), never who may read it.
-- The class's teachers read every group and channel of the class, as they read conversations
-- between two students.
--
-- Levels. What a STUDENT may send, per class and per student; the stricter wins:
--   0 On, 1 Teacher only (messages to a teacher of the class only), 2 Off (nothing; reading stays).
--   classes.student_messages_off was 0/1 (1 = classmates off), which reads the same as levels 0/1.
--   class_message_mutes (0053, "paused") gains `level`: every existing row means 1, its default.

ALTER TABLE message_threads ADD COLUMN title TEXT NOT NULL DEFAULT '';
ALTER TABLE message_threads ADD COLUMN locked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE class_message_mutes ADD COLUMN level INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_message_threads_class_kind ON message_threads (class_id, kind);
