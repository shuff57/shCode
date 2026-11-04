# One day, one module: the games as chains of day-modules

Design spec, drafted 2026-11-04 on `codehs-inspiration`. Nothing is built by this file.

**The rule.** A game is not one module. It is a **numbered chain of day-modules**, one buildable
element each, ending with a playtest module. A day-module is 40-55 minutes of authored work and
finishes with something that runs. The student's file carries from module to module
(`CARRY-FORWARD-SPEC.md`), which is what makes the chain possible at all.

**What attaches where.** A group that is only playtest, check or challenges is not an element:
it becomes an optional extension at the end of the chain's last module, or the last module
itself when it has a written reflection. Every element module gets one sub-build
(`SUB-BUILDS.md`) between its reading and its apply lab.

**Consequence for the numbering.** With every game split, Flappy does **not** sit at 5.4-5.6.
Pinball splits first (it is 4.1 hours, seven elements), so Flappy is **5.10-5.12**. Keeping
Flappy at 5.4-5.6 would require Pinball to stay a single module, which is the one exception this
rule exists to remove.

---

## Unit 5 — 22 modules

| Module | Day | Screens | Min |
| --- | --- | --- | --- |
| 5.1 Hello Sprite (skill, unchanged) | — | 26 lessons | 269 |
| 5.2 Physics Feel (skill, unchanged) | — | 22 lessons | 331 |
| **5.3 Pinball: the table** | 1 | plan · reading · example · lab build the table | 40 |
| **5.4 Pinball: score once** | 2 | reading edge · example · **SB score once** · lab one point · lab three bumpers | 46 |
| **5.5 Pinball: lose and start again** | 3 | reading state · **SB end and start** · lab lose/restart | 26 |
| **5.6 Pinball: a sound on a hit** | 4 | reading · **SB one key, one sound** · lab chime | 30 |
| **5.7 Pinball: labels and popups** | 5 | reading words · example "+5" · **SB float and die** · lab show the worth | 40 |
| **5.8 Pinball: physics knobs** | 6 | reading four knobs · **SB two masses** · lab nudge | 32 |
| **5.9 Pinball: playtest and finish** | 7 | playtest and reflect · challenges (optional) | 30 (+25) |
| **5.10 Flappy: the flap** | 8 | plan · reading · example · **SB gravity and a tap** · lab flap | 46 |
| **5.11 Flappy: the world scrolls** | 9 | reading scroll · **SB spawn and recycle** · lab pipes · **SB score once** · lab score a gap | 50 |
| **5.12 Flappy: crash, and finish** | 10 | lab crash/restart · playtest · check · challenges (optional) | 37 (+25) |
| **5.13 Snake: grid and steering** | 11 | plan · reading grid · example walking · **SB step on a grid** · lab steer | 52 |
| **5.14 Snake: grow** | 12 | reading body grows · **SB one longer snake** · lab grow and eat | 32 |
| **5.15 Snake: search** | 13 | reading searching · **SB am I in my own tail** · lab don't bite yourself | 31 |
| **5.16 Snake: playtest and extend** | 14 | playtest · check · challenges (optional) | 33 (+25) |
| **5.17 Pocket: plan and the aim line** | 15 | plan · reading pointer · **SB an aim line** · lab aim line | 45 |
| **5.18 Pocket: which way, how fast** | 16 | reading direction/speed · **SB pull back and let go** · example · lab shoot | 45 |
| **5.19 Pocket: slow to a stop** | 17 | reading drag/rails · **SB slow to a stop** · lab slow/stop/count | 45 |
| **5.20 Pocket: the pocket** | 18 | reading pass-through · **SB a pocket you roll over** · lab sink it | 45 |
| **5.21 Pocket: playtest and extend** | 19 | playtest · check · challenges (optional) | 35 (+25) |
| **5.22 Build your own** | 20 | the unit 5 capstone (`BUILD-YOUR-OWN.md`) | 60 |

Seven Pinball modules, three Flappy, four Snake, five Pocket, plus the capstone. Every element
day is 26-52 minutes; the two lightest (5.5 at 26, 5.6 at 30) carry the reading and the sub-build
that the day after them does not repeat.

## Unit 6 — games split the same way

The same rule applies where unit 6 has a game, and only there. Skill modules (6.1-6.8) stay as
they are until their own pacing is looked at.

| Game | Chain | Days |
| --- | --- | --- |
| Breakout | plan and the ball · paddle and bounce · bricks and edges · the game · playtest | 5 |
| Sling | plan · the arm · launch · out and gone · hits and budget · playtest | 6 |
| Climb | plan and platforms · the foot · scroll and recycle · coins · the follower · playtest | 6 |

That renumbers 6.9-6.11 (grids, Breakout, sound) and the Sling/Climb placeholders, so it is a
**second stage**, after unit 5 ships. Doing both at once triples the migration for a unit nobody
has built yet.

## Unit 7 — Defender is already a chain

7.4-7.6 are three modules for three elements, which is the rule working. The measurements say
7.6 is over-full (design 25, refactor 77, close 65), so it splits into **design**, **refactor**
(two days, because 77 minutes is two elements: the three classes, then the removal rule) and
**close**. That makes Defender five day-modules and is the first thing to fix after unit 5.

---

## Cost and order

1. **Unit 5 split** — 7 + 3 + 4 + 5 modules created, their lesson assignments taken from the
   existing group files, module docs and group files written, 22 numbers assigned. The lessons
   already exist; this is a migration, not authoring.
2. **The five Pinball sub-builds and the four Pinball module splits are the pilot**: they prove
   the chain end to end (carry-forward, sub-build, module page, due row) before Snake and
   Pocket copy it.
3. **Unit 6** after unit 5 ships; **unit 7's 7.6 split** after that.

## Open

1. **Light days.** 5.5 (26 min) and 5.6 (30 min) are under the 40-minute target. Merge them into
   one "lose, restart and sound" day, or leave the air? Recommendation: leave them — Pinball's
   early days are where a beginner is slowest, and the plan's own pacing is 3.5 hours a week,
   not five full days.
2. **Module docs.** Each day-module needs a short doc (goal, screens, what carries forward). I
   would keep them to a page, not the 3-4 pages the current game modules have.
