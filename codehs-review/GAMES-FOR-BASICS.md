# Games for the missing basics: three lineups for the functional block (5.1-5.5)

Drafted 2026-11-03, branch `codehs-inspiration`, read-only. A proposal for the owner; nothing is decided or built.
Sources: `MOSHION-COVERAGE.md` (Chapter 5 scope check, gaps), `PLACEMENT.md` and the Mini Golf / Projectiles /
Jumper structure reads it cites, `CAPSTONE-SPEC.md`, `PACING.md`, `RELEASE-CH5.md`, the module docs 5.2-5.5 and
5.9-5.11, and CLAUDE.md (D1 schema, open dates). Structure and ideas only; no CodeHS text.

## 0. Findings that change the picture

1. **Defender 5.9-5.10 already teaches firing with no classes.** Part A: a ship, shots on a cooldown, `overlaps()`
   hits, delete-and-splice, a `playing` flag, restart. Part B: many enemies, a nested hit loop, waves. No `class`,
   `this` or `Group` appears in any 5-9-* or 5-10-* folder (checked in the coverage audit). Moving them ahead of
   the classes block would cover "firing" with 17 finished lessons.
2. **Defender does not cover aiming or chasing.** `CAPSTONE-SPEC.md` section 1 chose straight-up shots and
   straight-down enemies on purpose, to avoid angles. The coverage doc's remark that Part B is "the natural place"
   for chasing conflicts with that spec. Aim and chase need a new home in every option.
3. **Only three Part B lessons lean on the classes block**: 5.10.1 (cites 5.7.15, parallel arrays vs classes),
   5.10.6 and 5.10.7 (cite 5.8.17 and 5.8.18, the wave check and spawner). 5.9 has no such pointers. So moving
   A and B forward costs a handful of reworded sentences, not a rewrite.
4. **Displayed numbers are cheap to move, ids are not.** A module page orders lessons by the number at the start
   of each `title`. `scripts/renumber-module.mjs` retitles lessons and rewrites citations from a plan file without
   renaming folders. The folder name is the id that D1 keys on, so ids stay put by construction.
5. **Moving Defender A/B forward is a rotation, not an insertion.** Old 5.9, 5.10, 5.6, 5.7, 5.8 become 5.6, 5.7,
   5.8, 5.9, 5.10, and 5.11 stays. The module count stays at 11. Adding new modules before 5.6 shifts every
   later number instead.

## 1. Basics still untaught in 5.1-5.5, ranked

| # | Basic | The skill, in plain words | Names | Today |
|---|---|---|---|---|
| 1 | Firing projectiles | Make a new sprite when a key or click happens, send it somewhere, clean it up when it leaves the screen or hits something. | new Sprite on input, vel, `.life`, delete + splice, `overlaps()` | Taught only in 5.9-5.10, after the classes |
| 2 | Platforms and ground sensing | Stand on a fixed sprite, jump only while standing, keep the player inside the world. | static platforms, `colliding(ground)`, `addSensor()`, `Walls`, `constrain()` | Only the 5.2.9-5.2.10 jump on one floor |
| 3 | Chasing enemies | Move a sprite toward a target at a speed slower than the player's; lose on touch. | `.moveTowards()`, `.angleTo()`, `.distanceTo()`, speed | Nowhere (Defender enemies only fall) |
| 4 | Mouse input and aiming | Read where the pointer is; act on a press, a hold and a release. | `mouse.x/y`, `presses()`, `pressing()`, `released()` | Only "try this" lines in 5.1.22/5.1.24; first reading 5.7.15 |
| 5 | Direction and speed | Describe motion as "this fast, this way"; turn a sprite to face a point. | `.direction`, `.speed`, `.rotateTo()`, `dist()`, `min()` | Docs drawer only |
| 6 | Pass-through targets | A goal, coin or hole you touch without bouncing off. | `collider = 'none'` + `overlaps()` | First graded use 5.7.19, before its reading at 5.9.5 |
| 7 | Safe custom field names | Which names a sprite already owns, so your own field does not clash. | the clash list | Docs drawer only (a warning is being added to 5.3.8 / 5.5.2) |
| 8 | Slowing and stopping | Drag that bleeds speed; "stopped" as speed under a small number. | `.drag`, `.speed`, `abs()` | Docs drawer only |
| 9 | Timer helpers | Run something every n frames, or once after n frames. | `every()`, `after()` | Idea in 5.2.1-5.2.4; names drawer only |
| 10 | Centred text, staying on screen | Centred title / game-over text; a ship or bird that cannot leave. | `textAlign(CENTER)`, `constrain()` | First at 5.8.2 / 5.9.4 |
| 11 | Physics knobs | Heavy vs light, floaty vs sinking, a player that will not tip. | `.mass`, `.gravityScale`, `.rotationLock`, `.debug` | Drawer only |
| 12 | Things that expire | A sprite that removes itself after n frames. | `.life` | Drawer only |
| 13 | Plain shapes | An aim line, a board outline, a HUD bar. | `line()`, `rect()`, `stroke()` | 5.6.8 / 6.5.22 |
| 14 | Sprite art | An emoji or named texture instead of a coloured box. | `.image`, `.texture` | 6.4.3 |
| 15 | Saved high score | A best score that survives a reload. | `storeItem()`, `getItem()` | 6.5.3 |
| 16 | Math helpers | `round`, `min`, `max`, `abs`, `dist`, `random([list])` | | Accepted alternatives only |
| Done | Sound (5.3.13-14), the `update()` hook (5.2.21-22) | | | Built; do not touch |

Rows 1-6 are the real homeless basics. Rows 7-16 are small enough to ride inside whichever game is built.

## 2. Three lineups

A "builder round" is about 5-6 lessons built, gated and lens-looped. One extra round covers integration
(renumber, pointers, manifests, docs drawer, gates).

### Option A: Reuse first (move Defender A and B forward, add three small batches)

Pinball, Flappy and Snake stay. Defender A and B (17 lessons) move in front of the classes block. Defender C
stays after the classes as the OOP version.

- **5.3 Pinball+ "Aim and launch"**: add ~8 screens: 2 readings (pointer and drag; direction + speed), 1 example,
  4 labs (drag-to-aim line, power cap with `min`/`dist`, slow to a stop with `.drag`, a pass-through hole with
  `overlaps()` and strokes vs par), 1 short reading on reserved field names. New folders `5-3-pinball-aim-*`.
- **5.2 "Stand on it"**: add ~5 screens: a reading, an example, 2 labs (platform level; jump only when grounded,
  with `Walls`), a mini-check. Fixes the jump lab that lets the player fall forever. New folders `5-2-platforms-*`.
- **5.5 Snake "A hunter on the grid"**: add ~5 screens: reading on stepping toward the target, a lab for a ghost
  that steps toward the head every n ticks, a lab to lose on contact, one sidebar on `moveTowards()`/heading for a
  free-moving sprite, a challenge. New folders `5-5-snake-chase-*`.
- **Defender A, B**: reuse; edit 5.10.1, 5.10.6, 5.10.7 (the 5.7.15 and 5.8.17-18 pointers) and the module
  prerequisite lines.

New screens ~18, 17 moved. Old 5.6, 5.7, 5.8 become 5.8, 5.9, 5.10; old 5.9 and 5.10 become 5.6 and 5.7. Defender C
(5.11) stays; its prerequisite text must say "your Part B game".

Risks: the three reworded lessons need a real read (the wave check from 5.8.17 must be taught in 5.10.6 itself);
every title in five modules changes number and Help pointers in 6.x lessons that name 5.6-5.8 move too; chase is
grid-flavoured, the heading idea gets one sidebar; platforms are a 5-screen add-on and will feel smaller than the
other games; week 11 is already crowded (`PACING.md`).

Effort: Pinball+ 2 rounds, platforms 1, chase 1, move + rewording + renumber + gates 2. About **6 rounds**.

### Option B: Add two new games (nothing moves, nothing is removed)

Pinball (lighter add-on), Flappy and Snake stay. Two new modules after Snake. Defender stays after the classes.

- **5.3 Pinball+ lite**: ~5 screens: drag-to-aim, power and drag, pass-through hole.
- **New "Cannon" project** (~13 screens): plan; pointer aim; turret turns to the pointer; fire on click; expiry;
  remove offscreen and on hit; gravity arc; breakable targets with a hit budget; win check; playtest; check; challenges.
- **New "Jumper" project** (~15 screens): plan; platforms; grounded jump; side-scroll by moving platforms left
  (reuses Flappy's spawn/scroll/reap pattern); coins with `overlaps()`; `Walls`/`constrain`; facing direction; a
  walking chasing enemy (3 screens); playtest; check; challenges.

New screens ~33. Every class and Defender module is renumbered by two (old 5.6-5.11 become 5.8-5.13).

Risks: largest build; the functional block grows from three games to five before any class, in a quarter that is
already overloaded; two new module ids that are UNLOCKED on production until you add open-date rows; the renumber
(~100 lessons) breaks the 11-module shape, so bundle it with open item 12 (unit repartition). Defender A repeats
firing, so students see it twice.

Effort: Pinball+ lite 1, Cannon 3, Jumper 3, integration and renumber 2. About **9 rounds**.

### Option C: Replace Flappy with Jumper, move Defender A/B forward

Replace Flappy (5.4) with a side-scrolling Jumper that reuses Flappy's skeleton; keep Pinball and Snake; move
Defender A/B forward as in Option A.

- **5.3 Pinball+**: same 8-screen "Aim and launch" as Option A.
- **5.4 Jumper** (~16 screens, ~5 adapted from Flappy): platforms, grounded jump, coins with `overlaps()`,
  `Walls`/`constrain`, a chasing enemy stage (3 screens). New folders `5-4-jumper-*`.
- **Flappy**: retire the entry points; the folders and ids stay.

New screens ~24. Risks: Flappy was just built, gated and lens-looped, so retiring it throws away verified work
and Jumper must re-teach what Flappy taught; check D1 for `lesson_state` rows on `5-4-flappy-*` first (hide, never
delete); Defender prerequisites cite 5.4.5/5.4.6 and need rewriting.

Effort: Pinball+ 2, Jumper 3, rotation and rewording 2, retire and gates 1. About **8 rounds**.

### Basics by option

| Basic | A | B | C |
|---|---|---|---|
| Firing, expiry, reaping | Defender A (moved) | Cannon (new); Defender A repeats | Defender A (moved) |
| Hit and destroy, hit budget | Defender A/B | Cannon | Defender A/B |
| Platforms, grounded jump, `Walls` | 5.2 add-on | Jumper | Jumper |
| Chasing | Snake add-on | Jumper stage | Jumper stage |
| Mouse aim, direction + speed | Pinball+ | Cannon (+ Pinball+ lite) | Pinball+ |
| Pass-through target | Pinball+ | Jumper and Pinball+ lite | Jumper and Pinball+ |
| Drag / stop | Pinball+ | Pinball+ lite | Pinball+ |
| Field-name list | Pinball+ | Pinball+ lite | Pinball+ |

## 3. Recommendation

**Option A, with one change: make the platform batch a proper mini-project instead of a 5-screen add-on.** It
spends the fewest rounds and reuses the most verified work: Defender A/B already pass the gates, have no classes,
and teach firing, `overlaps()` and arrays. It also puts the "mess" of Part B right in front of the classes block,
which the capstone spec wanted as the motive for classes. New work is only what Defender cannot cover (aim,
platforms, chase). Option B is safest for existing material but costs the most and bloats a crowded quarter.
Option C pays to throw away Flappy for no coverage that A cannot get.

**The owner must decide:**
1. Is a 5-screen platform batch in 5.2 enough, or do platforms deserve a full small project?
2. Is a grid hunter (Snake) plus a `moveTowards()` sidebar enough for "chasing", or is heading-based chase required
   (one more round for a 5-screen top-down batch)?
3. Renumber once, together with open item 12 (the 5 / 6 / 7 unit repartition), or now?
4. Pinball+ before the 5.3.11 playtest (moves 5.3.11-14 displayed numbers) or appended after 5.3.14?
5. Retitle Defender C's prerequisite for the gap, or move the Part B reflection forward?

**Answered 2026-11-04:** moot under the adopted plan (`DEEPEN-GAMES.md` §10): Defender A/B
stay behind the classes, so no gap opens. If this option (A or C) is ever revived, retitle
C's prerequisite to "after 5.8 Inside a Class, your Part B game" and leave the Part B
reflection where it is.

## 4. What each option does to students, due dates and locks

From CLAUDE.md: progress and drafts key on the folder name; due dates, open dates and solution releases key on
`(class_id, scope, scope_id)` with lesson-over-module-over-unit inheritance; an open date **locks**; a due date is
advisory; no solution-release row means "not released"; the lock is enforced in the browser only. Verify the exact
module `scope_id` format in D1 before touching anything (a module-scope row with scope_id like `5.3` now refers to
a different module after the earlier renumber).

| Check | Option A | Option B | Option C |
|---|---|---|---|
| Folder ids change | none; displayed numbers rotate across 5.6-5.10 | none; displayed numbers shift by 2 for old 5.6-5.11 | none for kept lessons; Flappy retired, not renamed |
| Existing progress | safe; a moved lesson keeps its done state | safe | safe, except any Flappy rows: query first |
| New lessons | start "not done" | same | same |
| Due dates | module-scoped dates follow the title's module: a moved lesson may inherit a different date; check | new modules have no row | Flappy rows orphan; Jumper has none |
| Open-date locks (class "5 Intro Prog 2627", 5.2-5.11 locked until 2027-07-01) | rotation inside 5.6-5.11 is safe while all carry one date; new 5.2/5.3/5.5 lessons inherit the lock if the row is module-scoped (confirm) | new module ids are UNLOCKED until a row is added | new Jumper lessons inherit 5.4's lock only if module-scoped |
| Solution releases | no row = not released (correct) | same | delete or ignore rows for retired ids |
| Rename migration | not needed (titles only) | not needed | not needed unless a folder is renamed (then update all three tables) |
| Citations | `renumber-module.mjs`; run `check-lesson-citations`, `check-help-pointer-titles` | bundle with the repartition | plan covers 3 modules plus Flappy refs |
| Regenerate | manifest, requirements, quiz-stems, module-docs, ai-graders | same | same |
| Release branch | `release-ch5` carries 5.1-5.11; changes land on both branches | same | same |
| Grades | Unit 5 lessons are 0-point: formula unaffected | same | same |

Before any option: take a read-only count of D1 rows for `5-4-flappy-*`, `5-9-*`, `5-10-*`, `5-11-*` and for the
class's open-date rows, so the lock scope is known and not guessed.

## 5. What was not checked

- Production D1 state (lock `scope_id` format, any Flappy progress); section 4 is read from CLAUDE.md.
- Whether `_retired` hides a lesson from a module page or only drops it from the manifest.
- Line counts per new lesson are estimates from comparable modules (Snake 11, Flappy 11, Pinball 14).
- The claim that only 5.10.1, 5.10.6 and 5.10.7 cite the classes block comes from a text search for "5.6.x",
  "5.7.x", "5.8.x" in the 5-9 and 5-10 folders; ideas used without a number were not searched.
