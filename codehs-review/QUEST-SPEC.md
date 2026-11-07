# Quest: a turn-based RPG battle, as a chain of day-modules (7.16-7.21)

Build spec, written 2026-11-07. A student asked for it (issue report #70: "Let's make a turn-based
RPG"); the course owner chose it after Trail and Checkers, as a Unit 7 chain after Breakout (7.12-7.15).
The 7.21 number was pencilled in for the Unit 7 capstone in `BUILD-YOUR-OWN.md`, which does not
exist yet; it moves after this chain. Folder ids: `7-16-quest-*` … `7-21-quest-*` (new folders, like
Trail's and Checkers'; older Unit 7 modules keep their 5-3 / 5-5 / 5-9..5-11 / 6-10 prefixes).

**Quest is an original game.** Do not name or describe any commercial RPG.

**Follow `TRAIL-SPEC.md` and `CHECKERS-SPEC.md` for everything this file does not say**: file
shapes, category ("Unit 2: moSHion: Applied Game Development"), voice, cards (regex, ignoreStrings,
keepShortStrings, "Help: 7.N.M (title)" pointers, no backticks in card text), aiCheck on labs,
aiGrader on every assignment screen, quiz shape, carryFrom, the tolerance block in
`scripts/test-grader-tolerance.mjs` (add a Quest block). Week: 19.

## What Unit 7 has taught, and the one hard limit

By 7.15 students have written classes with `constructor`, `this`, methods, a method that takes
another of their objects (`takeHit`, `isAlive()`, a hit with a floor), arrays of instances, `filter`,
`map`, `static`, and Defender's refactor into objects (7.9-7.11). **7.2's vocabulary reading says "You
will not write `extends` or `super()` this year."** So Quest uses ONE class and composition: enemy
kinds are data (`KINDS`), not subclasses. Never write or ask for `extends`/`super`.

`after(frames, fn)` was only met in an optional 6.21 challenge: 7.17.1 teaches it properly.
`randomSeed(Date.now())` was taught in 6.23.1 (cite it). Number keys: `kb.presses('1')`.

## The game

`class Fighter { name, maxHp, hp, power, potions, guarding }` with `isAlive()`, `takeHit(n)` (halved,
rounded down, while guarding; guard lasts one hit; never below 0; returns the damage taken),
`attack(target, roll)` (power + roll 0-3, through `target.takeHit`), `guard()`, `heal()` (a potion:
up to 12 back, capped at maxHp, returns hp gained), `levelUp()` (+5 maxHp, full hp, +1 power, potions
back to 2) and `draw(x, y)` (a body, the name, an hp bar, hp and potions, a gold ring while guarding).

`fighters[0]` is you, `fighters[1]` who you face; `turn` is 0 or 1; `act(t, a, roll)` is one action
(1 attack, 2 guard, 3 potion) by fighter t on the other. On your turn press 1, 2 or 3; the enemy's turn
comes `after(45, enemyTurn)` and its choice is "potion when low and it has one, else a guard one time in
four, else attack". Campaign: `KINDS` (Slime, Goblin, Ogre, with hp/power/potions) become `enemies`
with `map`; beating one levels you up and brings the next; beating all three wins; R starts again.
Online: H hosts a duel (Red, seat 0, vs Blue, seat 1, both fresh); a move is `{ act, roll }`, applied in
`onMove` only when it is that seat's turn and `goodMove` says act is 1-3 and roll 0-3, whole numbers.

**Balance was measured** (`balance.mjs`, 40 seeded games each): only ever attacking wins 14/40;
drinking a potion below 35% hp wins 36/40. The choices matter. Keep these numbers unless you re-run it.

## Reference code: `codehs-review/quest-ref/`

All run clean in `scripts/moshion-harness.mjs`; each lab stage is a strict extension of the one before
(the hero's constructor gains `potions` in 7.18, the one signature change, called out in its steps);
`rules-check.mjs <file>` passes 9/9 on e-online (2 on B, 6 on C, 7 on D); a two-tab online duel was
checked in a real browser (boards identical, out-of-turn key ignored).

**Changed while building (2026-11-07).** `d-campaign.js` (and `e-online.js` the same way) showed
`Fight 4 of 3` under "You beat them all!": `fightOver` added 1 to `which` before asking whether the
enemy just beaten was the last. It now asks `which === enemies.length - 1` first and only then moves
on, so the strip reads `Fight 3 of 3` at the win; the 7.19.1 reading teaches that order. In
`e-online.js`, a duel's first message said "Your turn" on both computers and nothing ever said whose
turn it was: the duel's first message is now `Red goes first: ...` and the ready line reads
`Online duel: you are Red. Turn: Blue`. `rules-check.mjs` still passes 9/9 on `e-online.js` and
`balance.mjs` still gives 14/40 (attack) and 36/40 (smart): no number moved.

| File | Is the solution of |
| --- | --- |
| `sb1-bar.js` | 7.16.3 Sub-build: An object that draws itself |
| `a-fighters.js` | 7.16.4 Lab: Two fighters |
| `sb2-hit.js` | 7.17.2 Sub-build: One object hits another |
| `b-attacks.js` | 7.17.3 Lab: Trade blows |
| `sb3-choices.js` | 7.18.2 Sub-build: A flag and a count inside an object |
| `c-actions.js` | 7.18.3 Lab: Attack, guard or potion |
| `sb4-kinds.js` | 7.19.2 Sub-build: A list of kinds becomes a list of objects |
| `d-campaign.js` | 7.19.3 Lab: A run of enemies |
| `sb5-online.js` | 7.20.2 Sub-build: Send an action |
| `e-online.js` | 7.20.3 Lab: Duel a classmate |

## The chain

| Module | Screens |
| --- | --- |
| **7.16 Quest: plan and the fighters** | 1 Plan: Break Quest into parts (assignment + aiGrader) · 2 Reading: One class, many fighters · 3 Sub-build · 4 Lab |
| **7.17 Quest: trade blows** | 1 Reading: A method that hits another object, and after() · 2 Sub-build · 3 Lab |
| **7.18 Quest: choices** | 1 Reading: Three actions, a flag and a count · 2 Sub-build · 3 Lab |
| **7.19 Quest: a run of enemies** | 1 Reading: Kinds as data, map, and levelling up · 2 Sub-build · 3 Lab |
| **7.20 Quest: duel online** | 1 Reading: Same battle, a classmate takes the other turn (short: cite 6.25.1 and 6.31.1; new is only the duel and goodMove for {act, roll}) · 2 Sub-build · 3 Lab |
| **7.21 Quest: playtest and extend** | 1 Playtest and reflect (aiGrader) · 2 Check (5 MC) · 3 Challenges (moSHion lab carried from 7.20.3, one card: a fourth enemy kind with something new, a special move with a cooldown, or a shop between fights that spends gold) |

### What each screen teaches

- **7.16.2** One class, many objects (cite 7.2): the constructor stores name, maxHp, hp, power, color;
  `isAlive()`; a `draw(x, y)` method so each fighter draws itself (an hp bar is `rect` width times
  `hp / maxHp`). Two fighters in an array, `fighters[0]` and `fighters[1]`.
- **7.16.4** Lab starter: the class with an empty `draw` (`// STEP` comments) and `fighters` already
  made, so Run shows nothing; cards: a draw method; an hp bar scaled by hp / maxHp; both fighters drawn.
- **7.17.1** A method that changes another object (cite 7.3's method that takes another of your objects):
  `attack(target, roll)` calls `target.takeHit(...)`; `max(..., 0)` floor; returning the damage so the
  message can say it; `turn = 1 - turn`; `after(45, enemyTurn)` and why the enemy waits.
- **7.17.3** Lab cards: takeHit never below 0; attack goes through the target's takeHit; the turn passes;
  the enemy acts after a pause; a win or a loss ends it and R restarts.
- **7.18.1** A flag inside an object (`guarding`, cleared by the next hit) and a count (`potions`);
  `floor(n / 2)`; `min(hp + 12, maxHp)`; one `act(t, a, roll)` for all three actions, chosen with 1/2/3;
  the enemy's simple choice. The constructor gains `potions`: every `new Fighter(...)` call changes.
- **7.18.3** Lab cards: guard halves the next hit; a potion heals, capped, and uses one up; keys 1-3 pick
  the action; the enemy can choose too.
- **7.19.1** Kinds as data: a list of plain objects turned into objects with `map` (cite where map was
  taught); `which` and moving on; `levelUp()` changes one object's own state.
- **7.19.3** Lab cards: enemies made from KINDS with map/a loop; beating one brings the next; levelUp
  raises max hp and power; beating the last one wins.
- **7.20.1** Only what is new: a duel uses the same `act`; the move is `{ act, roll }` (the sender rolls,
  so both computers use the same roll); `goodMove` checks both are whole numbers in range; seat === turn.
- **7.20.3** Lab cards: a choice sends `{ act, roll }`; `act` runs in onMove; it checks seat and goodMove;
  the campaign still works offline.

## Lessons from the Trail and Checkers walks: build them in from the start

- Every assignment screen has an `aiGrader`; Submit must be able to turn on.
- Walk your own steps literally on the starter: no step names a function the student was not told to
  write, no step leaves code that throws; a step that changes an existing line describes the change by
  what it does and says "your names may differ" for carried code.
- Steps say where a line goes ("below the line that says whose turn it is").
- Give a quick way to test what is hard to reach (a fight that starts with the enemy at 3 hp, a hero
  with 1 hp), and say to put it back.
- Online text fits the 480 px canvas; status 'off' never shows null; the room code is big; say that ONE
  player hosts again and the other joins the new code.
- Cards: lax for correct phrasings, but never green on a literal in a string or comment, a value after a
  comma in an unrelated call, a cosmetic constant, or a method that is defined but never used for the thing.
- The quiz's right option is never the longest.
