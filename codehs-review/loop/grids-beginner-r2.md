# Beginner lens round 2: module 6.9 Grids and Tile Maps (14 lessons)

Date 2026-10-31. Session `g-beginner2` (closed), cookie dev_student=gbeginner2, dev server :3002, DEV_ROLE=student, lock ON. Readings: Mark as complete. Labs: code injected into CodeMirror, Stop then Run, cards read from the Quest drawer, Submit then Confirm. Every lesson 1-14 ends "completed" in /api/lesson-state. No repo files edited.

## QUIT POINT
None this round. 6.9.6 step 1 (the scan plus the object return) was the heavy spot in round 1; its step text now spells out the join of the two 6.9.5 pieces (coin counter + `return { x: 60, y: 60 }`) and I wrote it first time from the text. The module is startable end to end.

## Round 1 fixes: verified held
- 6.9.11 r2 (take TOP off over two lines), 6.9.6 r3 (extra parens `(TILE * c) + (TILE / 2)`), 6.9.4 r5 (`(TILE / 2), (TILE / 2)` + a legend const named `key`), 6.9.14 challenge 1 `score = score + ...` and a `points` helper: all accepted.
- 6.9.14 challenge 3 now warns that the '2' bricks stay invisible until challenge 2's `> 0` changes. 6.9.4 starter comment now says 'dimgray'. 6.9.5 live block now draws the coin it names. 6.9.6 "standing on" line moved to y=48, visible without scrolling.
- Maze played with REAL held arrow keys (page.keyboard.down/up, polling position only to know when to release): all three levels, score 13 = 5+4+4, "You escaped!" and "Press R to play again" on the win screen. Holding the key through a level change carries the player on into the new level (it keeps walking from the P); harmless, but a first-time player will notice it.

## GRADER (taught-but-differently-shaped answers refused)
1. **6.9.14 r2 "You wrote your sentence" is case-sensitive.** `// Without it every brick is worth 10 again.` is refused; `// ... without it ...` passes. Pattern is `//[^\n]*\b(?:would|without|otherwise|instead|if)\b` with flags "". A beginner starts a sentence with "Without" or "If" (the step's own phrase is "what would happen if you removed it"). Also refused: `// Removing it makes every brick worth 10 again.` and `// Remove it and every brick is worth 10 again.` (no keyword). The card says "any wording that says what would happen if, or without, works", which is not true. Biggest gap. Fix: flags "i" and add remov|removed|took|take|delete|gone|back to.
2. **6.9.10 r1 "built with two loops" needs `for`.** Two `while` loops (2.4 teaches while) with `row.push(false)` and `g.push(row)` are refused (5/6). Card title and 6.9.9 text say "two loops".
3. **6.9.11 r1 needs `.push(row)` of a named row.** `b[r] = []; b[r].push(1);` (no push of the row onto b) refused. Pushing a named `strip` array passes. Low: the step says push the row onto b.
4. **6.9.8 r5 "last level ends the game" needs `levels.length` or a number in the same statement.** `const lastLevel = levels.length - 1; if (levelNum === lastLevel) { won = true; } else { levelNum += 1; loadLevel(levelNum); }` works in the sketch (won screen shows) and is refused; inlining `levels.length - 1` passes. A helper variable is a natural beginner move. Low-medium.
5. **6.9.7: named callback** `player.overlaps(coins, pickUp)` with `function pickUp(p, coin) {...}` refused (r1, r2 are scoped to collect()). Not taught (6.1.x/6.2 only show the inline `(a, b) => {}` form), so declined is fair; noted only.

Accepted cleanly, differently shaped: 6.9.4 double quotes + `key` const legend + parens; 6.9.6 `charAt(c) === 'P'`, `let x/y` then `{ x: x, y: y }`, `Math.floor((x) / TILE)`; 6.9.7 `(p, c) =>` + `score = score + 1`, nested `if (coins.length < 1) { if (player.overlaps(goals)) ... }`, `const empty = coins.length === 0`; 6.9.8 `level !== undefined`, legend const, `(TILE / 2)`, `levelNum === levels.length - 1`; 6.9.10 i/j names, `== true`, if/else fill, nested ifs for bounds, `const on = grid[i][j]; if (on === true) n += 1`; 6.9.11 `const inside = ...; if (inside && bricks[r][c] === 1)`, nested `for...of` count with `n++`; 6.9.14 helper `points`.

## ORDERING / UNTAUGHT
Nothing blocking. Small: 6.9.5 live block comment reads "// Forward: look at every letter." (stray word). 6.9.9 "A grid of 1s and 0s can do the same by drawing only where the cell is 1, and a gap draws nothing" reads as a puzzle on first pass; the next sentence explains it.
All cross-references I read resolved to the lesson they name (2.2.19, 2.4.24, 3.3.21, 3.5.3/3.2.11, 5.5.2, 6.2.3-equivalents).

## FUNCTIONAL
- A hidden `Confirm Submission` button sits in the DOM (offsetParent null, 0x0) while Submit is disabled. A JS click on it completed 6.9.14 at 1/2 cards (my test script did that by accident). Not reachable by a real student; noted only because the only guard is the disabled Submit button.
- AI-graded 6.9.1 and 6.9.12 again show "The grader isn't responding right now ... sent to your teacher" and advance (dev fallback, as round 1).
- 6.9.13 quiz: 7/7 answered, page goes straight to 6.9.14 with no score shown (unchanged from round 1).
- Grid clicks need a real down/up gap (tool artifact), then 6.9.10 lights, unlights, ignores the strip; 6.9.11 removes a brick, ignores a repeat click and the strip above.

## Single biggest gap
6.9.14 card r2 is case-sensitive and keyword-only: "Without it ..." or "Removing it ..." is refused although the card promises "any wording".
