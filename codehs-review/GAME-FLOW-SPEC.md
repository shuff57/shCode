# Versions, proposed changes and updates: a small GitHub flow for the Games library

Design spec, 2026-11-10. The course owner asked for an update, pull request and fork flow in the Games
library that matches GitHub flow, scaled down for beginners. Built on branch `game-flow`.

**Decisions (owner, 2026-11-10).**
- **Words:** plain words on every button, and one small line per panel naming the GitHub term ("On GitHub
  this is called a *pull request*.").
- **Threads:** a proposed change has a GitHub-style conversation. It is free text, it can run long, and any
  classmate who can see the game can join in. This is the one place in the Games library where students type
  to each other. #96's fixed-list feedback on games ("Add more levels") is a separate feature and stays
  fixed-list, and rooms stay game data only. Teachers can read every thread, remove any comment, lock a
  conversation and remove a proposal.
- **Naming:** #96 already uses "suggestions" (a fixed list). So a pull request here is a **proposed
  change**: the button is **Propose this change**, the table is `game_changes`, and the routes are
  `/api/game-changes`.

## What exists (keep it working)

Read CLAUDE.md "Games library" and "Sharing choices and remix credit" first. Most of a fork flow is already
built:

| GitHub | shCode today | Where |
| --- | --- | --- |
| fork | **Remix**: copies a game's code into the student's moSHion sandbox draft and remembers where it came from | `remixIntoSandbox`, `lib/games-client.ts` |
| upstream link | `remixed_from_*` / `origin_*` on the row, `from` in `shCode:sandbox-game` | migration 0045, `lib/share-choice.ts` |
| licence | the four sharing choices (`play` blocks a fork; `open` keeps forks open) | `lib/share-choice.ts` |
| push | **Update game** overwrites `library_games.code` in place | `POST /api/games` with `id` |
| diff view | `components/DiffViewer.tsx` (side by side, `diff` v9) | teacher push banner, teacher-edit |

What is missing is the part that makes it a *flow*: no game has a history (Update overwrites), a remix has no
way to send its change back, and an original that improves after a remix has no way to reach the remix.

## The flow, in the students' words

```
  Sam's game "Plane" (version 3)
        │
        │  Remix                                    ← fork (exists)
        ▼
  Ana's sandbox: Plane remix
        │  edits, Run, Run, Run
        │
        │  Propose this change to Sam R.            ← open a pull request
        │  "What did you change, and why?"
        ▼
  Sam's Library → My games → Plane → 1 proposed change
        │  See the changes   (DiffViewer)           ← Files changed
        │  Try it            (runs on /play)        ← check out the PR and test it
        │  Accept  /  No thanks + short reply       ← merge / close
        ▼
  Plane version 4 · "Ana T.'s change: added a second level"
  "With changes by Ana T."                          ← contributors

  Meanwhile Ben remixed Plane at version 3:
  sandbox note: "Plane has a newer version."
        │  Bring in the newest version              ← sync fork
        ▼
  Ben's code + Sam's new lines, his old code in History
```

The table every screen and the reading use:

| GitHub | shCode button / words |
| --- | --- |
| commit + message | **Update game** asks "What did you change?" and saves a version |
| log | **History** on a game card: version, what changed, who, when |
| revert | **Go back to this version** (makes a NEW version; nothing is ever deleted) |
| fork | **Remix** (unchanged) |
| pull request | **Propose this change** |
| PR title + description | "What did you change?" (short) and the first comment |
| PR conversation | the thread: comments from the maker, the proposer and classmates |
| update the PR branch | **Update my proposal** (sending again replaces your open one) |
| close your own PR | **Take it back** |
| review: files changed | **See the changes** |
| check out and test | **Try it** |
| merge | **Accept** |
| close | **No thanks** (optional short reply) |
| sync fork | **Bring in the newest version** |
| merge conflict | "You and Sam both changed the same lines." |
| contributors | "With changes by Ana T. and Ben K." |

## Part 1: versions (commit, log, revert)

Useful without the rest, and Parts 2 and 3 depend on it. Ship it first.

- Migration `0048_game_changes.sql` (one migration for all of it):
  - `library_games ADD COLUMN version INTEGER NOT NULL DEFAULT 1`
  - `library_game_versions (game_id, version, code, message, author_name, author_email, change_id,
    created_at, PRIMARY KEY (game_id, version))`. `author_name` is first name + last initial, as everywhere
    else; `author_email` is server-only (teacher tools, Clear Library), and never in an answer to a student.
- `POST /api/games` with `id` (Update) takes `message` (1-80 characters, `cleanTitle`'s rules, error
  "Say what you changed, in a few words."); a body without one (a stale cached page) saves as "Updated the
  game" rather than losing the update. In one `DB.batch` (`saveVersionStmts`) it writes the new code as
  `version + 1` and bumps `library_games.version`, only if the game is still at the version it read; a race
  is a 409. A first publish writes version 1, "First version". A game published before 0048 has no version
  rows: its first save writes the old code as version 1, "First version", first.
- Keep the newest **20 versions** per game; older rows go on the next write. 30 games x 20 x 64 KB is the
  worst case per student (38 MB); real games are 5-15 KB. If D1 size becomes a concern, gzip `code` the way
  `commits.files_gz` does.
- Routes: `GET /api/games/[id]/versions` (list: version, message, author, date, no code) and
  `GET /api/games/[id]/versions?v=N` (one version's code and the one before it, for a diff). Visibility is the same 404 rule as
  `GET /api/games/[id]`, plus `canRemix` for anyone who is not the owner (a "just play" game shows no code
  now, and its history must not either).
- `POST /api/games/[id]/versions {revertTo}` (maker only) makes a new version with that version's code,
  message "Went back to version 2".
- UI: **History** on a My games card opens `/changes?game=<id>&tab=history`. Each row has **See the changes** (DiffViewer, that
  version against the one before it) and **Go back to this version**, which asks first. `/play` shows
  "Version 4" next to the title.
- The sandbox's Update panel gets the "What did you change?" field, with the placeholder "Added a second
  level". The publish button stays disabled until it has text.

## Part 2: proposed changes (pull request, review, merge)

- Who may propose: anyone who can see the game and its code (`gameAccess` in `functions/_shared/gameFlow.ts`:
  shared into a class they are in, not hidden, choice not `play`), except its maker, who just Updates. No
  owner switch in v1. A proposal is sent **from the sandbox draft**, so a remixer does not have to publish a
  game of their own first (GitHub needs a fork repo; a beginner does not).
- `game_changes` stores the proposed code AND `base_code` (read by the server from the version the remix
  started at, `shCode:sandbox-game.fromVersion`; a pruned or unknown base falls back to the game now), so
  the diff survives pruning. One open proposal per person per game: proposing again updates it (an
  `updated` event). Caps: 10 open per game, 20 new per student per day.
- **The conversation** (`game_change_comments`): comments (1-1000 characters, 30 lines, plain text, `<` and
  `>` allowed because students paste code) and events (`opened`, `updated`, `accepted`, `declined`,
  `withdrawn`, `reopened`, `locked`, `unlocked`, `removed`, `closed`). The maker, the proposer, any
  classmate who can see the game and the class's teachers read it; all of them can comment while it is not
  locked. **It stays open after Accept or No thanks**, as a merged or closed pull request does, until the
  maker or a teacher closes it (a teacher can still post). A removed proposal, or one whose game was
  deleted, takes no comments. Its writer or a teacher deletes a comment; the thread then says who did.
  40 comments per student per hour (teachers exempt), 300 per conversation. Rows are ordered by insertion.
- **Accept is a merge** (`lib/game-merge.ts`, a line three-way merge over `diff` v9's `diffArrays`). The
  GET answer carries `after`, the code Accept would save; Try it runs it; Accept sends the version the
  maker looked at and a game that moved since is a 409 ("look again"). A clash is a 409 that leaves the game
  untouched, and the page says the proposer needs to bring in the newest version. A successful Accept
  writes the new version credited to the proposer ("Ben D.'s change: ...", `change_id` set) in the same
  batch as the status and the event.
- Credit: `/play` and the Library say "Version N · With changes by Ana T. and Ben K." (accepted proposals
  in the kept versions).
- **Execution rule (unchanged):** proposed and merged code run only in `MoshionPreview` on
  `/play?game=<id>&change=<cid>`, with the room key `try-<id>`, so trying never joins the real game's rooms.
- Routes: `GET|POST /api/games/[id]/changes`, `GET /api/game-changes` (the Library inbox: received, sent,
  joined), `GET|POST /api/game-changes/[cid]` (actions `comment`, `delete-comment`, `accept`, `decline`,
  `withdraw`, `reopen`, `lock`, `unlock`, `remove`), `GET /api/classes/[id]/game-changes` (teachers:
  every proposal on the class's games and the newest 60 comments).
- UI: **Propose change** in the moSHion sandbox toolbar (`components/ProposeChangeButton.tsx`, only while
  the draft is a remix of a classmate's game; See my changes before sending); `/changes?id=<cid>`
  (`components/ChangeThread.tsx`: Conversation, See the changes, Try it, the role's buttons);
  `/changes?game=<id>[&tab=history]` (`components/GameChangesHub.tsx`); Library -> Games "Proposed changes"
  (`components/GameChangesInbox.tsx`, "new" from localStorage `shcode.gameChanges.seen`); the class page's
  Students tab "Proposed changes to games" (`components/ClassGameChanges.tsx`).
- Clear Library removes a student's open proposals and closes the ones on their games; deleting a game
  closes its open proposals.

## Part 3: bring in the newest version (sync fork)

- For a remix: when the original's version is newer than `fromVersion`, the Propose change button shows a
  dot and the panel offers **Bring in the newest version**: `mergeChange(base = fromVersion's code,
  theirs = newest, current = sandbox)`. Success writes the merged code into the open editor (the old draft
  to History first) and moves `fromVersion`. A clash changes nothing and offers **See both**, **Keep mine
  for now** and **Start from the newest version** (the student's code to History first). No conflict
  markers, ever.
- For the maker (added while building): the sandbox also remembers which version of the student's OWN game
  it holds (`shCode:sandbox-game.version`). When the game is ahead (they accepted a change, or updated from
  another computer), the Publish panel says so and offers **Bring in version N** before Update would replace
  it. This is GitHub's rejected push, as a warning rather than a refusal.

## Part 4: teach it

- Done: a "Sharing and changes" section in the moSHion docs (`lib/moshion-docs.ts`, slug `sharing`, five
  pages: versions, remix, proposing, bringing in the newest, how it matches GitHub), linked from the panels
  (`FLOW_DOCS` in `lib/game-flow-core.ts`).
- Not done: a lesson (adding one touches the curriculum, the manifest and open dates), and the What's New
  entry, which needs a recording (`scripts/whats-new/record.mjs`) and the real ship date. Add both at ship time.

## Tests

- `scripts/test-game-merge.mjs` (22): one side unchanged, separate places, neighbouring lines, same line,
  same insert spot, delete vs change, the same edit on both sides, CRLF, empty, top and bottom inserts,
  stability.
- `scripts/test-game-flow.mjs` (97), the real handlers on SQLite: versions (notes, stale-page default, the
  pre-0048 backfill, pruning, going back), who sees what, proposing (caps, update in place, unknown base),
  the conversation (join, close, teacher posts, deletes and their markers, badges), accept (stale version,
  merge with the maker's own edit, credit, conflict leaves the game untouched), No thanks / take back /
  reopen, teacher remove, the class route, the inbox, "just play", deletes, Clear Library, no emails.
- Both are in `npm test`. `server.js` routes every endpoint for dev; two `dev_student` cookies with
  `dev_role=student` are the maker and the remixer.

## Deploy

Apply 0048 (`npm run d1:migrate`) before the site: the new code reads `library_games.version`, and a Function
that selects a column the database does not have answers 500. 0046 and 0047 come from the parallel #96 /
sketch-saves work; wrangler applies migrations by name, so the order they land in does not matter as long
as all are applied before the deploy.

## Limits on purpose

- One file (`script.js`), because a game is one file. No branches: the sandbox draft is the working copy.
  No line comments in review. No proposals on lessons, only on Library games.
- A proposal carries code only. A new picture or sound the proposer made is not part of it, and Try it names
  such pictures as missing.
