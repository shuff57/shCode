# Chapter 5 beginner walk: 5.1, 5.6-5.8, 5.9-5.11

Session c5beg (UI chain) and c5beg-v / v56 / v57 / v58 (variant testers). Dev server :3002, DEV_ROLE=student, lock ON.
STATUS: IN PROGRESS. Written incrementally; the sections below are what is verified so far.
The dev server died mid-walk (connection refused) and was restarted with `DEV_ROLE=student npm run dev`; in-memory progress was lost.

Method: read every word of every lesson's content.md and every step and requirement description (the text a student sees in a moshion lab; content.md is not shown, the File tab lists only script.js). Lab graders were driven in a real browser: inject a variant into CodeMirror, Stop, Run, read the Quest cards. Citations were resolved mechanically against the actual lesson titles.

## QUIT POINT
  5.1.19  Lab: Delete the else, watch drift
          Step 1 says "Run as-is ... Hold a WASD key: the sprite moves. Release: it stops. Confirm the else-to-zero rule is working."
          Step 2 says "Find the two lines that say `else player.vel.x = 0;` and `else player.vel.y = 0;`. Delete both lines."
          The shipped starter has NO else lines (its own comment: "ships BROKEN ... both `else` lines are missing ... put them back").
          Step 1 cannot be confirmed (the sprite drifts on first Run) and step 2 asks to delete lines that do not exist.
          The editor comment and the Steps tab contradict each other. A literal student stops here.

## BLOCKING / high
- 5.1.24 s4 and 5.7.22 s4: "Pick a challenge from content.md ... content.md lists six (three) challenges with hints." content.md is not shown anywhere (File tab: script.js only). The student cannot see the challenge list. 5.1.24 is still passable with `text()` (taught 5.1.21) or sin/cos (5.1.15), but the step names kb.presses, mouse.x/y, lerp, `frameCount %`, none of which 5.1 has taught (kb.presses arrives in 5.2).
- 5.11.9 s1 also points at "content.md, in the File tab"; the File tab has no content.md. Low harm because the step re-teaches everything inline.

## ORDERING / undefined vocabulary
- 5.6.14 s4 asks for `.stroke` and `.strokeWeight`; first taught in 5.6.15 (one lesson late). Only the docs-drawer hint covers it (the drawer does contain both, lib/moshion-docs.ts line 348).
- 5.7.4 s1 and 5.7.5 s1 (and 5.7.5 r1): "The driver already calls ..." / "The driver paints the number red when it returns truthy". "driver" and "truthy" are never defined.
- 5.7.19 s1 says "Write `class Collectible { }`" while r1 says "the class shell is provided". Contradiction; check which is true in the starter.
- 5.7.19 s2 "despawns" vs 5.7.10 "delete()": the word despawn is used without being tied to delete().
- 5.1.3 / 5.1.13 / 5.6.3 use text(), fill(), textSize() in Try-it blocks before 5.1.21 teaches them (not asked of the student; low).
- 5.6.8 "Try this: add a third property `this.size = 40`": the constructor already has `this.size = 40`; the instruction cannot be done as written. Also `square()` unexplained.
- 5.1.15 Worked Example 2, step 2: "Open the in-app editor's performance tab" (no such tab seen).
- 5.1.2 video / 5.1.1 slides / 5.6.1 / 5.6.2 / 5.7.2: placeholders ("These slides aren't published yet", "No video URL set yet ... Ask your teacher"). Honest and completable via Mark complete. 5.1.2 also says "open the classroom slide deck", but that deck is also unpublished (dead advice, low).
- 5.10.3: "in the nested-loops lesson named in the questions below" but none of the four questions names a lesson (dangling reference).
- 5.11.4 s2 hint "Search the file ... (Ctrl+F)": editor search not yet verified.

## Stale or wrong cross references (all 158 parenthesised "N.N.N (Title)" resolve to real titles; these are wrong-but-plausible)
- 5.6.6 key takeaways: "You will write those in 5.4." (5.4 is Flappy; methods are 5.7).
- 5.7.11 intro: "(5.6.5), properties (5.6.8-d), this (5.6.12-5a), each method shape (5.7.1-e), composition (5.7.8-g)" garbled suffixes.
- 5.7.21: "Read at the close of Unit 5.4"; "labs 5.7.3-e".
- 5.7.16: "before your A12.2 written reflection" (it is 5.7.20). 5.7.17 figure captions say "Figure 5.3.1 / 5.3.2".
- 5.6.15 intro: "the same code you've been writing since 2.1"; 5.6.7 "since Week 10".
- 5.8.17: "`frameCount` (5.1.14)" but 5.1.14 is Key names; frameCount is in 5.1.15 (Worked Example 3) and 5.2.1.
- 5.8.20 header: "Unit 5's object modules, 5.3 to 5.5" (now 5.6-5.8).
- Requirement "Help:" links that point at a real lesson that does not teach the thing:
  - 5.1.24 r3 (background) -> 5.1.5 Canvas (should be 5.1.9)
  - 5.6.14 r2, r3 (Sprite 4-arg, 3-arg) -> 5.1.5 Canvas (r2 should be 5.1.6)
  - 5.6.10 r2 (kb.presses) -> 5.1.15 Keyboard Movement (teaches only kb.pressing)
  - 5.7.13 r1 (push), 5.7.14 r1/r2 (loop) -> 5.7.1 Methods
  - 5.7.19 r1, r3, r4 -> 5.7.18 When to reach for OOP
  - 5.7.22 r1-r3 (class, new, constructor) -> 5.7.1 Methods (should be 5.6.x)
  - 5.8.13 hint says "3.7 (Reading: Array Methods)", r1/r2 say 3.7.19 (filter is one bullet there)
- Quiz review links (5.8.7, 5.8.20, 5.9.8, 5.10.9, 5.11.8): every question's source/sourceIds resolved; all land on the right lesson. CLEAN.

## GRADER (taught-but-differently-shaped answers)
Accepted (all full marks): 5.1.11 chained sprite, const local, background("black"), background(0); 5.1.19 braces/no semicolon/arrows; 5.1.20 arrows, braces, mixed keys; 5.1.22 pos.x, rotation, orbit, `frameCount %`, no fill/textSize; 5.6.9 labels, one log with two args, template literal; 5.6.10 constant colour, `' '`, random(); 5.6.11 other colours, double quotes; 5.6.14 const locals, stroke-only; 5.6.16 reordered, no spaces, double quotes.
Refused as intended (starter and wrong answers red): all starters not full; missing background, colour, circle, stroke, second instance, wrong variable.
Refused but arguably taught: none found yet in 5.1 and 5.6.
Noted loose (advanced lens): 5.1.20 passes with no else-to-zero (drift) and the whole 5.1.20 text asks for it.
5.1.22 `mover.vel.x = 2` in setup is refused; the step says "Drive with frameCount", so fair.
5.7 and 5.8 raw runs were in progress (v57.out / v58.out in the scratchpad) when interrupted: see UPDATE below.

## WORKED CLEANLY
5.1.3-5.1.18 readings, 5.1.7, 5.1.11, 5.1.20, 5.1.22 flows; 5.6.3-5.6.8, 5.6.12-5.6.13 readings; 5.8.1-5.8.6, 5.8.10-5.8.11, 5.8.14-5.8.15, 5.8.17 text; quiz citations; 5.1.23 (grader absent: "saved and sent to your teacher", unlocks); Submit + Confirm unlocks the next lesson; lock holds.

## UPDATE LOG
(see below; appended as runs finish)

### UPDATE (end of this session)
The scratchpad with my driver scripts was wiped on interruption, so the walk stops here. NOT DONE:
- Grader-variant runs for 5.7.x, 5.8.x, 5.9.4/6/7, 5.10.2/5/7/8, 5.11.4/5/6/9/10. Partial 5.7 output showed tick()/addBy() variants accepted except `++this.n` (0/1, "tick() method increments this.n": a prefix increment is refused) and a `let n = this.n; n += 1; this.n = n` shape (refused). Only the `++this.n` refusal was clearly a real result; treat as UNVERIFIED, re-run.
- Browser checks still open: Ctrl+F in the editor (5.11.4), 5.10.3 "questions below", 5.7.7 and 5.8.19 Grade button flow, 5.7.19 starter shell.
- Text of all of 5.9-5.11 was read in full; ordering there looks sound (drawTop taught in 5.4.5, filter in 3.7.19, arrow functions 3.4.6, static inline in 5.8.14, sound API taught inline in 5.11.9).
VERDICT: GAP LIST (not CLEAN). Worst: 5.1.19 contradiction; content.md pointers in 5.1.24/5.7.22; undefined "driver"/"truthy" in 5.7.4-5.7.5; stale or wrong cross-references listed above.
