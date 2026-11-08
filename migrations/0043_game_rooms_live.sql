-- 0043: real-time rooms (codehs-review/REALTIME-SPEC.md). A room made by a
-- sketch that called multiplayer(mode, n, { realtime: true }) is a LIVE room:
-- its moves and shared sprites travel over a WebSocket to a Durable Object
-- (workers/live/, GET /api/live/[code]) and nothing per move is written here.
-- The lobby lists live rooms only to real-time sketches and polling rooms only
-- to the rest, so one never joins the other. Every row before this is 0.
ALTER TABLE game_rooms ADD COLUMN live INTEGER NOT NULL DEFAULT 0;
