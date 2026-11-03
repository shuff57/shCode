# cs-student-moderate lens: Chapter 5, 5.1, 5.6-5.8 (classes), 5.9-5.11 (Defender capstone)
Commit 57e7af4b (branch codehs-inspiration). No lesson files edited. Verdict: **GAP LIST** (not CLEAN). 6 real gaps, 12 low ones. The 5.9 -> 5.10 -> 5.11 seams themselves hold; the gaps cluster in the older class modules (5.6-5.8) and in 5.1.19.

Method: grader rebuilt from `lib/grader.ts` (esbuild, scratchpad `ch5m/grader.cjs`); every graded lab in scope (47) run on starter and on `solution.js` (all starters red, all references green; 5.1.24 starter 1/4 and 5.10.8 starter 1/2 are by design). Then about 330 answer variants, each copied from the course's own earlier example and given the smallest edit. Citations: `check-lesson-citations.mjs` is clean ("848 lessons, every cited lesson number resolves"); I also swept 297 three-part citations and the prose forms (two-part "5.4", "next lesson", "the drone you will meet in 5.9.5") by hand. Browser: dev server :3002, student `c5mod`, own session `ch5m`. 5.9.4 shows "Lesson locked" until the earlier lessons are done (gate works); after POSTing `completed` for 16 earlier lessons, 5.10.7 and 5.11.3 open with the starter, Run works, console clean. Quizzes 5.9.8 / 5.10.9 / 5.11.8: every `source` resolves, every key agrees with the lesson it names.

## What carried (not findings)
- 5.9.4 / 5.9.6 / 5.9.7: every shape 5.9.2/5.9.3 or 5.4.6 modelled passes (`COOLDOWN` constant, countdown after the fire, else-countdown, `constrain`, `Math.max/min`, `width - 20`, braces, `--`, nested ifs, `drone.overlaps(bullets[i])`, helper `restart()`). Cheats (no countdown, R inside `if (playing)`, `colliding`, score outside the if, baseHp set in `setup`) fail.
- 5.10.2 / 5.10.5 / 5.10.7: `removeEnemy(j)` helper, if/else colour, `10 * hp`, `hp < 1`, 5.8.17's `frameCount % 90` beat as the wave start, named wait constant: all P. Stale-index cheat (score after the splices), forgotten enemyWorth push, forgotten third splice: all F.
- 5.11.4 / 5.11.5 / 5.11.6: 35 + 28 + 31 variants. `Math.max` floor, if/return booleans, `>= 1`, `0 < this.hp`, `forEach`, index loops, the old reverse-splice reap, a separate `clearBullets()`, `concat`/spread/`push(...)` for the wave, template literals in `text()`: all P. Filter-before-remove swap, Bullet never pushed, `Enemy.spawned = 0` missing, old `wavePause` left behind: F.
- Numbers in 5.11.1 verified against the references: 8 `splice` calls, 13 lines naming `enemyHp`/`enemyWorth`, 138 vs 177 lines of code, 2 removal copies. 5.10.4's `TypeError ... reading 'overlaps'` claim is true for a lone shot hitting the second enemy.
- Filter with an arrow is modelled before 5.8.13: 3.7.20 `curved.filter((score) => score >= 80)`. `for...of` is 3.2.3. Spread-copy iterate (5.7.19 reference) is 3.7.14. `kb.presses` is 5.2.9.
- Forward promises that land: 5.9.2 "drone you will meet in 5.9.5", 5.9.1 "5.9 / 5.10 / 5.11", 5.1.17 "next reading" (5.1.18), 5.1.6 "next reading (5.1.8)", 5.6.5 -> 5.6.6, 5.7.8 "open the next lab" (5.7.9), 5.11.3 try-this "as in 5.8.13" (the ghost really does stay: filter runs before the loop that would label it).
- Videos 5.1.2 / 5.1.12 / 5.6.2 / 5.7.2 have `videoUrl: ""` and show the fallback; nothing after them depends on what the video says (grepped 5.6.3-5.6.7, 5.7.1). Slides 5.1.1 and 5.6.1 are the "These slides aren't published yet ... mark this complete" placeholder; same story, nothing later cites them.

## Gaps (ordered by weight)

### 1. 5.1.19 Lab: Delete the else, watch drift (`5-1-18-lab-else-to-zero`): the step list contradicts the starter. MEDIUM-HIGH
`script.js` ships with both `else` lines already missing ("This lab ships with a BROKEN movement pattern"). `lesson.json` steps read as if they were present:
- s1 "Run as-is and confirm movement stops ... Confirm the else-to-zero rule is working." In the shipped starter movement does **not** stop.
- s2 "Find the two lines that say `else player.vel.x = 0;` and `else player.vel.y = 0;`. Delete both lines, then click Run." There is nothing to find or delete.
- s3 and s4 are right for the broken state; the title ("Delete the else, watch drift") describes the s2 story.
The comments in `script.js` (STEP 1: "Click Run as-is ... watch the sprite drift", STEP 2: "Add the missing else ... lines") describe the real task. A student reading the steps panel first meets two false instructions in a row. Fix: make s1/s2 say what the file does (run it, see the drift; the else lines are gone, put them back), or ship the working file and let s2 delete them.

### 2. 5.8.13 Lab: Reap the dead with filter (`5-5-13-lab-reap-the-dead`): the check count is wrong. MEDIUM
s1: "Press Space five times: the counter at the bottom should go 3 -> 2 -> 1 -> 0, and each press should hit a living enemy." The starter has `this.hp = 4` and `Player.power = 2`, so each enemy takes two presses; five presses leave **1** in the list, six are needed. Numbers elsewhere in 5.8 check out (5.8.8 hp 5 / hit 2: 3, 1, -1; 5.8.9 hp 6; 5.8.12 6, 4, 2, 0). Also the s1 hint says "The shape is in 3.7 (Reading: Array Methods)": no lesson has that title (3.7.1 is "Slides: Array Methods"). The requirement cards' Help is 3.7.19 (What Else Is Out There), which has only the one-line gloss "`.filter(callback)` ... keeps only the elements whose callback returns `true`" and no code; the worked `filter((score) => score >= 80)` is **3.7.20**. Point both at 3.7.20.

### 3. 5.6.14 Your Turn: Build a Sprite (`5-3-13-lab-build-sprite`) is taught by the lesson after it. MEDIUM
5.6.14 asks for a circle sprite ("the 3-argument constructor form `new Sprite(x, y, diameter)`") and `.stroke` AND `.strokeWeight`. Nothing in 5.1-5.6.13 states the circle form (5.1.6 has only x, y, w, h; the 3-arg form appears in Pinball/Flappy code as `new Sprite(70, 60, 24)` but is never explained) and `.stroke` / `.strokeWeight` first appear in **5.6.15** Worked Example: Sprite Showcase ("(x, y, diameter): one size argument makes a circle", "`outlined.stroke = 'deepskyblue'`"). The lab's hints send the student to "the Sprite section of the moSHion docs drawer", so it is solvable, but it is the course's own rule ("never ask for anything not taught on an earlier screen") broken by an example/lab ordering: 5.6.15 should come before 5.6.14. Also Help pointers: r2 and r3 (the 4-arg and 3-arg Sprite forms) cite `5.1.5 (Canvas: new Canvas(w, h))`; the Sprite constructor is 5.1.6. r5 (stroke) has no Help at all. Description says it "Bridges the 5.6.7 / 5.6.13 worked examples", which says nothing of 5.6.15.

### 4. 5.8.9 Lab: Give the class its own isAlive() (`5-5-9-lab-isalive`): r1 is one literal shape. MEDIUM
r1 = `isAlive\s*\(\s*\)\s*\{[\s\S]*?return\s+this\.hp\s*>\s*0`. Refused (r1 red), all with the working behaviour:
```js
isAlive() { if (this.hp > 0) { return true; } return false; }          // 5.7.5's own step: "returns true if ..., and false otherwise"
isAlive() { if (this.hp > 0) { return true; } else { return false; } }
isAlive() { if (this.hp <= 0) { return false; } return true; }
isAlive() { return this.hp >= 1; }   // also: return 0 < this.hp;  return this.hp !== 0;  return (this.hp > 0);
isAlive() { const alive = this.hp > 0; return alive; }
```
Only `return this.hp > 0` (and the ternary that contains it) passes. The same shapes are accepted by 5.7.5 r1 (if/else booleans, `10 < this.n`) and by 5.11.4 r2 (`isAlive if/return/return`, `if <= 0 return false`), so a student who learned if/else booleans in 5.7.5 is refused in 5.8.9 and accepted again in 5.11.4. 5.8.6 shows `return this.hp > 0;` and the 5.8.9 hint says "a one-line method: `return` followed by a comparison", so it is the model; but 5.7.5 modelled the other. Widen r1 to the 5.11.4 r2 family.

### 5. 5.11.5 r2 passes the 5.8.12 shape that doubles the damage. MEDIUM
5.11.5 s2 turns 5.8.12's `hit(other)` (a method that acts on the argument) into `hits(enemy)` (a question). The hint says "The method returns the answer; it does not call `takeHit` itself." The card does not check that. This passes all six cards (PPPPPP):
```js
hits(enemy) {
  if (this.isAlive() && enemy.isAlive() && this.sprite.overlaps(enemy.sprite)) {
    enemy.takeHit(1);   // copied from 5.8.12's hit(other)
    this.spend();
    return true;
  }
  return false;
}
```
and then s4's loop `if (b.hits(e)) { b.spend(); e.takeHit(1); ... }` takes **2 hp per shot**: 5.11.1's whole premise ("every lab keeps the game playing exactly as before: same waves, same speeds, same score") is broken and no card sees it. A card on "hits() does not call takeHit/spend" (or on `hits` containing no assignment/call besides `isAlive`/`overlaps`) closes it.

### 6. Stale numbering left over from the 5.3/5.4 -> 5.6/5.7 renumber (the prose citations a number-grep cannot see). MEDIUM (low each, but the student reads them)
| Lesson | Exact text | What is true now |
| --- | --- | --- |
| 5.6.6 (`5-3-35`) | "A class can also hold functions that act on its data. You will write those in 5.4." | methods are 5.7.1 on; 5.4 is Flappy |
| 5.7.21 (`5-3-33`) content.md line 3 and `lesson.json` description | "**Read at the close of Unit 5.4.**" / "Read at the close of Unit 5.4." | the close of 5.7 |
| 5.8.20 (`5-5-20`) | "Everything here comes from Unit 5's object modules, 5.3 to 5.5." | 5.6 to 5.8 |
| 5.7.11 (`5-3-24`) line 1 | "properties (5.6.8-d), `this` (5.6.12-5a), each method shape (5.7.1-e), composition (5.7.8-g)" | old lettered ids; now 5.6.8-5.6.11, 5.6.12-5.6.13, 5.7.1-5.7.7, 5.7.8-5.7.9. A student cannot follow "-d" or "-5a" |
| 5.8.17 (`5-5-17`) | "`frameCount` (5.1.14) already counts frames" | 5.1.14 is Key names; `frameCount` is 5.2.1 (Reading: Random numbers and timers) |
| 5.6.10 (`5-3-9`) r2 Help | "5.1.15 (Keyboard Movement)" for `kb.presses` | 5.1.15 only has `kb.pressing`; `kb.presses` is 5.2.9 (Ground-Gated Actions) |
The two-part and prose forms resolve by hand otherwise (5.1.17/5.1.6 "next reading", 5.9.2 "5.9.5", 5.10.2 "5.10.7 replaces this with waves", 5.9.4 "5.9.7 gives it to the R key"). The "Part A / B / C" labels in 5.10-5.11 prose are only defined by the unit names ("5.9 Project: Defender, Part A"); 5.9.1 itself says "three parts: 5.9 ... 5.10 ... 5.11" without the letters. Fine, noted.

## Low (grader vs the course's own shape, and small seams)
| # | Lesson | What | Evidence |
| --- | --- | --- | --- |
| L1 | 5.1.10 vs 5.7.9 / 5.9.4 / 5.11.5 | 5.1.10 teaches `player.pos.x` / `.pos.y` "read or overwrite"; 5.7.15's own sample draws `e.sprite.pos.x`. 5.7.9 r1 (`this.sprite.pos.x += dx`), 5.9.4 r1 (clamp written `ship.pos.x`) and 5.11.5 r1 (`this.sprite.pos.y > -20`) refuse it; 5.10.2 r3/r4, 5.9.4 r5 and 5.11.5 elsewhere accept `pos.y`. | `bpos.cjs` |
| L2 | 5.9.6 r2 | The same omission is graded two ways. Remove `bullets[i].delete();` and keep the splice: 5.9.4 r5 is red, 5.9.6 r2 is green (PPP). The shot's sprite then stays frozen on screen. 5.9.4's hint says "You need both." | `b597.cjs` |
| L3 | 5.7.13 r1 | `const e = new Enemy(...); enemies.push(e);` (and an array literal) refused; only a literal `enemies.push(new Enemy(` or a for-loop of it passes. 5.8.18 r3 accepts the named form. | `b5714.cjs` |
| L4 | 5.7.9 r1 | Does not require `dx`: `this.sprite.x += 2;` passes (cheat); `const s = this.sprite; s.x += dx;` refused. | `b57.cjs` |
| L5 | 5.7.14 r1 | `enemies.forEach((e) => e.render())` refused (`for\s*\(`); 3.7.19 calls forEach "a for loop with different punctuation". The step says `for...of`, so by design. | `b5714.cjs` |
| L6 | 5.7.4 r2 | Calling `this.tick()` n times (course-adjacent after 5.7.6) refused: r2 wants `+= n`. | `b57.cjs` |
| L7 | 5.8.12 r2 | `const dmg = this.power; other.takeHit(dmg);` refused; `this.power` must sit inside the call. Same named-local family as earlier rounds. | `b58.cjs` |
| L8 | 5.8.13 r1/r2, 5.8.3, 5.8.4 | `const alive = enemies.filter(...); enemies = alive;`, `const next = this.n + 1; this.n = next;`, `this.points -= (this.step)`: refused (named intermediate / parens). | `b58.cjs` |
| L9 | 5.6.11 r1 | Both boxes `new Box('red')` pass "two distinct calls ... each gets its own color argument". | `b57.cjs` |
| L10 | 5.7.3 r1 | `function tick() {...}` inside a class body (a syntax error) passes the regex; the sketch then fails to run, so the student sees it. | `b57.cjs` |
| L11 | 5.10.5 r5 | Card says the loops may run "either way round", but with shots as the inner loop the correct `break` is inside the kill-if and is **refused** (PPPPF); a break at the end of the overlap-if passes. Not the shape 5.10.4 shows. Also 5.10.2 passes a forward loop with no `j--` (card never checks direction; the step does say "from the end to the start"). | `b5105b.cjs`, `b510.cjs` |
| L12 | 5.11.6 (seam 5.10 -> 5.11) | `Spawner.makeWave()` builds and **returns a new list of other objects**, assigned over `enemies`. No earlier lesson models that: 5.7.5 returns booleans, 5.8.17's "spawner" is inline code that pushes into the global list, 5.10.6/5.10.7 `spawnWave()` pushes through `spawnEnemy` into the global, and 5.11.3's live example has no Spawner. The step spells the whole shape out and the hint hands the push line, so it is solvable; but this is the one place in the module where the distance travelled is a rewrite (push to global -> return an array), and a student who keeps pushing to `enemies` and returns nothing is red on r2 for a reason the card cannot explain. A two-line example of "a method that returns a list" in 5.11.3 would be the bridge. |

## Seam read: 5.9 (procedural) -> 5.10 (the mess) -> 5.11 (refactor)
- 5.9 -> 5.10: 5.10.2's starter is the 5.9.7 reference with the drone replaced by arrays; every function the student wrote in 5.9 is back unchanged (moveShip/fire/moveBullets/startRound). `spawnEnemy` copies 5.9.3's `new Sprite` + `collider = 'none'` + colour + push; hint cites 5.10.1's ternary. Carries.
- 5.10 -> 5.11: 5.11.4's starter is the 5.10.7 reference plus an `Enemy` shell; the steps point at 5.8.8 / 5.8.9 / 5.8.16 for the three methods, which really do contain them. The "finished in one place" rule (5.11.3) differs from what 5.7.10/5.7.11 modelled (an object deleting its own sprite inside a method: `pop()`, `damage()` with `this.sprite.delete()`), and 5.11.3 gives its reason ("nothing can remove the same enemy twice") without saying that it replaces the earlier habit. Both orders still pass the 5.11.4 grader (a `takeHit` that deletes its own sprite also passes), so nothing is lost; noting it for the reader. `damage(n)` (5.7.11) / `takeDamage` (5.7.7 chart) / `takeHit(n)` (5.8.x, 5.11) are three names for one idea; 5.8.6 never says "renamed".
- 5.8.12 and 5.8.18 are distance-zero labs: 5.8.12's solution is the one line printed in 5.8.11 and in its own hint; 5.8.18's is 5.8.17 step 2 verbatim; 5.8.8/5.8.9 are the two methods printed in 5.8.6. That is fine for new material, but it means the first lab in the whole of 5.6-5.8 that needs real adaptation is 5.11.5 (`hit(other)` -> `hits(enemy)`), which is also where gap 5 lives.

Harness (not in repo): `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/ch5m/` (`grader.cjs`, `lib.cjs`, `v.cjs`, `base.cjs`, batteries `b594 b597 b510 b5114 b5115 b5116 b57 b5714 b58 b589 bpos b51 b5105b .cjs`, `cites.txt`).
