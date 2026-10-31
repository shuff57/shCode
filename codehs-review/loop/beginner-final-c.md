# Beginner lens, FINAL pass C (re-check at 6c22390e)
Session g-beginner2, cookie dev_student=gbeginner2, lock ON.
STATUS: IN PROGRESS

Method: lock ON, dev_student=gbeginner2. 5.3.1 typed plan (grader-down fallback counted), 5.3.2/.3/.5/.6 Mark as complete, 5.3.4 reference injected + Submit + Confirm. Variants injected into CodeMirror, Stop then Run, cards read from the Quest panel.

## Item 1a/1b: 5.3.7
- `touching && wasTouching === false`: card 2 "A point is added only when contact starts" RED (2/3). PASS.
- `touching === true && wasTouching === false`: card 2 red. PASS.
- `(touching) && (wasTouching === false)`: card 2 red. PASS.
- `touching && wasTouching == false` and `=== 0`: green (these do work at run time, loose == false is 0 == false true). Fine.
- Taught `touching && !wasTouching` reference: 3/3 green; Run, then R x3 (7 s each): canvas reads score: 4. PASS.
- 5.3.5 text: defines level/edge-triggered at first use (inline, with a table), and has a bold "One catch" paragraph: colliding() gives a number, 0 when apart; after the first frame the memory holds 0 not false, so `=== false` is never true; "Test the memory with `!wasTouching`." Plain words, follows for a beginner. The red card's description repeats it.

## Item 1c: 5.3.8
- Reference 3/3.
- `if (touching && b.wasTouching === false)`: card 3 "The bumper's own worth is added only when contact starts" RED (2/3). PASS.
- `score = score + (b.worth);` (for...of): 3/3 green. `score = score + (bumpers[i].worth);` in a counting loop: 3/3 green; canvas after drop plus one R reads 32 (16+16), as the step says. PASS.
- Step 2 text now says in words: "colliding() gives a number, not true or false ... memory holds 0: test it with !b.wasTouching, because b.wasTouching === false is never true." Card description repeats it. A beginner can follow. Note: step 1 says to give each bumper `wasTouching` of `false` and step 2 then says never compare to false; it is explained, not contradictory.

## Item 2: 5.3.4
- `world.gravity.y = (10);`, `bounciness = (0.75)`, and both together: 4/4 green. PASS.

## Item 3: 5.4.4
- Reference 3/3. `const tapped = kb.presses(' '); if (tapped) {...}`: 3/3. `bird.vel.y = (-4); bird.y = (200);` (on reference and on the named-test shape): 3/3. Named test plus `bird.y > height`: 3/3. PASS.

## Item 4: 5.4.6 and 5.4.9
Reached via 5.4.1 plan (fallback counted), 5.4.2/.3/.5 marked, 5.4.4 reference submitted.
- Reference 3/3. Honest variants, all 3/3 green: `const p = pipes[i]; if (p.x < -30) { p.mate.delete(); p.delete(); pipes.splice(i,1); }`; delete-then-mate order; `let gone = pipes.splice(i,1)[0]; gone.mate.delete(); gone.delete();` (splice first); an extra loop after. PASS.
- `pipes[i].mate.remove(); pipes[i].remove(); pipes.splice(i,1);` card 3 "Pipes that have left are deleted and spliced out" RED (2/3). 5.4.5 and the step say `delete()` and never mention `remove()`, so a fair refusal in this lesson. BUT 5.3.20a uses `this.sprite.remove()` and 5.3.31's card explicitly accepts `sprite.remove()`, so a student carrying that forward from 5.3 loses the mark with no hint (the card says "deleted"). Low/medium, new-shaped, not a regression.
- 5.4.9 text: "Try flying off the top or the bottom too: in your game that does not lose, it puts the bird back in the middle." Matches 5.4.4's reset-to-200 behaviour and the 5.4.8 crash (pipes only). Clear, consistent, plain words. PASS.

## Item 5: 5.5.9, 5.5.11
Reached via 5.5.1 plan, 5.5.2/.3/.5/.7 marked, 5.5.4/.6/.8 reference solutions submitted, 5.5.9 typed answer (fallback counted), 5.5.10 quiz answered from lesson.json (passed, auto-advanced to 5.5.11).
- 5.5.9 wording: "lose in a different way each time: off a wall, into your own body, and by running around until you are very long"; "the beat" is defined in 5.5.2's glossary and used in 5.5.3. Clear. PASS.
- 5.5.11 starter 0/1 red. Single-challenge edits of the starter (it has `const BEAT = 8;`, changed to `let beat = 8;`): `beat = (beat - 1);` green; `beat = beat - 1;` green; `beat = (max(3, beat - 1));` green; `if ((score) > (best)) { best = score; }` green; `if (score > best) best = score;` green; `if ((score) > best)` green; `if (best < (score))` green. PASS.
- Not run-checked by play: only the cards.

## Summary
1 (5.3.7, 5.3.8): PASS on all three. `=== false` red on the relevant card (incl. parenthesised and `=== true &&` forms); taught shape green and the game reads 4 after R x3 (5.3.7) and 32 (5.3.8); `score = score + (worth)` green in both loop shapes. 5.3.5 explains it in a bold "One catch" paragraph, in words; level/edge defined inline at first use.
2 PASS. 3 PASS. 4 PASS (one low note: `.remove()` red in 5.4.6). 5 PASS.
New refusals/confusing text: only `.remove()` in 5.4.6 (the course itself uses remove() in 5.3.20a and accepts it in 5.3.31).
VERDICT: clean; biggest gap is the low `.remove()` vs `.delete()` mismatch in 5.4.6.
Session g-beginner2 closed. No repo edits except this file.
